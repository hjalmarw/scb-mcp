import fetch from 'node-fetch';
import { 
  ConfigResponse, 
  ConfigResponseSchema,
  FolderResponse, 
  FolderResponseSchema,
  TablesResponse, 
  TablesResponseSchema,
  Dataset, 
  DatasetSchema,
  RateLimitInfo 
} from './types.js';

export class SCBApiClient {
  private baseUrl: string;
  private rateLimitInfo: RateLimitInfo | null = null;
  private requestCount = 0;
  private windowStartTime = new Date();

  constructor(baseUrl = 'https://api.scb.se/OV0104/v2beta/api/v2') {
    this.baseUrl = baseUrl;
  }

  private async initializeRateLimit(): Promise<void> {
    if (this.rateLimitInfo) return;

    try {
      // Make direct config request without rate limiting to avoid circular dependency
      const url = `${this.baseUrl}/config`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SCB-MCP-Client/1.0'
        }
      });

      if (!response.ok) {
        // Fallback to default values if config fails
        console.warn('Failed to fetch config, using default rate limits');
        this.rateLimitInfo = {
          remaining: 30,
          resetTime: new Date(Date.now() + 10000),
          maxCalls: 30,
          timeWindow: 10
        };
        return;
      }

      const data = await response.json();
      const config = ConfigResponseSchema.parse(data);
      
      this.rateLimitInfo = {
        remaining: config.maxCallsPerTimeWindow,
        resetTime: new Date(Date.now() + config.timeWindow * 1000),
        maxCalls: config.maxCallsPerTimeWindow,
        timeWindow: config.timeWindow
      };
    } catch (error) {
      // Fallback to reasonable defaults if anything fails
      console.warn('Failed to initialize rate limits, using defaults:', error);
      this.rateLimitInfo = {
        remaining: 30,
        resetTime: new Date(Date.now() + 10000),
        maxCalls: 30,
        timeWindow: 10
      };
    }
  }

  private async checkRateLimit(): Promise<void> {
    if (!this.rateLimitInfo) {
      await this.initializeRateLimit();
    }

    const now = new Date();
    
    // Reset window if time has passed
    if (now >= this.rateLimitInfo!.resetTime) {
      this.requestCount = 0;
      this.windowStartTime = now;
      this.rateLimitInfo!.resetTime = new Date(now.getTime() + this.rateLimitInfo!.timeWindow * 1000);
      this.rateLimitInfo!.remaining = this.rateLimitInfo!.maxCalls;
    }

    if (this.requestCount >= this.rateLimitInfo!.maxCalls) {
      const waitTime = this.rateLimitInfo!.resetTime.getTime() - now.getTime();
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds. Current usage: ${this.requestCount}/${this.rateLimitInfo!.maxCalls}`);
    }
  }

  private async makeRequest<T>(endpoint: string, schema: any): Promise<T> {
    await this.checkRateLimit();
    
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SCB-MCP-Client/1.0'
      }
    });

    this.requestCount++;
    if (this.rateLimitInfo) {
      this.rateLimitInfo.remaining = Math.max(0, this.rateLimitInfo.maxCalls - this.requestCount);
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded (429). Wait and try again.`);
      }
      
      // Try to get error details from response body
      let errorDetails = '';
      try {
        const errorText = await response.text();
        if (errorText.includes('<!DOCTYPE html') || errorText.includes('<html')) {
          errorDetails = ' (Server returned HTML error page)';
        } else {
          errorDetails = `: ${errorText.substring(0, 100)}`;
        }
      } catch (e) {
        // Ignore error reading response body
      }
      
      throw new Error(`API request failed: ${response.status} ${response.statusText}${errorDetails}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      throw new Error(`Expected JSON response but got ${contentType}. Response: ${responseText.substring(0, 100)}...`);
    }

    const data = await response.json();
    return schema.parse(data);
  }

  async getConfig(): Promise<ConfigResponse> {
    return this.makeRequest('/config', ConfigResponseSchema);
  }

  async getNavigation(folderId?: string, lang = 'en'): Promise<FolderResponse> {
    const endpoint = folderId 
      ? `/navigation/${folderId}?lang=${lang}`
      : `/navigation?lang=${lang}`;
    return this.makeRequest(endpoint, FolderResponseSchema);
  }

  async searchTables(params: {
    query?: string;
    pastDays?: number;
    includeDiscontinued?: boolean;
    pageNumber?: number;
    pageSize?: number;
    lang?: string;
  } = {}): Promise<TablesResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.query) searchParams.set('query', params.query);
    if (params.pastDays) searchParams.set('pastDays', params.pastDays.toString());
    if (params.includeDiscontinued !== undefined) searchParams.set('includeDiscontinued', params.includeDiscontinued.toString());
    if (params.pageNumber) searchParams.set('pageNumber', params.pageNumber.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.lang) searchParams.set('lang', params.lang);

    const endpoint = `/tables?${searchParams.toString()}`;
    return this.makeRequest(endpoint, TablesResponseSchema);
  }

  async getTableMetadata(tableId: string, lang = 'en'): Promise<Dataset> {
    const endpoint = `/tables/${tableId}/metadata?lang=${lang}`;
    return this.makeRequest(endpoint, DatasetSchema);
  }

  private translateCommonVariables(selection: Record<string, string[]>, lang: string): Record<string, string[]> {
    // Common Swedish -> English variable translations
    const translations: Record<string, string> = {
      'år': 'year',
      'månad': 'month', 
      'kön': 'sex',
      'ålder': 'age',
      'län': 'county',
      'kommun': 'municipality',
      'utbildning': 'education',
      'sysselsättning': 'employment',
      'inkomst': 'income',
      'familjetyp': 'family_type',
      'civilstånd': 'marital_status'
    };

    // If using English language, try to translate Swedish terms
    if (lang === 'en') {
      const translatedSelection: Record<string, string[]> = {};
      
      for (const [key, values] of Object.entries(selection)) {
        const translatedKey = translations[key.toLowerCase()] || key;
        translatedSelection[translatedKey] = values;
      }
      
      return translatedSelection;
    }
    
    return selection;
  }

  async validateSelection(
    tableId: string,
    selection: Record<string, string[]>,
    lang = 'en'
  ): Promise<{ isValid: boolean; errors: string[]; suggestions: string[]; translatedSelection?: Record<string, string[]> }> {
    try {
      // Try to translate common Swedish terms first
      const originalSelection = { ...selection };
      const translatedSelection = this.translateCommonVariables(selection, lang);
      
      // Get table metadata to validate against
      const metadata = await this.getTableMetadata(tableId, lang);
      
      const errors: string[] = [];
      const suggestions: string[] = [];
      
      if (!metadata.dimension) {
        return {
          isValid: false,
          errors: ['Table metadata not available for validation'],
          suggestions: ['Try using scb_get_table_info first']
        };
      }
      
      const availableVariables = Object.keys(metadata.dimension);
      
      // Check each variable in translated selection
      for (const [varCode, values] of Object.entries(translatedSelection)) {
        // Check if variable exists
        if (!availableVariables.includes(varCode)) {
          errors.push(`Variable "${varCode}" not found in table`);
          
          // Find similar variable names
          const similar = availableVariables.filter(v => 
            v.toLowerCase().includes(varCode.toLowerCase()) ||
            metadata.dimension![v].label.toLowerCase().includes(varCode.toLowerCase())
          );
          
          if (similar.length > 0) {
            suggestions.push(`Did you mean: ${similar.map(v => `"${v}"`).join(', ')}?`);
          } else {
            suggestions.push(`Available variables: ${availableVariables.join(', ')}`);
          }
          continue;
        }
        
        const varDef = metadata.dimension[varCode];
        const availableValues = Object.keys(varDef.category.index);
        
        // Check each value (skip special expressions like TOP(5), *, etc.)
        for (const value of values) {
          if (value === '*' || 
              value.startsWith('TOP(') || 
              value.startsWith('BOTTOM(') ||
              value.startsWith('RANGE(')) {
            continue; // These are valid expressions
          }
          
          if (!availableValues.includes(value)) {
            errors.push(`Value "${value}" not found for variable "${varCode}"`);
            
            // Find similar values
            const similarValues = availableValues.filter(v => 
              v.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 3);
            
            if (similarValues.length > 0) {
              suggestions.push(`For "${varCode}", did you mean: ${similarValues.join(', ')}?`);
            } else {
              suggestions.push(`Use scb_get_table_variables with tableId="${tableId}" and variableName="${varCode}" to see all values`);
            }
          }
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        suggestions,
        translatedSelection
      };
      
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
        suggestions: ['Try checking if the table ID is correct with scb_get_table_info']
      };
    }
  }

  async getTableData(
    tableId: string, 
    selection?: Record<string, string[]>,
    lang = 'en'
  ): Promise<Dataset> {
    if (!selection) {
      // Get default selection - request JSON-stat2 format
      const endpoint = `/tables/${tableId}/data?lang=${lang}&outputFormat=json-stat2`;
      return this.makeRequest(endpoint, DatasetSchema);
    }

    // Validate selection before making API call
    const validation = await this.validateSelection(tableId, selection, lang);
    if (!validation.isValid) {
      const errorMessage = `Selection validation failed:\n${validation.errors.join('\n')}` +
        (validation.suggestions.length > 0 ? `\n\nSuggestions:\n${validation.suggestions.join('\n')}` : '');
      throw new Error(errorMessage);
    }

    // Use the translated selection for the API call
    const finalSelection = validation.translatedSelection || selection;

    // Use POST for complex selections - request JSON-stat2 format  
    const url = `${this.baseUrl}/tables/${tableId}/data?lang=${lang}&outputFormat=json-stat2`;
    
    await this.checkRateLimit();
    
    const selectionArray = Object.entries(finalSelection).map(([variableCode, valueCodes]) => ({
      variableCode: variableCode,
      valueCodes: Array.isArray(valueCodes) ? valueCodes : [valueCodes]
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SCB-MCP-Client/1.0'
      },
      body: JSON.stringify({
        selection: selectionArray
      })
    });

    this.requestCount++;
    if (this.rateLimitInfo) {
      this.rateLimitInfo.remaining = Math.max(0, this.rateLimitInfo.maxCalls - this.requestCount);
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded (429). Wait and try again.`);
      }
      if (response.status === 403) {
        throw new Error(`Request forbidden (403). The query may result in too many data cells (limit: ${this.rateLimitInfo?.maxCalls || 'unknown'}). Try using more specific selections.`);
      }
      if (response.status === 400) {
        // Parse 400 errors more specifically
        let errorDetails = '';
        try {
          const errorText = await response.text();
          if (errorText.includes('variable') || errorText.includes('Variable')) {
            errorDetails = ' - This usually means variable names or values in your selection are incorrect. Use scb_get_table_variables to check valid options.';
          } else if (errorText.includes('selection') || errorText.includes('Selection')) {
            errorDetails = ' - Your data selection format may be incorrect. Check the selection syntax.';
          } else {
            errorDetails = ` - Server response: ${errorText.substring(0, 200)}`;
          }
        } catch (e) {
          errorDetails = ' - Could not parse error details.';
        }
        throw new Error(`Bad request (400)${errorDetails}`);
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return DatasetSchema.parse(data);
  }

  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  getUsageInfo(): { requestCount: number; windowStart: Date; rateLimitInfo: RateLimitInfo | null } {
    return {
      requestCount: this.requestCount,
      windowStart: this.windowStartTime,
      rateLimitInfo: this.rateLimitInfo
    };
  }
}
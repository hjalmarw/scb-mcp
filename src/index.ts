#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SCBApiClient } from './api-client.js';

class SCBMCPServer {
  private server: Server;
  private apiClient: SCBApiClient;

  constructor() {
    this.server = new Server(
      {
        name: 'scb-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.apiClient = new SCBApiClient();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });

    // List available resources (none for now)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [],
      };
    });

    // List available prompts (none for now)  
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'scb_get_api_status':
            return await this.handleGetApiStatus();

          case 'scb_browse_folders':
            return await this.handleBrowseFolders(args as any);

          case 'scb_search_tables':
            return await this.handleSearchTables(args as any);

          case 'scb_get_table_info':
            return await this.handleGetTableInfo(args as any);

          case 'scb_get_table_data':
            return await this.handleGetTableData(args as any);

          case 'scb_check_usage':
            return await this.handleCheckUsage();

          case 'scb_search_regions':
            return await this.handleSearchRegions(args as any);

          case 'scb_get_table_variables':
            return await this.handleGetTableVariables(args as any);

          case 'scb_find_region_code':
            return await this.handleFindRegionCode(args as any);

          case 'scb_test_selection':
            return await this.handleTestSelection(args as any);

          case 'scb_preview_data':
            return await this.handlePreviewData(args as any);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'scb_get_api_status',
        description: 'Get API configuration and rate limit information from Statistics Sweden',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'scb_browse_folders',
        description: 'Browse the Statistics Sweden database structure by folders',
        inputSchema: {
          type: 'object',
          properties: {
            folderId: {
              type: 'string',
              description: 'Folder ID to browse (empty for root)',
            },
            language: {
              type: 'string',
              description: 'Language code (en, sv)',
              default: 'en',
            },
          },
        },
      },
      {
        name: 'scb_search_tables',
        description: 'Search for statistical tables in the SCB database',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term (e.g., "population", "GDP", "Lerum"). Tip: Use specific terms like "population municipality" for demographics',
            },
            pastDays: {
              type: 'number',
              description: 'Only show tables updated in the last N days',
            },
            includeDiscontinued: {
              type: 'boolean',
              description: 'Include discontinued tables',
              default: false,
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (max 100)',
              default: 20,
            },
            pageNumber: {
              type: 'number',
              description: 'Page number',
              default: 1,
            },
            language: {
              type: 'string',
              description: 'Language code (en, sv)',
              default: 'en',
            },
            category: {
              type: 'string',
              description: 'Filter by category: "population", "labour", "economy", "housing", etc.',
            },
          },
        },
      },
      {
        name: 'scb_get_table_info',
        description: 'Get detailed metadata about a specific statistical table',
        inputSchema: {
          type: 'object',
          properties: {
            tableId: {
              type: 'string',
              description: 'Table ID (e.g., "BE0101N1")',
            },
            language: {
              type: 'string',
              description: 'Language code (en, sv)',
              default: 'en',
            },
          },
          required: ['tableId'],
        },
      },
      {
        name: 'scb_get_table_data',
        description: 'Get statistical data from a table with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            tableId: {
              type: 'string',
              description: 'Table ID (e.g., "BE0101N1")',
            },
            selection: {
              type: 'object',
              description: 'Variable selection (variable_name: [value1, value2]). Use * for all values, or expressions like "TOP(5)"',
              additionalProperties: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            language: {
              type: 'string',
              description: 'Language code (en, sv)',
              default: 'en',
            },
          },
          required: ['tableId'],
        },
      },
      {
        name: 'scb_check_usage',
        description: 'Check current API usage and rate limit status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'scb_search_regions',
        description: 'Search for region codes by name (e.g., find code for "Lerum", "Stockholm")',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Region name to search for (e.g., "Lerum", "Stockholm")',
            },
            language: {
              type: 'string',
              description: 'Language code (en, sv)',
              default: 'en',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'scb_get_table_variables',
        description: 'Get available variables and their possible values for a table (essential before fetching data)',
        inputSchema: {
          type: 'object',
          properties: {
            tableId: {
              type: 'string',
              description: 'Table ID (e.g., "TAB6534")',
            },
            language: {
              type: 'string',
              description: 'Language code (en, sv)',
              default: 'en',
            },
            variableName: {
              type: 'string',
              description: 'Optional: Show values for specific variable only (e.g., "region")',
            },
          },
          required: ['tableId'],
        },
      },
      {
        name: 'scb_find_region_code',
        description: 'Find the exact region code for a specific municipality or area (improved region lookup)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Municipality or region name (e.g., "Lerum", "Stockholm", "Gothenburg")',
            },
            language: {
              type: 'string',
              description: 'Language code (en, sv)',
              default: 'en',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'scb_test_selection',
        description: 'Test if a data selection is valid without retrieving data (prevents API errors)',
        inputSchema: {
          type: 'object',
          properties: {
            tableId: {
              type: 'string',
              description: 'Table ID (e.g., "TAB1267")',
            },
            selection: {
              type: 'object',
              description: 'Variable selection to test',
              additionalProperties: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            language: {
              type: 'string',
              description: 'Language code (en, sv)',
              default: 'en',
            },
          },
          required: ['tableId', 'selection'],
        },
      },
      {
        name: 'scb_preview_data',
        description: 'Get a small preview of data to verify selection works (safer than full data request)',
        inputSchema: {
          type: 'object',
          properties: {
            tableId: {
              type: 'string',
              description: 'Table ID (e.g., "TAB1267")',
            },
            selection: {
              type: 'object',
              description: 'Variable selection (automatically limited to small sample)',
              additionalProperties: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            language: {
              type: 'string',
              description: 'Language code (en, sv)',
              default: 'en',
            },
          },
          required: ['tableId'],
        },
      },
    ];
  }

  private async handleGetApiStatus() {
    const config = await this.apiClient.getConfig();
    const usage = this.apiClient.getUsageInfo();
    
    return {
      content: [
        {
          type: 'text',
          text: `**SCB API Status**

**Configuration:**
- API Version: ${config.apiVersion}
- Default Language: ${config.defaultLanguage}
- Available Languages: ${config.languages.map(l => `${l.id} (${l.label})`).join(', ')}
- Max Data Cells per Request: ${config.maxDataCells.toLocaleString()}
- Rate Limit: ${config.maxCallsPerTimeWindow} calls per ${config.timeWindow} seconds
- License: ${config.license}

**Current Usage:**
- Requests Made: ${usage.requestCount}/${usage.rateLimitInfo?.maxCalls || config.maxCallsPerTimeWindow}
- Remaining Requests: ${usage.rateLimitInfo?.remaining || 'Unknown'}
- Window Started: ${usage.windowStart.toISOString()}

${config.sourceReferences?.length ? `**Citation:**\n${config.sourceReferences.map(ref => `- ${ref.language}: ${ref.text}`).join('\n')}` : ''}`,
        },
      ],
    };
  }

  private async handleBrowseFolders(args: { folderId?: string; language?: string }) {
    const { folderId, language = 'en' } = args;
    const folder = await this.apiClient.getNavigation(folderId, language);
    
    const contents = folder.folderContents.map(item => {
      switch (item.type) {
        case 'FolderInformation':
          return `📁 **${item.label}** (${item.id})${item.description ? `\n   ${item.description}` : ''}`;
        case 'Table':
          return `📊 **${item.label}** (${item.id})${item.description ? `\n   ${item.description}` : ''}
   📅 Period: ${item.firstPeriod} - ${item.lastPeriod}
   📝 Variables: ${item.variableNames?.join(', ') || 'N/A'}
   📈 Updated: ${item.updated ? new Date(item.updated).toLocaleDateString() : 'N/A'}`;
        case 'Heading':
          return `## ${item.label}`;
        default:
          return `❓ ${item.label} (${item.id})`;
      }
    }).join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `**${folder.label || 'Root'}** ${folder.id ? `(${folder.id})` : ''}${folder.description ? `\n${folder.description}` : ''}

${contents}

📍 *Total items: ${folder.folderContents.length}*`,
        },
      ],
    };
  }

  private async handleSearchTables(args: any) {
    const result = await this.apiClient.searchTables(args);
    
    // Filter by category if specified
    let filteredTables = result.tables;
    if (args.category) {
      const categoryLower = args.category.toLowerCase();
      filteredTables = result.tables.filter(table => {
        const labelLower = table.label.toLowerCase();
        const variablesLower = table.variableNames?.join(' ').toLowerCase() || '';
        
        switch (categoryLower) {
          case 'population':
            return labelLower.includes('population') || labelLower.includes('befolkning') || 
                   variablesLower.includes('region') || labelLower.includes('demographic');
          case 'labour':
            return labelLower.includes('labour') || labelLower.includes('employment') || 
                   labelLower.includes('arbete') || labelLower.includes('sysselsättning');
          case 'economy':
            return labelLower.includes('gdp') || labelLower.includes('income') || 
                   labelLower.includes('ekonomi') || labelLower.includes('bnp');
          case 'housing':
            return labelLower.includes('housing') || labelLower.includes('dwelling') || 
                   labelLower.includes('boende') || labelLower.includes('lägenhet');
          default:
            return true;
        }
      });
    }
    
    const tables = filteredTables.slice(0, args.pageSize || 20).map(table => 
      `📊 **${table.label}** (${table.id})
   📅 Period: ${table.firstPeriod} - ${table.lastPeriod}
   📝 Variables: ${table.variableNames?.join(', ') || 'N/A'}
   📈 Updated: ${table.updated ? new Date(table.updated).toLocaleDateString() : 'N/A'}
   🏢 Source: ${table.source || 'N/A'}${table.discontinued ? '\n   ⚠️ DISCONTINUED' : ''}`
    ).join('\n\n');

    let searchTips = '';
    if (args.query && result.page.totalElements > 50) {
      searchTips = `\n\n💡 **Search Tips:**
- Try more specific terms: "${args.query} municipality" or "${args.query} region"
- Use category filter: try adding \`category: "population"\` for demographic data
- Browse folders with \`scb_browse_folders\` for better organization`;
    }

    return {
      content: [
        {
          type: 'text',
          text: `**Search Results** ${args.query ? `for "${args.query}"` : ''}${args.category ? ` (${args.category} category)` : ''}

${tables}

📍 *Page ${result.page.pageNumber} of ${result.page.totalPages} (${result.page.totalElements} total results)*${searchTips}`,
        },
      ],
    };
  }

  private async handleGetTableInfo(args: { tableId: string; language?: string }) {
    const { tableId, language = 'en' } = args;
    const metadata = await this.apiClient.getTableMetadata(tableId, language);
    
    const variables = Object.entries(metadata.dimension).map(([varCode, varDef]) => {
      const valueCount = Object.keys(varDef.category.index).length;
      return `  **${varDef.label}** (${varCode}): ${valueCount} values`;
    }).join('\n');

    const totalCells = metadata.size.reduce((a, b) => a * b, 1);

    return {
      content: [
        {
          type: 'text',
          text: `**${metadata.label}** (${tableId})

**Dataset Information:**
- Source: ${metadata.source || 'Statistics Sweden'}
- Updated: ${metadata.updated ? new Date(metadata.updated).toLocaleDateString() : 'N/A'}
- Total Data Cells: ${totalCells.toLocaleString()}

**Variables:**
${variables}

**Contacts:**
${metadata.extension?.contact?.map(c => 
  `- ${c.name || 'N/A'}${c.mail ? ` (${c.mail})` : ''}${c.phone ? ` - ${c.phone}` : ''}`
).join('\n') || 'No contact information available'}

**Notes:**
${metadata.extension?.notes?.map(note => 
  `${note.mandatory ? '⚠️ ' : ''}${note.text}`
).join('\n') || 'No notes available'}`,
        },
      ],
    };
  }

  private async handleGetTableData(args: { tableId: string; selection?: Record<string, string[]>; language?: string }) {
    const { tableId, selection, language = 'en' } = args;
    const data = await this.apiClient.getTableData(tableId, selection, language);
    
    const totalValues = data.value?.filter(v => v !== null).length || 0;
    const nullValues = data.value?.filter(v => v === null).length || 0;
    
    // Create a sample of the data
    const sampleSize = Math.min(10, totalValues);
    const sampleData = data.value?.slice(0, sampleSize).map((value, index) => 
      `${index + 1}. ${value !== null ? value.toLocaleString() : 'null'}`
    ).join('\n') || 'No data available';

    const dimensionInfo = Object.entries(data.dimension).map(([varCode, varDef]) => {
      const selectedValues = Object.keys(varDef.category.index).slice(0, 5);
      const totalValues = Object.keys(varDef.category.index).length;
      return `  **${varDef.label}** (${varCode}): ${selectedValues.join(', ')}${totalValues > 5 ? ` ... (${totalValues} total)` : ''}`;
    }).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `**${data.label}** Data

**Data Summary:**
- Total Values: ${totalValues.toLocaleString()}
- Null Values: ${nullValues.toLocaleString()}
- Dimensions: ${Object.keys(data.dimension).length}
- Data Shape: ${data.size.join(' × ')}

**Selected Dimensions:**
${dimensionInfo}

**Sample Data (first ${sampleSize} values):**
${sampleData}

${data.source ? `**Source:** ${data.source}` : ''}
${data.updated ? `**Last Updated:** ${new Date(data.updated).toLocaleDateString()}` : ''}`,
        },
      ],
    };
  }

  private async handleCheckUsage() {
    const usage = this.apiClient.getUsageInfo();
    const rateLimitInfo = usage.rateLimitInfo;
    
    return {
      content: [
        {
          type: 'text',
          text: `**API Usage Status**

**Current Window:**
- Requests Made: ${usage.requestCount}
- Window Started: ${usage.windowStart.toISOString()}

${rateLimitInfo ? `**Rate Limits:**
- Max Calls: ${rateLimitInfo.maxCalls}
- Remaining: ${rateLimitInfo.remaining}
- Time Window: ${rateLimitInfo.timeWindow} seconds
- Reset Time: ${rateLimitInfo.resetTime.toISOString()}

**Usage:** ${usage.requestCount}/${rateLimitInfo.maxCalls} (${Math.round((usage.requestCount / rateLimitInfo.maxCalls) * 100)}%)` : '**Rate limit information not available yet**'}

${usage.requestCount > 0 ? `⚠️ **Tip:** To avoid rate limits, space out your requests and use specific selections to reduce API calls.` : ''}`,
        },
      ],
    };
  }

  private async handleSearchRegions(args: { query: string; language?: string }) {
    const { query, language = 'en' } = args;
    
    // Search for tables that contain region data to find region codes
    const searchResults = await this.apiClient.searchTables({
      query: `region ${query}`,
      pageSize: 5,
      lang: language
    });

    // Try to find region-related tables
    const regionTables = searchResults.tables.filter(table => 
      table.variableNames?.some(v => v.toLowerCase().includes('region')) ||
      table.label.toLowerCase().includes('region') ||
      table.label.toLowerCase().includes(query.toLowerCase())
    );

    if (regionTables.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**Region Search for "${query}"**

❌ No region-specific tables found matching "${query}".

💡 **Suggestions:**
- Try searching for broader terms like "municipality" or "county"
- Browse the Population folder with \`scb_browse_folders\` 
- Look for tables with "region" in their variable names
- Try Swedish terms if using English doesn't work

🔍 **Common Swedish region terms:**
- "kommun" = municipality  
- "län" = county
- "riket" = the whole country`,
          },
        ],
      };
    }

    const recommendations = regionTables.slice(0, 3).map(table => 
      `📊 **${table.label}** (${table.id})
   📝 Variables: ${table.variableNames?.join(', ') || 'N/A'}
   💡 Use \`scb_get_table_info\` to see available regions`
    ).join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Region Search for "${query}"**

Found ${regionTables.length} tables that might contain region data for "${query}":

${recommendations}

💡 **Next steps:**
1. Use \`scb_get_table_info\` on one of these tables to see available regions
2. Look for region codes in the metadata  
3. Use the region code in your data selection

⚠️ **Note:** Region codes are typically numeric (e.g., "1484" for Lerum municipality)`,
        },
      ],
    };
  }

  private async handleGetTableVariables(args: { tableId: string; language?: string; variableName?: string }) {
    const { tableId, language = 'en', variableName } = args;
    
    // Get table metadata to extract variable information
    const metadata = await this.apiClient.getTableMetadata(tableId, language);
    
    if (!metadata.dimension) {
      return {
        content: [
          {
            type: 'text',
            text: `**Variables for ${tableId}**

❌ No variable information available for this table.

💡 Try using \`scb_get_table_info\` for general table information.`,
          },
        ],
      };
    }

    const variables = Object.entries(metadata.dimension);
    
    // Filter to specific variable if requested
    const filteredVariables = variableName 
      ? variables.filter(([code, def]) => 
          code.toLowerCase() === variableName.toLowerCase() ||
          def.label.toLowerCase().includes(variableName.toLowerCase())
        )
      : variables;

    if (filteredVariables.length === 0) {
      const availableVars = variables.map(([code, def]) => `"${code}" (${def.label})`).join(', ');
      return {
        content: [
          {
            type: 'text',
            text: `**Variables for ${tableId}**

❌ Variable "${variableName}" not found.

**Available variables:** ${availableVars}`,
          },
        ],
      };
    }

    const variableDetails = filteredVariables.map(([varCode, varDef]) => {
      const values = Object.entries(varDef.category.index);
      const labels = varDef.category.label;
      
      // Show first 10 values, then indicate if there are more
      const displayValues = values.slice(0, 10).map(([code, index]) => {
        const label = labels ? labels[code] : '';
        return label ? `  "${code}" = ${label}` : `  "${code}"`;
      });
      
      const hasMore = values.length > 10;
      const moreText = hasMore ? `  ... and ${values.length - 10} more values` : '';
      
      return `**${varDef.label}** (${varCode})
📊 ${values.length} total values available

**Sample values:**
${displayValues.join('\n')}${moreText ? '\n' + moreText : ''}

💡 **Usage:** \`{"${varCode}": ["${values[0]?.[0] || 'value'}"]}\``;
    }).join('\n\n');

    const usageTips = filteredVariables.length === 1 && variableName ? '' : `

💡 **Selection Tips:**
- Use \`{"variableCode": ["value1", "value2"]}\` format
- Use \`{"variableCode": ["*"]}\` for all values  
- Use \`{"variableCode": ["TOP(5)"]}\` for first 5 values
- Use \`scb_get_table_variables\` with \`variableName\` for specific variable details`;

    return {
      content: [
        {
          type: 'text',
          text: `**Variables for ${metadata.label}** (${tableId})

${variableDetails}${usageTips}`,
        },
      ],
    };
  }

  private async handleFindRegionCode(args: { query: string; language?: string }) {
    const { query, language = 'en' } = args;
    
    try {
      // Look for a common population table that has region data
      const searchResults = await this.apiClient.searchTables({
        query: 'population municipality region',
        pageSize: 10,
        lang: language
      });

      // Find tables with Region variable
      const regionTables = searchResults.tables.filter(table => 
        table.variableNames?.some(v => v.toLowerCase().includes('region')) &&
        (table.label.toLowerCase().includes('population') || table.label.toLowerCase().includes('befolkning'))
      );

      if (regionTables.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `**Region Code Search for "${query}"**

❌ Could not find suitable regional tables to lookup codes.

💡 **Alternative approach:**
Try using \`scb_search_regions\` to find relevant tables, then use \`scb_get_table_variables\` to explore region codes.

🔍 **Common municipality codes:**
- Stockholm: 0180
- Gothenburg: 1480  
- Malmö: 1280
- Lerum: 1484`,
            },
          ],
        };
      }

      // Use the first suitable table to get region information
      const tableId = regionTables[0].id;
      const metadata = await this.apiClient.getTableMetadata(tableId, language);
      
      if (!metadata.dimension || !metadata.dimension['Region']) {
        return {
          content: [
            {
              type: 'text',
              text: `**Region Code Search for "${query}"**

❌ Could not access region data from table ${tableId}.

💡 Try using \`scb_get_table_variables\` with tableId="${tableId}" to explore available regions manually.`,
            },
          ],
        };
      }

      const regionDimension = metadata.dimension['Region'];
      const regionEntries = Object.entries(regionDimension.category.index);
      const regionLabels = regionDimension.category.label || {};

      // Search for the query in region labels and codes
      const matches = regionEntries.filter(([code, index]) => {
        const label = regionLabels[code] || '';
        return label.toLowerCase().includes(query.toLowerCase()) ||
               code.toLowerCase().includes(query.toLowerCase());
      });

      if (matches.length === 0) {
        // Do a fuzzy search for partial matches
        const partialMatches = regionEntries.filter(([code, index]) => {
          const label = regionLabels[code] || '';
          const queryWords = query.toLowerCase().split(' ');
          return queryWords.some(word => 
            label.toLowerCase().includes(word) || code.includes(word)
          );
        }).slice(0, 10);

        if (partialMatches.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `**Region Code Search for "${query}"**

❌ No regions found matching "${query}".

💡 **Try these common municipality codes:**
- Stockholm: 0180
- Gothenburg (Göteborg): 1480  
- Malmö: 1280
- Lerum: 1484
- Uppsala: 0380

🔍 Use \`scb_get_table_variables\` with tableId="${tableId}" and variableName="Region" to see all available regions.`,
              },
            ],
          };
        }

        const suggestions = partialMatches.map(([code, index]) => 
          `- **${code}**: ${regionLabels[code] || 'Unknown region'}`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `**Region Code Search for "${query}"**

❓ No exact match found, but here are similar regions:

${suggestions}

💡 **Usage:** Use the region code in your data selection like: \`{"Region": ["${partialMatches[0][0]}"]}\``,
            },
          ],
        };
      }

      // Found exact or close matches
      const results = matches.slice(0, 5).map(([code, index]) => 
        `- **${code}**: ${regionLabels[code] || 'Unknown region'}`
      ).join('\n');

      const primaryMatch = matches[0];
      const usageExample = `{"Region": ["${primaryMatch[0]}"]}`;

      return {
        content: [
          {
            type: 'text',
            text: `**Region Code Search for "${query}"**

✅ **Found ${matches.length} matching region(s):**

${results}

💡 **Primary match:** "${primaryMatch[0]}" = ${regionLabels[primaryMatch[0]] || 'Unknown region'}

🔧 **Usage in selection:** \`${usageExample}\`

📊 **Source table:** ${metadata.label} (${tableId})`,
          },
        ],
      };

    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `**Region Code Search Error**

❌ Failed to search for region codes: ${error instanceof Error ? error.message : String(error)}

💡 **Fallback:** Try \`scb_search_regions\` to find relevant tables manually.`,
          },
        ],
      };
    }
  }

  private async handleTestSelection(args: { tableId: string; selection: Record<string, string[]>; language?: string }) {
    const { tableId, selection, language = 'en' } = args;
    
    try {
      // Use the existing validation logic
      const validation = await this.apiClient.validateSelection(tableId, selection, language);
      
      const statusIcon = validation.isValid ? '✅' : '❌';
      const statusText = validation.isValid ? 'VALID' : 'INVALID';
      
      let responseText = `**Selection Validation for ${tableId}**

${statusIcon} **Status:** ${statusText}

**Your selection:**
${Object.entries(selection).map(([key, values]) => `- ${key}: [${values.join(', ')}]`).join('\n')}`;

      if (!validation.isValid) {
        responseText += `\n\n**❌ Errors:**\n${validation.errors.map(e => `- ${e}`).join('\n')}`;
      }

      if (validation.suggestions.length > 0) {
        responseText += `\n\n**💡 Suggestions:**\n${validation.suggestions.map(s => `- ${s}`).join('\n')}`;
      }

      if (validation.translatedSelection && JSON.stringify(validation.translatedSelection) !== JSON.stringify(selection)) {
        responseText += `\n\n**🔄 Translated selection:**\n${Object.entries(validation.translatedSelection).map(([key, values]) => `- ${key}: [${values.join(', ')}]`).join('\n')}`;
      }

      if (validation.isValid) {
        responseText += `\n\n**✅ This selection should work with \`scb_get_table_data\` or \`scb_preview_data\`!**`;
      } else {
        responseText += `\n\n**🔧 Fix the errors above before requesting data.**`;
      }

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `**Selection Test Failed**

❌ Could not validate selection: ${error instanceof Error ? error.message : String(error)}

💡 Check that the table ID is correct and try again.`,
          },
        ],
      };
    }
  }

  private async handlePreviewData(args: { tableId: string; selection?: Record<string, string[]>; language?: string }) {
    const { tableId, selection, language = 'en' } = args;
    
    try {
      // Create a limited selection for preview
      let previewSelection = selection;
      
      if (selection) {
        // Limit each variable to at most 3 values or use special expressions
        previewSelection = {};
        for (const [key, values] of Object.entries(selection)) {
          if (values.some(v => v === '*' || v.startsWith('TOP(') || v.startsWith('BOTTOM('))) {
            // Replace * with TOP(3) for preview, keep other expressions
            previewSelection[key] = values.map(v => v === '*' ? 'TOP(3)' : v);
          } else {
            // Limit to first 3 values
            previewSelection[key] = values.slice(0, 3);
          }
        }
      }

      // Get a small sample of data
      const data = await this.apiClient.getTableData(tableId, previewSelection, language);
      
      const totalValues = data.value?.filter(v => v !== null).length || 0;
      const nullValues = data.value?.filter(v => v === null).length || 0;
      
      // Show first few data points
      const sampleSize = Math.min(5, totalValues);
      const sampleData = data.value?.slice(0, sampleSize).map((value, index) => 
        `${index + 1}. ${value !== null ? value.toLocaleString() : 'null'}`
      ).join('\n') || 'No data available';

      const dimensionInfo = Object.entries(data.dimension).map(([varCode, varDef]) => {
        const selectedCount = Object.keys(varDef.category.index).length;
        const sampleValues = Object.keys(varDef.category.index).slice(0, 3).join(', ');
        return `  **${varDef.label}** (${varCode}): ${selectedCount} values (${sampleValues}${selectedCount > 3 ? '...' : ''})`;
      }).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `**📊 Data Preview for ${data.label}** (${tableId})

✅ **Selection worked!** Here's a sample of your data:

**Preview Summary:**
- Total data points: ${totalValues.toLocaleString()}
- Null values: ${nullValues.toLocaleString()}
- Data shape: ${data.size.join(' × ')}

**Selected Dimensions:**
${dimensionInfo}

**Sample Values:**
${sampleData}

**💡 Next steps:**
- If this looks correct, use \`scb_get_table_data\` for the full dataset
- Adjust your selection if needed and test again with \`scb_test_selection\`
- Consider using expressions like \`TOP(10)\` to limit large datasets

${data.updated ? `**Last Updated:** ${new Date(data.updated).toLocaleDateString()}` : ''}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `**📊 Data Preview Failed**

❌ Could not preview data: ${error instanceof Error ? error.message : String(error)}

**🔧 Troubleshooting:**
1. Use \`scb_test_selection\` to validate your selection first
2. Check variable names with \`scb_get_table_variables\`
3. Verify region codes with \`scb_find_region_code\`

**💡 The preview failed, but your full data request might still work if you fix the selection.**`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // This will keep the process running
    process.stdin.resume();
  }
}

// Start the server
const server = new SCBMCPServer();
server.run().catch(console.error);
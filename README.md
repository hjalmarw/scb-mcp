# SCB MCP Server - Statistics Sweden Data Access for Claude Desktop

A Model Context Protocol (MCP) server that provides Claude Desktop with seamless access to Statistics Sweden's (SCB) PX-Web API v2. This integration enables Claude to search, browse, and retrieve Swedish statistical data with built-in rate limiting, intelligent validation, and usage monitoring.

## 🎯 What is this?

This project creates a bridge between Claude Desktop and Statistics Sweden's extensive statistical database. It allows Claude to:
- Access official Swedish statistics on population, economy, labor market, education, and more
- Search and navigate through thousands of statistical tables
- **Find region codes by name** - No more guessing municipality codes!
- Retrieve specific data with intelligent filtering
- **Auto-translate variable names** - Use English terms that get converted to Swedish API format
- **Validate queries before making API calls** to prevent errors and wasted requests
- **Get actionable error messages** with specific guidance when things go wrong
- **Preview data safely** before making large requests

## 🚀 New & Improved Features

### ✨ **Major UX Improvements**
- **Smart Region Discovery**: `scb_find_region_code("Lerum")` → Returns "1484" with usage example
- **Intelligent Variable Translation**: Use `region`, `age`, `year` - automatically converted to `Region`, `Alder`, `Tid`
- **Pre-flight Validation**: Test selections before API calls with `scb_test_selection`
- **Safe Data Preview**: Sample data with `scb_preview_data` to verify selections work
- **Enhanced Error Messages**: Specific guidance instead of generic "Bad Request" errors

## 🏗️ How it Works

### Architecture

```
Claude Desktop <--> MCP Protocol <--> SCB MCP Server <--> SCB PX-Web API v2
```

The server acts as an intelligent middleware that:
1. **Receives requests** from Claude Desktop via the Model Context Protocol
2. **Validates and translates** parameters (e.g., Swedish variable names to English)
3. **Makes API calls** to Statistics Sweden with rate limiting
4. **Formats responses** in a Claude-friendly way with helpful context
5. **Provides error guidance** with specific suggestions when things go wrong

### Key Components

- **`src/index.ts`**: Main MCP server implementation with **11 specialized tools**
- **`src/api-client.ts`**: SCB API client with rate limiting, validation, and smart translation
- **`src/types.ts`**: TypeScript schemas for data validation using Zod
- **Built-in intelligence**: Pre-validation, bidirectional translation, and error recovery

## 📦 Installation

### Prerequisites

- Node.js 18.0.0 or later
- Claude Desktop application
- Windows, macOS, or Linux

### Setup Steps

1. **Clone the repository**
```bash
git clone https://github.com/hjalmarw/scb-mcp.git
cd scb-mcp
```

2. **Install dependencies**
```bash
npm install
```

3. **Build the TypeScript code**
```bash
npm run build
```

4. **Configure Claude Desktop**

Add to your Claude Desktop configuration file:

**Windows** (`%APPDATA%\Claude\claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "scb-statistics": {
      "command": "node",
      "args": ["C:\\path\\to\\scb-mcp\\dist\\index.js"],
      "description": "Statistics Sweden (SCB) data access"
    }
  }
}
```

**macOS** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "scb-statistics": {
      "command": "node",
      "args": ["/path/to/scb-mcp/dist/index.js"],
      "description": "Statistics Sweden (SCB) data access"
    }
  }
}
```

5. **Restart Claude Desktop** to load the new server

## 🛠️ Available Tools (11 Total)

### Core Tools

### 1. `scb_get_api_status`
Get API configuration and current rate limit status.
```
Example: "Check SCB API status"
```

### 2. `scb_browse_folders`
Navigate through SCB's hierarchical database structure.
```
Example: "Browse population statistics folders"
```

### 3. `scb_search_tables`
Search for statistical tables with enhanced filtering.
- **Enhanced**: Category filtering for better results
- **Smart search**: Suggests more specific queries when needed
```
Example: "Search for unemployment statistics in the labour category"
```

### 4. `scb_get_table_info`
Get detailed metadata about a specific table.
```
Example: "Get information about table BE0101N1"
```

### 5. `scb_get_table_data`
Retrieve statistical data with intelligent validation.
- **Enhanced**: Pre-validation and auto-translation
- **Smart errors**: Provides specific guidance when queries fail
```
Example: "Get population data for Stockholm from table BE0101N1"
```

### 6. `scb_check_usage`
Monitor API usage and rate limits.
```
Example: "Check my current SCB API usage"
```

---

### 🆕 **NEW: Smart Discovery Tools**

### 7. `scb_find_region_code` ⭐ **GAME CHANGER**
Find the exact region code for any municipality or area.
```
Example: "What's the region code for Lerum?" → Returns "1484" with usage example
```

### 8. `scb_search_regions` 
Find region-related tables when you need broader region exploration.
```
Example: "Find tables with region data for Stockholm"
```

### 9. `scb_get_table_variables` ⭐ **ESSENTIAL**
View all available variables and their possible values before fetching data.
```
Example: "Show me what variables are available in table TAB1267"
```

---

### 🛡️ **NEW: Error Prevention Tools**

### 10. `scb_test_selection` ⭐ **MUST USE**
Test if a data selection is valid WITHOUT making an API request.
```
Example: Test {"region": ["1484"], "year": ["2024"]} before requesting data
```

### 11. `scb_preview_data` ⭐ **SAFE TESTING**
Get a small preview of data to verify your selection works correctly.
```
Example: Preview population data for Lerum before requesting full dataset
```

## 💡 Usage Examples

### 🎯 **Recommended Workflow (Beginner-Friendly)**

#### **The "Lerum Demographics" Example** 
*This exact scenario used to fail - now it works perfectly!*

1. **Find your region code**
```
"What's the region code for Lerum municipality?"
→ scb_find_region_code returns: "1484" with usage example
```

2. **Find relevant tables**
```
"Search for population tables with demographics"
→ Returns tables like TAB1267 (Population by region, age and sex)
```

3. **Explore table structure** 
```
"Show me the variables available in table TAB1267"
→ See: Region (312 values), Alder (102 age groups), Kon (2 sexes), Tid (years)
```

4. **Test your selection safely**
```
"Test this selection: region=1484, age=all, sex=all, year=2024"
→ scb_test_selection validates and shows any issues
```

5. **Preview data before full request**
```
"Preview population data for Lerum in 2024" 
→ scb_preview_data returns sample to verify it works
```

6. **Get the full dataset**
```
"Get complete population data for Lerum by age and sex for 2024"
→ Returns comprehensive demographic data
```

### 🚀 **Advanced Workflow**

1. **Smart variable names** - Use English terms that auto-translate:
```
"Get data where region=Lerum, age=total, sex=male, year=2024"
→ Automatically converts: region→Region, age→Alder, sex→Kon, year→Tid
```

### Advanced Features

#### Smart Variable Translation
The server automatically translates common Swedish terms:
- `år` → `year`
- `kommun` → `municipality`
- `län` → `county`
- `kön` → `sex`

#### Selection Expressions
Use special expressions in data selections:
- `["*"]` - All values
- `["TOP(5)"]` - First 5 values
- `["BOTTOM(3)"]` - Last 3 values
- `["RANGE(2000,2020)"]` - Range of values

#### Category Filtering
Improve search results with category filters:
- `population` - Demographic statistics
- `labour` - Employment and labor market
- `economy` - Economic indicators
- `housing` - Housing and construction

## 🔧 Development

### Project Structure
```
scb-mcp/
├── src/
│   ├── index.ts         # MCP server implementation
│   ├── api-client.ts    # SCB API client with validation
│   └── types.ts         # TypeScript type definitions
├── dist/                # Compiled JavaScript (generated)
├── docs/                # API documentation
├── test-tools.js        # Comprehensive test suite
├── package.json         # Project configuration
└── README.md           # This file
```

### Available Scripts

```bash
# Build TypeScript
npm run build

# Development mode with watch
npm run dev

# Run tests
npm run test-simple   # Basic connectivity test
npm run test-local    # MCP protocol test
npm run test-full     # Comprehensive test suite

# Start server directly
npm start
```

### Testing

The project includes comprehensive test suites:
- **Protocol tests**: Verify MCP communication
- **Tool tests**: Test each tool individually
- **Integration tests**: End-to-end workflow testing

Run all tests:
```bash
npm run test-full
```

## 🚦 Rate Limiting & Best Practices

### API Limits
- **Rate limit**: 30 requests per 10-second window
- **Data limit**: 150,000 cells per request
- **Auto-recovery**: Server tracks and respects limits

### 🎯 **NEW: Best Practices (Updated)**
1. **Start with region codes**: Use `scb_find_region_code` to get exact codes
2. **Always test selections first**: Use `scb_test_selection` before requesting data  
3. **Preview before full requests**: Use `scb_preview_data` for verification
4. **Use smart variable names**: English terms work - they auto-translate
5. **Monitor usage**: Check `scb_check_usage` to avoid rate limits

## 🐛 Troubleshooting (Much Improved!)

### ✅ **Problems That Are Now SOLVED**

#### ~~"Variable not found in table"~~ → **FIXED!** 
- ✅ **Use English variable names** - they auto-translate (`region`→`Region`, `age`→`Alder`)
- ✅ **Get specific guidance** - errors now tell you exactly what to fix
- ✅ **Test first** - `scb_test_selection` catches issues before API calls

#### ~~"Region code not found"~~ → **FIXED!**
- ✅ **Direct lookup** - `scb_find_region_code("Lerum")` returns exact codes
- ✅ **No more guessing** - get codes with usage examples
- ✅ **Multiple sources** - searches across different table classifications

#### ~~"Bad request (400) with no guidance"~~ → **FIXED!**
- ✅ **Specific error messages** - tells you if it's variables, values, or format
- ✅ **Actionable suggestions** - points to exact tools to fix the issue
- ✅ **Prevention tools** - validate before making requests

### Remaining Common Issues

#### "Rate limit exceeded"
- Wait for the time window to reset (shown in error)
- Use `scb_check_usage` to monitor quota
- Use `scb_preview_data` instead of full requests for testing

#### "Too many data cells"
- Use `scb_preview_data` to test with smaller selections first
- Break large requests into chunks
- Use expressions like `TOP(10)` or specific value lists

## 🎉 Changelog

### v2.0.0 - Major UX Improvements (Latest)
**🚀 BREAKING: Completely solved the user experience issues!**

#### ✨ **NEW: Smart Discovery Tools**
- **`scb_find_region_code`**: Find exact region codes by municipality name
- **`scb_get_table_variables`**: Explore all available variables before requesting data

#### 🛡️ **NEW: Error Prevention Tools**  
- **`scb_test_selection`**: Validate data selections without making API requests
- **`scb_preview_data`**: Safe data sampling to verify selections work

#### 🧠 **ENHANCED: Intelligent Features**
- **Smart Variable Translation**: Auto-convert English↔Swedish (`region`→`Region`, `age`→`Alder`)
- **Enhanced Error Messages**: Specific guidance with actionable suggestions
- **Common Value Shortcuts**: Use `total`, `male`, `female` - automatically converted
- **Improved Validation**: Pre-flight checks prevent wasted API calls

#### 🔧 **IMPROVED: Developer Experience**
- **Better Error Handling**: Parse 400 errors with specific troubleshooting steps
- **Updated Documentation**: Comprehensive examples and workflow guides
- **Enhanced Testing**: 11 tools total, all thoroughly tested

### v1.0.0 - Initial Release
- Basic MCP server implementation
- 8 core tools for SCB API access
- Rate limiting and usage monitoring
- Swedish/English language support

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- [Statistics Sweden (SCB)](https://www.scb.se/en/) for providing the open data API
- [Anthropic](https://www.anthropic.com/) for the Model Context Protocol
- [Claude Desktop](https://claude.ai/desktop) for the AI assistant platform

## 📚 Resources

- [SCB PX-Web API Documentation](https://www.scb.se/en/services/open-data-api/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [JSON-stat Format](https://json-stat.org/)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests on [GitHub](https://github.com/hjalmarw/scb-mcp).

## 📞 Support

For issues or questions:
- Open an issue on [GitHub](https://github.com/hjalmarw/scb-mcp/issues)
- Check the test suite for examples: `npm run test-full`
- Review the API documentation in the `docs/` folder

---

*Built with ❤️ for making Swedish statistics accessible through AI*
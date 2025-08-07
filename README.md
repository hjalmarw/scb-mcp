# SCB MCP Server - Statistics Sweden Data Access for Claude Desktop

A Model Context Protocol (MCP) server that provides Claude Desktop with seamless access to Statistics Sweden's (SCB) PX-Web API v2. This integration enables Claude to search, browse, and retrieve Swedish statistical data with built-in rate limiting, intelligent validation, and usage monitoring.

## 🎯 What is this?

This project creates a bridge between Claude Desktop and Statistics Sweden's extensive statistical database. It allows Claude to:
- Access official Swedish statistics on population, economy, labor market, education, and more
- Search and navigate through thousands of statistical tables
- Retrieve specific data with intelligent filtering
- Handle Swedish/English language translations automatically
- Validate queries before making API calls to prevent errors

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

- **`src/index.ts`**: Main MCP server implementation with 8 specialized tools
- **`src/api-client.ts`**: SCB API client with rate limiting and validation
- **`src/types.ts`**: TypeScript schemas for data validation using Zod
- **Built-in intelligence**: Pre-validation, translation, and error recovery

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

## 🛠️ Available Tools

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
- **NEW**: Category filtering for better results
- **Smart search**: Suggests more specific queries when needed
```
Example: "Search for unemployment statistics in the labour category"
```

### 4. `scb_search_regions` 🆕
Find region codes by name - essential for location-specific queries.
```
Example: "Find the region code for Lerum municipality"
```

### 5. `scb_get_table_info`
Get detailed metadata about a specific table.
```
Example: "Get information about table BE0101N1"
```

### 6. `scb_get_table_variables` 🆕
View available variables and their possible values before fetching data.
```
Example: "Show me what variables are available in table TAB6534"
```

### 7. `scb_get_table_data`
Retrieve statistical data with intelligent validation.
- **Pre-validation**: Checks selections before API calls
- **Auto-translation**: Handles Swedish variable names
- **Smart errors**: Provides specific guidance when queries fail
```
Example: "Get population data for Stockholm from table BE0101N1"
```

### 8. `scb_check_usage`
Monitor API usage and rate limits.
```
Example: "Check my current SCB API usage"
```

## 💡 Usage Examples

### Basic Workflow

1. **Find relevant data**
```
"Search for population statistics about municipalities"
```

2. **Get region codes**
```
"What's the region code for Gothenburg?"
```

3. **Explore table structure**
```
"Show me the variables in table BE0101N1"
```

4. **Retrieve specific data**
```
"Get population data for region 1480 for the years 2020-2024"
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

### Best Practices
1. **Use specific selections** instead of requesting all data
2. **Check table variables first** with `scb_get_table_variables`
3. **Validate region codes** with `scb_search_regions`
4. **Monitor usage** with `scb_check_usage`
5. **Handle errors gracefully** - the server provides specific guidance

## 🐛 Troubleshooting

### Common Issues

#### "Variable not found in table"
- Use `scb_get_table_variables` to see exact variable names
- Variable names are case-sensitive
- Try the Swedish term if English doesn't work

#### "Rate limit exceeded"
- Wait for the time window to reset (shown in error)
- Use `scb_check_usage` to monitor quota
- Reduce concurrent requests

#### "Too many data cells"
- Use more specific selections
- Break large requests into smaller chunks
- Use expressions like `TOP(10)` to limit results

#### "Region code not found"
- Use `scb_search_regions` to find correct codes
- Region codes are usually numeric (e.g., "1484" for Lerum)
- Some tables use different region classifications

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
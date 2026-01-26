# Chartifact MCP Apps Viewer

This directory contains the MCP (Model Context Protocol) Apps compatible viewer for Chartifact.

## What is This?

The MCP viewer allows Chartifact to be embedded as an interactive UI component in MCP-compatible clients such as:
- Claude (Anthropic)
- VS Code with MCP extensions
- ChatGPT (OpenAI)
- And other applications supporting the MCP Apps protocol

## Files in This Directory

- **`index.html`** - The main MCP viewer page (embedded by MCP clients)
- **`test.html`** - Interactive test harness for local development and debugging
- **`INTEGRATION.md`** - Complete integration guide for developers
- **`ARCHITECTURE.md`** - Architecture documentation with diagrams and message flows

## Quick Start

### For End Users

Simply use an MCP server that returns Chartifact visualizations. The MCP client will automatically embed this viewer.

### For Developers

#### Local Testing

1. Open `test.html` in your browser:
   ```bash
   open test.html
   # or
   python3 -m http.server 8000
   # then visit http://localhost:8000/test.html
   ```

2. Use the test harness to:
   - Send JSON-RPC messages to the viewer
   - Test rendering with sample data
   - Debug protocol communication

#### Creating an MCP Server

See the example server in `../../demos/mcp-server/` for a working implementation.

Basic example:

```typescript
// Return a Chartifact visualization from your MCP tool
return {
  content: [
    {
      type: 'resource',
      resource: {
        uri: 'https://microsoft.github.io/chartifact/mcp-view/',
        mimeType: 'application/x-chartifact+markdown',
        text: `# Your Chartifact Document
        
\`\`\`json chartifact
{
  "type": "chart",
  "chartKey": "myChart"
}
\`\`\`
        
\`\`\`json chartifact
{
  "type": "resource",
  "resourceType": "charts",
  "resourceKey": "myChart",
  "spec": {
    "data": { "values": [/* your data */] },
    "mark": "bar",
    "encoding": {
      "x": { "field": "category", "type": "nominal" },
      "y": { "field": "value", "type": "quantitative" }
    }
  }
}
\`\`\`
`
      }
    }
  ]
};
```

## Protocol

This viewer implements the JSON-RPC 2.0 protocol with MCP Apps extensions.

### Supported Methods

- `initialize` - Connection handshake
- `ui/render` - Render a Chartifact document
- `ui/get-content` - Get current content info
- `ui/clear` - Clear current content

### Supported Notifications

- `ui/ready` - Viewer is ready (sent by viewer)
- `ui/update` - Update content without response
- `ui/content-mode` - Content format changed (sent by viewer)

See `INTEGRATION.md` for complete protocol reference.

## Security

- **Double Sandboxing**: Content rendered in nested iframes
- **No Custom JavaScript**: Only declarative components allowed
- **Origin Validation**: Messages validated by origin
- **XSS Protection**: Defensive parsing, no raw HTML

## Documentation

- [Integration Guide](INTEGRATION.md) - How to integrate with your MCP server/client
- [Architecture](ARCHITECTURE.md) - Technical architecture and message flows
- [Main Documentation](../mcp-apps.md) - Overview of MCP Apps support
- [Example Server](../../demos/mcp-server/) - Working MCP server example

## Hosted Viewer

The production viewer is hosted at:
```
https://microsoft.github.io/chartifact/mcp-view/
```

Use this URL when returning Chartifact resources from your MCP server.

## Support

- [GitHub Issues](https://github.com/microsoft/chartifact/issues)
- [Chartifact Documentation](https://microsoft.github.io/chartifact/)
- [MCP Protocol](https://modelcontextprotocol.io)

## License

MIT License - see [../../LICENSE](../../LICENSE)

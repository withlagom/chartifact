# Chartifact MCP Apps Integration Guide

This guide explains how to integrate Chartifact as an MCP App in your MCP server or client.

## For MCP Server Developers

### Quick Start

1. **Return a Chartifact UI resource** from your tool:

```typescript
{
  content: [
    {
      type: 'resource',
      resource: {
        uri: 'https://microsoft.github.io/chartifact/mcp-view/',
        mimeType: 'application/x-chartifact+markdown',
        text: '# Your Chartifact Markdown Here'
      }
    }
  ]
}
```

2. **Use the JSON format** for programmatic generation:

```typescript
{
  type: 'resource',
  resource: {
    uri: 'https://microsoft.github.io/chartifact/mcp-view/',
    mimeType: 'application/x-chartifact+json',
    text: JSON.stringify({
      "$schema": "https://microsoft.github.io/chartifact/schema/idoc_v1.json",
      "metadata": { "title": "My Dashboard" },
      "components": [/* ... */]
    })
  }
}
```

### Example: Data Visualization Tool

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server(/* ... */);

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'visualize_data') {
    const data = request.params.arguments?.data || [];
    
    return {
      content: [
        {
          type: 'text',
          text: `Created visualization with ${data.length} data points.`
        },
        {
          type: 'resource',
          resource: {
            uri: 'https://microsoft.github.io/chartifact/mcp-view/',
            mimeType: 'application/x-chartifact+markdown',
            text: `# Data Visualization

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
    "data": { "values": ${JSON.stringify(data)} },
    "mark": "bar",
    "encoding": {
      "x": { "field": "category", "type": "nominal" },
      "y": { "field": "value", "type": "quantitative" }
    }
  }
}
\`\`\``
          }
        }
      ]
    };
  }
});
```

## For MCP Client Developers

### Embedding Chartifact

1. **Load the viewer iframe**:
```html
<iframe 
  src="https://microsoft.github.io/chartifact/mcp-view/"
  sandbox="allow-scripts allow-popups allow-downloads"
  style="width: 100%; height: 100%; border: none;">
</iframe>
```

2. **Send JSON-RPC messages** to the iframe:

```typescript
iframe.contentWindow.postMessage({
  jsonrpc: '2.0',
  id: 1,
  method: 'ui/render',
  params: {
    title: 'My Document',
    markdown: '# Hello World'
  }
}, 'https://microsoft.github.io');
```

3. **Listen for responses**:

```typescript
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://microsoft.github.io') return;
  
  const message = event.data;
  if (message.jsonrpc === '2.0') {
    if (message.method === 'ui/ready') {
      console.log('Viewer is ready');
    }
  }
});
```

## Protocol Reference

### Methods (Request/Response)

#### `initialize`
Initialize the MCP connection.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "my-client", "version": "1.0.0" }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "resources": true },
    "serverInfo": { "name": "chartifact-viewer", "version": "1.0.0" }
  }
}
```

#### `ui/render`
Render content in the viewer.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "ui/render",
  "params": {
    "title": "My Document",
    "markdown": "# Hello World"
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": { "success": true }
}
```

#### `ui/get-content`
Get information about current content.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "ui/get-content"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "hasContent": true,
    "mode": "markdown"
  }
}
```

#### `ui/clear`
Clear the viewer content.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "ui/clear"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": { "success": true }
}
```

### Notifications (No Response Expected)

#### `ui/ready`
Sent by viewer when ready to receive content.

```json
{
  "jsonrpc": "2.0",
  "method": "ui/ready",
  "params": {
    "capabilities": {
      "formats": ["markdown", "json"],
      "interactive": true
    }
  }
}
```

#### `ui/update`
Update content without waiting for response.

```json
{
  "jsonrpc": "2.0",
  "method": "ui/update",
  "params": {
    "title": "Updated Document",
    "markdown": "# Updated Content"
  }
}
```

#### `ui/content-mode`
Sent when content format changes.

```json
{
  "jsonrpc": "2.0",
  "method": "ui/content-mode",
  "params": { "mode": "markdown" }
}
```

## Testing

Use the included test harness to verify your integration:

```
https://microsoft.github.io/chartifact/mcp-view/test.html
```

Or run locally:
```bash
cd docs/mcp-view
python3 -m http.server 8000
# Open http://localhost:8000/test.html
```

## Examples

See the [example MCP server](../../demos/mcp-server/) for working implementations.

## Resources

- [Chartifact Documentation](https://microsoft.github.io/chartifact/)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)

## Support

For issues and questions:
- GitHub Issues: https://github.com/microsoft/chartifact/issues
- Documentation: https://microsoft.github.io/chartifact/

## License

MIT License - see [LICENSE](../../LICENSE)

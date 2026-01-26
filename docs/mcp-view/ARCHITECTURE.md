# Chartifact MCP Apps Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       MCP Client (Host)                          │
│  (Claude, VS Code, ChatGPT, etc.)                               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              MCP Server (Your Tool)                     │    │
│  │                                                         │    │
│  │  - Receives user requests                              │    │
│  │  - Generates Chartifact document                       │    │
│  │  - Returns UI resource with viewer URL                 │    │
│  └─────────────────┬────────────────────────────────────────┘    │
│                    │                                             │
│                    │ Returns resource with viewer URL            │
│                    ▼                                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │           Embedded Chartifact Viewer (iframe)           │    │
│  │  https://microsoft.github.io/chartifact/mcp-view/      │    │
│  │                                                         │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │      JSON-RPC 2.0 Message Handler                │  │    │
│  │  │  (Receives markdown/JSON via postMessage)        │  │    │
│  │  └─────────────┬────────────────────────────────────┘  │    │
│  │                │                                         │    │
│  │                ▼                                         │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │      Chartifact Host (Rendering Engine)          │  │    │
│  │  │  - Parses markdown/JSON                          │  │    │
│  │  │  - Creates sandboxed renderer iframe             │  │    │
│  │  └─────────────┬────────────────────────────────────┘  │    │
│  │                │                                         │    │
│  │                ▼                                         │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │   Sandboxed Renderer (nested iframe)             │  │    │
│  │  │  - Renders interactive components                │  │    │
│  │  │  - Charts, tables, inputs, etc.                  │  │    │
│  │  │  - Isolated execution environment                │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Message Flow

### 1. Initialization

```
MCP Client                  Viewer iframe           Renderer iframe
    │                            │                         │
    │◄─── ui/ready ──────────────┤                         │
    │                            │                         │
    ├──── initialize ───────────►│                         │
    │◄─── response ──────────────┤                         │
```

### 2. Rendering Content

```
MCP Client                  Viewer iframe           Renderer iframe
    │                            │                         │
    ├──── ui/render ────────────►│                         │
    │   (markdown/JSON)          │                         │
    │                            ├──── postMessage ───────►│
    │                            │   (parsed content)      │
    │                            │                         │
    │                            │◄─── rendered ───────────┤
    │                            │                         │
    │◄─── success ───────────────┤                         │
```

### 3. Interactive Updates

```
User                    Renderer iframe         Viewer iframe        MCP Client
 │                            │                       │                   │
 ├─ interacts with UI ───────►│                       │                   │
 │                            ├─ updates state ───────►│                   │
 │                            │                       ├─ notification ────►│
 │                            │                       │  (optional)        │
```

## Key Components

### MCP Adapter (`packages/mcp-adapter/`)
- **Purpose**: JSON-RPC 2.0 protocol implementation
- **Type**: TypeScript library
- **Exports**: 
  - `McpGuestMessenger`: Main messenger class
  - Type definitions for JSON-RPC and MCP messages

### MCP Viewer (`docs/mcp-view/`)
- **Purpose**: MCP-compatible viewer page
- **Files**:
  - `index.html`: Viewer HTML page
  - `../assets/js/mcp-view.js`: JavaScript implementation
  - `test.html`: Test harness for development
  - `INTEGRATION.md`: Integration guide

### Example MCP Server (`demos/mcp-server/`)
- **Purpose**: Demonstration of Chartifact as MCP tool
- **Features**:
  - `create_chart`: Generate single charts
  - `create_dashboard`: Generate multi-panel dashboards
- **Usage**: Can be used with Claude Desktop, VS Code, etc.

## Security Model

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Security                      │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  MCP Client (Host Origin)                      │    │
│  │  ┌──────────────────────────────────────────┐  │    │
│  │  │  Chartifact Viewer iframe                │  │    │
│  │  │  (microsoft.github.io)                   │  │    │
│  │  │  - Validates message origins             │  │    │
│  │  │  - JSON-RPC protocol validation          │  │    │
│  │  │  ┌────────────────────────────────────┐  │  │    │
│  │  │  │  Renderer iframe (blob:)           │  │  │    │
│  │  │  │  - Sandboxed execution             │  │  │    │
│  │  │  │  - No custom JavaScript            │  │  │    │
│  │  │  │  - XSS-safe CSS parsing            │  │  │    │
│  │  │  └────────────────────────────────────┘  │  │    │
│  │  └──────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Security Features

1. **Double Sandboxing**:
   - Viewer iframe: First level of isolation
   - Renderer iframe: Second level with strict sandbox attributes

2. **No Custom JavaScript**:
   - Only declarative components
   - All interactions through framework APIs

3. **Origin Validation**:
   - Messages validated by origin
   - Protocol version checking

4. **XSS Protection**:
   - No raw HTML in markdown
   - Defensive CSS parsing
   - Sanitized user inputs

## Protocol Compliance

### JSON-RPC 2.0
- ✅ Request/Response pattern
- ✅ Notifications (one-way messages)
- ✅ Error handling with standard codes
- ✅ Batch requests (not yet implemented)

### MCP Apps Extension
- ✅ `initialize` handshake
- ✅ UI-specific methods (`ui/render`, `ui/clear`, etc.)
- ✅ Capability negotiation
- ✅ Resource-based content delivery
- ⏳ Tool invocation from UI (future)
- ⏳ Persistent state management (future)

## Future Enhancements

1. **Bidirectional Tool Calls**:
   - Allow UI components to trigger MCP tools
   - User interactions can invoke server-side operations

2. **State Persistence**:
   - Save/restore UI state across sessions
   - Export current state to MCP server

3. **Real-time Data Streaming**:
   - WebSocket support for live data
   - Progressive loading of large datasets

4. **Enhanced Capabilities**:
   - Resource listing
   - Prompt templates
   - Multi-document support

## Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [Chartifact Documentation](https://microsoft.github.io/chartifact/)

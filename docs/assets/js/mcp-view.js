/**
 * Chartifact MCP Apps Viewer
 * Implements JSON-RPC 2.0 protocol for MCP Apps communication
 */

// JSON-RPC 2.0 error codes
const JsonRpcErrorCode = {
    ParseError: -32700,
    InvalidRequest: -32600,
    MethodNotFound: -32601,
    InvalidParams: -32602,
    InternalError: -32603,
};

/**
 * MCP Guest Messenger
 * Handles JSON-RPC 2.0 communication with MCP host
 */
class McpGuestMessenger {
    constructor(hostWindow = window.parent, hostOrigin = '*') {
        this.hostWindow = hostWindow;
        this.hostOrigin = hostOrigin;
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.methodHandlers = new Map();
        this.notificationHandlers = new Map();

        // Setup message listener
        this.messageListener = this.handleMessage.bind(this);
        window.addEventListener('message', this.messageListener);
    }

    /**
     * Handle incoming messages from host
     */
    async handleMessage(event) {
        // Validate origin if specified
        if (this.hostOrigin !== '*' && event.origin !== this.hostOrigin) {
            console.warn('Received message from untrusted origin:', event.origin);
            return;
        }

        // Validate message structure
        const message = event.data;
        if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') {
            return; // Not a JSON-RPC message
        }

        // Handle response
        if ('result' in message || 'error' in message) {
            const pending = this.pendingRequests.get(message.id);
            if (pending) {
                this.pendingRequests.delete(message.id);
                if (message.error) {
                    pending.reject(message.error);
                } else {
                    pending.resolve(message.result);
                }
            }
            return;
        }

        // Handle request
        if ('id' in message) {
            await this.handleRequest(message);
            return;
        }

        // Handle notification
        this.handleNotification(message);
    }

    /**
     * Handle incoming request from host
     */
    async handleRequest(request) {
        const handler = this.methodHandlers.get(request.method);

        if (!handler) {
            this.sendResponse(request.id, undefined, {
                code: JsonRpcErrorCode.MethodNotFound,
                message: `Method not found: ${request.method}`,
            });
            return;
        }

        try {
            const result = await handler(request.params);
            this.sendResponse(request.id, result);
        } catch (error) {
            this.sendResponse(request.id, undefined, {
                code: JsonRpcErrorCode.InternalError,
                message: error.message || String(error),
                data: error,
            });
        }
    }

    /**
     * Handle incoming notification from host
     */
    handleNotification(notification) {
        const handler = this.notificationHandlers.get(notification.method);
        if (handler) {
            try {
                handler(notification.params);
            } catch (error) {
                console.error(`Error handling notification ${notification.method}:`, error);
            }
        }
    }

    /**
     * Send a request to the host and wait for response
     */
    async request(method, params) {
        const id = ++this.requestId;

        const request = {
            jsonrpc: '2.0',
            id,
            method,
            params,
        };

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.hostWindow.postMessage(request, this.hostOrigin);
        });
    }

    /**
     * Send a notification to the host (no response expected)
     */
    notify(method, params) {
        const notification = {
            jsonrpc: '2.0',
            method,
            params,
        };

        this.hostWindow.postMessage(notification, this.hostOrigin);
    }

    /**
     * Send a response to a request from the host
     */
    sendResponse(id, result, error) {
        const response = {
            jsonrpc: '2.0',
            id,
        };

        if (error) {
            response.error = error;
        } else {
            response.result = result;
        }

        this.hostWindow.postMessage(response, this.hostOrigin);
    }

    /**
     * Register a handler for incoming requests
     */
    onRequest(method, handler) {
        this.methodHandlers.set(method, handler);
    }

    /**
     * Register a handler for incoming notifications
     */
    onNotification(method, handler) {
        this.notificationHandlers.set(method, handler);
    }

    /**
     * Cleanup
     */
    destroy() {
        window.removeEventListener('message', this.messageListener);
        this.pendingRequests.clear();
        this.methodHandlers.clear();
        this.notificationHandlers.clear();
    }
}

/**
 * Initialize MCP Apps viewer
 */
window.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('mcp-status');
    const toolbar = new Chartifact.toolbar.Toolbar('.chartifact-toolbar', { textarea: null });

    // Initialize MCP messenger
    const messenger = new McpGuestMessenger();

    // Update status display
    function updateStatus(message, type = 'info') {
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.style.background = type === 'error' ? '#fee' : type === 'success' ? '#efe' : '#f0f0f0';
        }
    }

    // Initialize Chartifact host
    const host = new Chartifact.host.Listener({
        preview: '#preview',
        loading: '#loading',
        help: '#help',
        toolbar,
        options: {
            clipboard: false,  // Disable clipboard in MCP mode
            dragDrop: false,   // Disable drag-drop in MCP mode
            fileUpload: false, // Disable file upload in MCP mode
            postMessage: false, // We handle postMessage ourselves
            url: false,        // Disable URL loading in MCP mode
        },
        onApprove: (message) => {
            // Auto-approve for MCP context
            return message.specs;
        },
        onSetMode: (mode, markdown, interactiveDocument) => {
            // Notify host about content mode
            messenger.notify('ui/content-mode', { mode });
        },
    });

    // Handle initialize request from MCP host
    messenger.onRequest('initialize', async (params) => {
        updateStatus('Connected to MCP host', 'success');
        
        return {
            protocolVersion: '2024-11-05',
            capabilities: {
                tools: false,
                resources: true,
            },
            serverInfo: {
                name: 'chartifact-viewer',
                version: '1.0.0',
            },
        };
    });

    // Handle render request - accepts markdown or JSON document
    messenger.onRequest('ui/render', async (params) => {
        try {
            updateStatus('Rendering content...', 'info');
            
            const { title, markdown, interactiveDocument } = params;
            
            if (!markdown && !interactiveDocument) {
                throw new Error('Either markdown or interactiveDocument must be provided');
            }

            await host.render(
                title || 'Untitled Document',
                markdown || null,
                interactiveDocument || null,
                false
            );

            updateStatus('Content rendered successfully', 'success');
            
            return { success: true };
        } catch (error) {
            updateStatus(`Error: ${error.message}`, 'error');
            throw error;
        }
    });

    // Handle get-content request - returns current content
    messenger.onRequest('ui/get-content', async () => {
        // Return information about current content
        return {
            hasContent: !!host.currentMarkdown,
            mode: toolbar.mode || 'unknown',
        };
    });

    // Handle clear request
    messenger.onRequest('ui/clear', async () => {
        updateStatus('Clearing content...', 'info');
        host.createSandbox('');
        updateStatus('Ready for new content', 'info');
        return { success: true };
    });

    // Handle notification for content updates
    messenger.onNotification('ui/update', (params) => {
        const { title, markdown, interactiveDocument } = params;
        host.render(
            title || 'Untitled Document',
            markdown || null,
            interactiveDocument || null,
            false
        );
    });

    // Send ready notification to host
    updateStatus('Waiting for MCP host...', 'info');
    messenger.notify('ui/ready', {
        capabilities: {
            formats: ['markdown', 'json'],
            interactive: true,
        },
    });

    // Store messenger globally for debugging
    window.mcpMessenger = messenger;
    window.mcpHost = host;

    // Log that we're ready
    console.log('Chartifact MCP Apps viewer initialized');
    console.log('Waiting for initialize request from MCP host...');
});

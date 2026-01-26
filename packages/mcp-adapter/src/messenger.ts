/**
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 */

import type {
    JsonRpcRequest,
    JsonRpcResponse,
    JsonRpcNotification,
    JsonRpcMessage,
    JsonRpcError,
    McpInitializeParams,
    McpInitializeResult,
} from './types.js';

/**
 * JSON-RPC 2.0 error codes
 */
export const JsonRpcErrorCode = {
    ParseError: -32700,
    InvalidRequest: -32600,
    MethodNotFound: -32601,
    InvalidParams: -32602,
    InternalError: -32603,
} as const;

/**
 * MCP Apps Guest Messenger
 * Handles JSON-RPC 2.0 communication between iframe guest and MCP host
 */
export class McpGuestMessenger {
    private hostWindow: Window;
    private hostOrigin: string;
    private requestId: number = 0;
    private pendingRequests: Map<string | number, {
        resolve: (result: any) => void;
        reject: (error: JsonRpcError) => void;
    }> = new Map();
    private methodHandlers: Map<string, (params: any) => Promise<any> | any> = new Map();
    private notificationHandlers: Map<string, (params: any) => void> = new Map();
    private messageListener: (event: MessageEvent) => void;

    constructor(hostWindow?: Window, hostOrigin: string = '*') {
        this.hostWindow = hostWindow || window.parent;
        this.hostOrigin = hostOrigin;

        // Setup message listener
        this.messageListener = this.handleMessage.bind(this);
        window.addEventListener('message', this.messageListener);
    }

    /**
     * Handle incoming messages from host
     */
    private async handleMessage(event: MessageEvent): Promise<void> {
        // Validate origin if specified
        if (this.hostOrigin !== '*' && event.origin !== this.hostOrigin) {
            console.warn('Received message from untrusted origin:', event.origin);
            return;
        }

        // Validate message structure
        const message = event.data as JsonRpcMessage;
        if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') {
            return; // Not a JSON-RPC message
        }

        // Handle response
        if ('result' in message || 'error' in message) {
            const response = message as JsonRpcResponse;
            const pending = this.pendingRequests.get(response.id);
            if (pending) {
                this.pendingRequests.delete(response.id);
                if (response.error) {
                    pending.reject(response.error);
                } else {
                    pending.resolve(response.result);
                }
            }
            return;
        }

        // Handle request
        if ('id' in message) {
            const request = message as JsonRpcRequest;
            await this.handleRequest(request);
            return;
        }

        // Handle notification
        const notification = message as JsonRpcNotification;
        this.handleNotification(notification);
    }

    /**
     * Handle incoming request from host
     */
    private async handleRequest(request: JsonRpcRequest): Promise<void> {
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
                message: error instanceof Error ? error.message : String(error),
                data: error,
            });
        }
    }

    /**
     * Handle incoming notification from host
     */
    private handleNotification(notification: JsonRpcNotification): void {
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
    public async request(method: string, params?: any): Promise<any> {
        const id = ++this.requestId;
        
        const request: JsonRpcRequest = {
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
    public notify(method: string, params?: any): void {
        const notification: JsonRpcNotification = {
            jsonrpc: '2.0',
            method,
            params,
        };

        this.hostWindow.postMessage(notification, this.hostOrigin);
    }

    /**
     * Send a response to a request from the host
     */
    private sendResponse(id: string | number, result?: any, error?: JsonRpcError): void {
        const response: JsonRpcResponse = {
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
    public onRequest(method: string, handler: (params: any) => Promise<any> | any): void {
        this.methodHandlers.set(method, handler);
    }

    /**
     * Register a handler for incoming notifications
     */
    public onNotification(method: string, handler: (params: any) => void): void {
        this.notificationHandlers.set(method, handler);
    }

    /**
     * MCP Apps initialize handshake
     */
    public async initialize(params: McpInitializeParams): Promise<McpInitializeResult> {
        return this.request('initialize', params);
    }

    /**
     * Call a tool on the host
     */
    public async callTool(name: string, args?: Record<string, any>): Promise<any> {
        return this.request('tools/call', { name, arguments: args });
    }

    /**
     * Read a resource from the host
     */
    public async readResource(uri: string): Promise<any> {
        return this.request('resources/read', { uri });
    }

    /**
     * Send a UI message to the host
     */
    public sendUiMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
        this.notify('ui/message', { message, level });
    }

    /**
     * Cleanup
     */
    public destroy(): void {
        window.removeEventListener('message', this.messageListener);
        this.pendingRequests.clear();
        this.methodHandlers.clear();
        this.notificationHandlers.clear();
    }
}

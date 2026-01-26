/**
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 */

/**
 * JSON-RPC 2.0 types and interfaces for MCP Apps protocol
 */

export interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: any;
}

export interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: string | number;
    result?: any;
    error?: JsonRpcError;
}

export interface JsonRpcNotification {
    jsonrpc: '2.0';
    method: string;
    params?: any;
}

export interface JsonRpcError {
    code: number;
    message: string;
    data?: any;
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcNotification;

/**
 * MCP Apps specific message types
 */

export interface McpInitializeParams {
    protocolVersion: string;
    capabilities?: {
        tools?: boolean;
        resources?: boolean;
    };
    clientInfo?: {
        name: string;
        version: string;
    };
}

export interface McpInitializeResult {
    protocolVersion: string;
    capabilities: {
        tools?: boolean;
        resources?: boolean;
    };
    serverInfo: {
        name: string;
        version: string;
    };
}

export interface McpToolCallParams {
    name: string;
    arguments?: Record<string, any>;
}

export interface McpResourceReadParams {
    uri: string;
}

export interface McpUiMessageParams {
    message: string;
    level?: 'info' | 'warning' | 'error';
}

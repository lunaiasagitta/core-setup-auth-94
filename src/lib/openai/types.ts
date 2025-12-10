// Types para integração com OpenAI

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface CompletionOptions {
  messages: ChatMessage[];
  tools?: Tool[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

export interface CompletionResponse {
  content?: string;
  tool_calls?: ToolCall[];
  finish_reason: 'stop' | 'tool_calls' | 'length';
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface EmbeddingOptions {
  input: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

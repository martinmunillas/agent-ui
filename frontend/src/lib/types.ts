export interface FunctionCall {
  name: string;
  id: string;
  args: Record<string, unknown>;
}

export interface FunctionResponse {
  id: string;
  name: string;
  response: Record<string, unknown>;
}

export interface ContentPart {
  text?: string;
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
}

export interface Content {
  role: string;
  parts: ContentPart[];
}

export interface SSEEvent {
  id: string;
  timestamp: string;
  author: string;
  content?: Content;
  partial?: boolean;
  errorCode?: string;
  errorMessage?: string;
  longRunningToolIdsInProgress?: string[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export interface PendingConfirmation {
  id: string;
  name: string;
  message: string;
  type: "confirmation" | "input";
  placeholder?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  pendingConfirmation: PendingConfirmation | null;
}

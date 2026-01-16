import { useChat } from "../hooks/useChat";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ConfirmationDialog } from "./ConfirmationDialog";

export function Chat() {
  const {
    messages,
    isLoading,
    isInitializing,
    pendingConfirmation,
    error,
    sendMessage,
    respondToConfirmation,
    respondWithInput,
    clearError,
  } = useChat();

  if (isInitializing) {
    return (
      <div className="flex flex-col h-screen bg-gray-900 items-center justify-center">
        <p className="text-gray-400 animate-pulse">Initializing session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <header className="px-4 py-3 border-b border-gray-700 bg-gray-800">
        <h1 className="text-xl font-semibold text-white">Agent Chat</h1>
        <p className="text-sm text-gray-400">Powered by Google ADK + Gemini</p>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900 text-red-100 px-4 py-2 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="text-red-200 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} />

      {/* Loading indicator */}
      {isLoading && !messages.some((m) => m.isStreaming) && (
        <div className="px-4 py-2 text-gray-400">
          <span className="animate-pulse">Agent is thinking...</span>
        </div>
      )}

      {/* Input */}
      <MessageInput
        onSend={sendMessage}
        disabled={isLoading || !!pendingConfirmation}
      />

      {/* Confirmation/Input Dialog */}
      {pendingConfirmation && (
        <ConfirmationDialog
          confirmation={pendingConfirmation}
          onConfirm={respondToConfirmation}
          onInput={respondWithInput}
        />
      )}
    </div>
  );
}

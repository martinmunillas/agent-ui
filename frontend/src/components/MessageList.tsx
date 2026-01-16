import type { Message } from "../lib/types";

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <p>Send a message to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[80%] rounded-lg px-4 py-2 ${
              message.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-100"
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

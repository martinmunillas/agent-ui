import { useState, useRef, useEffect } from "react";
import { useSSE } from "./useSSE";
import type { Message, PendingConfirmation, SSEEvent } from "../lib/types";

const API_URL = "http://localhost:8080";
const APP_NAME = "demo_agent";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userIdRef = useRef(`user-${generateId()}`);
  const sessionIdRef = useRef<string | null>(null);
  const streamingMessageRef = useRef<string>("");

  // Create session on mount
  useEffect(() => {
    const createSession = async () => {
      try {
        const response = await fetch(
          `${API_URL}/apps/${APP_NAME}/users/${userIdRef.current}/sessions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to create session: ${response.status}`);
        }

        const data = await response.json();
        sessionIdRef.current = data.id;
        setIsInitializing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize");
        setIsInitializing(false);
      }
    };

    createSession();
  }, []);

  const handleEvent = (event: SSEEvent) => {
    console.log("event :>> ", event);
    if (event.errorCode || event.errorMessage) {
      setError(event.errorMessage || "An error occurred");
      setIsLoading(false);
      return;
    }

    if (!event.content?.parts) return;

    for (const part of event.content.parts) {
      // 1. Handle text content
      if (part.text !== undefined) {
        const newChunk = part.text; // Store the incoming delta

        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];

          if (lastMessage?.role === "assistant" && lastMessage?.isStreaming) {
            // Append ONLY the new chunk to the previous content
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: lastMessage.content + newChunk,
              },
            ];
          } else {
            // Start a new assistant message
            return [
              ...prev,
              {
                id: generateId(),
                role: "assistant",
                content: newChunk,
                isStreaming: true,
              },
            ];
          }
        });
      }

      // Handle function calls (confirmation/input requests)
      if (part.functionCall) {
        const { name, id, args } = part.functionCall;

        if (
          name === "request_user_confirmation" ||
          name === "request_user_input"
        ) {
          setPendingConfirmation({
            id,
            name,
            message: (args.message as string) || "Please respond",
            type:
              name === "request_user_confirmation" ? "confirmation" : "input",
            placeholder: args.placeholder as string | undefined,
          });
        }
      }
    }
  };

  const handleError = (err: Error) => {
    setError(err.message);
    setIsLoading(false);
  };

  const handleComplete = () => {
    setIsLoading(false);
    streamingMessageRef.current = "";
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      console.log("complete lastMessage :>> ", lastMessage);
      if (lastMessage?.isStreaming) {
        return [...prev.slice(0, -1), { ...lastMessage, isStreaming: false }];
      }
      return prev;
    });
  };

  const { sendMessage: sseConnect, sendFunctionResponse } = useSSE({
    onEvent: handleEvent,
    onError: handleError,
    onComplete: handleComplete,
  });

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !sessionIdRef.current) return;

    setError(null);
    setIsLoading(true);
    streamingMessageRef.current = "";

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "user",
        content: content.trim(),
      },
    ]);

    await sseConnect(userIdRef.current, sessionIdRef.current, content.trim());
  };

  const respondToConfirmation = async (confirmed: boolean) => {
    if (!pendingConfirmation || !sessionIdRef.current) return;

    setIsLoading(true);
    streamingMessageRef.current = "";

    // Add user's response as a message
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "user",
        content: confirmed ? "Yes" : "No",
      },
    ]);

    const response = {
      confirmed,
      message: confirmed ? "User confirmed" : "User declined",
    };

    await sendFunctionResponse(
      userIdRef.current,
      sessionIdRef.current,
      pendingConfirmation.id,
      pendingConfirmation.name,
      response
    );

    setPendingConfirmation(null);
  };

  const respondWithInput = async (input: string) => {
    if (!pendingConfirmation || !sessionIdRef.current) return;

    setIsLoading(true);
    streamingMessageRef.current = "";

    // Add user's input as a message
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "user",
        content: input,
      },
    ]);

    const response = {
      input,
      message: "User provided input",
    };

    await sendFunctionResponse(
      userIdRef.current,
      sessionIdRef.current,
      pendingConfirmation.id,
      pendingConfirmation.name,
      response
    );

    setPendingConfirmation(null);
  };

  const clearError = () => {
    setError(null);
  };

  return {
    messages,
    isLoading,
    isInitializing,
    pendingConfirmation,
    error,
    sendMessage,
    respondToConfirmation,
    respondWithInput,
    clearError,
  };
}

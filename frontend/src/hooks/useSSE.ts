import { useRef } from "react";
import type { SSEEvent, ContentPart } from "../lib/types";

const API_URL = "http://localhost:8080";

interface UseSSEOptions {
  onEvent: (event: SSEEvent) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

export function useSSE({ onEvent, onError, onComplete }: UseSSEOptions) {
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = async (
    userId: string,
    sessionId: string,
    message: string
  ) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const response = await fetch(`${API_URL}/run_sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: "demo_agent",
          userId,
          sessionId,
          newMessage: {
            role: "user",
            parts: [{ text: message }],
          },
          streaming: true,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let allText = "";
      let hasReceivedSSE = false;

      while (true) {
        const { done, value } = await reader.read();

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        allText += chunk;

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            hasReceivedSSE = true;
            try {
              const event = JSON.parse(line.slice(6)) as SSEEvent;
              if (event.partial) {
                continue;
              }
              console.log("event :>> ", event);
              onEvent(event);
            } catch {
              console.error("Failed to parse SSE event:", line);
              // Ignore parse errors
            }
          }
        }
        if (done) break;
      }

      // If no SSE events were received, treat entire response as error
      if (!hasReceivedSSE && allText.trim()) {
        throw new Error(allText.trim().slice(0, 300));
      }

      setTimeout(() => {
        onComplete();
      });
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        onError(err);
      }
    }
  };

  const sendFunctionResponse = async (
    userId: string,
    sessionId: string,
    functionId: string,
    functionName: string,
    response: Record<string, unknown>
  ) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_URL}/run_sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: "demo_agent",
          userId,
          sessionId,
          newMessage: {
            role: "user",
            parts: [
              {
                functionResponse: {
                  id: functionId,
                  name: functionName,
                  response,
                },
              } as ContentPart,
            ],
          },
          streaming: true,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP error: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6)) as SSEEvent;
              if (event.partial) {
                continue;
              }
              onEvent(event);
            } catch {
              console.error("Failed to parse SSE event:", line);
            }
          }
        }
      }

      setTimeout(() => {
        onComplete();
      });
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        onError(err);
      }
    }
  };

  const disconnect = () => {
    abortRef.current?.abort();
  };

  return { sendMessage, sendFunctionResponse, disconnect };
}

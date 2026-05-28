import { apiClient } from "@/lib/api-client";
import type { ChatSession, ChatSessionCreate, ChatHistoryResponse } from "@/types";

const BASE = "/chat";

export const chatService = {
  createSession: (data: ChatSessionCreate) =>
    apiClient.post<ChatSession>(`${BASE}/sessions`, data),

  getSessionHistory: (sessionId: string) =>
    apiClient.get<ChatHistoryResponse>(`${BASE}/sessions/${sessionId}/history`),

  closeSession: (sessionId: string) =>
    apiClient.post<void>(`${BASE}/sessions/${sessionId}/close`),

  streamMessage: async function* (
    sessionId: string,
    message: string
  ): AsyncGenerator<string, void, unknown> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    const response = await fetch(`${baseUrl}${BASE}/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, session_id: sessionId }),
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

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
          const data = line.slice(6);
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.content) {
              yield parsed.content;
            }
          } catch (e) {
            // Skip malformed chunks
          }
        }
      }
    }
  },
};
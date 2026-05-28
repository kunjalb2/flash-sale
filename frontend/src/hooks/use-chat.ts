"use client";

import { useState, useCallback, useRef } from "react";
import { chatService } from "@/services/chat";
import type { ChatMessage, ChatSession } from "@/types";

interface UseChatOptions {
  eventId?: string;
}

interface UseChatReturn {
  session: ChatSession | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  action: { type: string; event_id?: string } | null;
  sendMessage: (content: string) => Promise<void>;
  initSession: () => Promise<void>;
  clearError: () => void;
}

export function useChat(options?: UseChatOptions): UseChatReturn {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<{ type: string; event_id?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const initSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const s = await chatService.createSession({
        event_id: options?.eventId || null,
      });
      setSession(s);

      if (s.message_count > 0) {
        const history = await chatService.getSessionHistory(s.id);
        setMessages(history.messages);
      }
    } catch (e: any) {
      setError(e.message || "Failed to create chat session");
    } finally {
      setIsLoading(false);
    }
  }, [options?.eventId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!session || isStreaming) return;

      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const assistantId = `temp-assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
        },
      ]);

      setIsStreaming(true);
      setError(null);

      try {
        let fullContent = "";
        for await (const chunk of chatService.streamMessage(session.id, content)) {
          fullContent += chunk;
          const current = fullContent;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: current } : m
            )
          );
        }
      } catch (e: any) {
        setError(e.message || "Failed to get response");
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsStreaming(false);
      }
    },
    [session, isStreaming]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    session,
    messages,
    isStreaming,
    isLoading,
    error,
    action,
    sendMessage,
    initSession,
    clearError,
  };
}
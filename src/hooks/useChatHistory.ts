import { useState, useEffect, useCallback } from 'react';

export type ChatMessage = { role: 'user' | 'assistant'; content: string; id: string };

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'ai_chat_sessions';

export const useChatHistory = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
      } catch (e) {
        setSessions([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const createSession = useCallback(() => {
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title: '',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSessions(prev => [session, ...prev]);
    setActiveSessionId(session.id);
    return session;
  }, []);

  const updateSessionMessages = useCallback((sessionId: string, messages: ChatMessage[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const title = s.title || messages.find(m => m.role === 'user')?.content.slice(0, 40) || '';
      return { ...s, messages, title, updatedAt: new Date().toISOString() };
    }));
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) setActiveSessionId(null);
  }, [activeSessionId]);

  const clearAllSessions = useCallback(() => {
    setSessions([]);
    setActiveSessionId(null);
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  return {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    updateSessionMessages,
    deleteSession,
    clearAllSessions,
  };
};

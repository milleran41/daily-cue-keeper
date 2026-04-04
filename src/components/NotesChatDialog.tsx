import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/useLanguage';
import { Send, Mic, MicOff, Save, CheckSquare, MessageSquare, ArrowLeft, Plus, Trash2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useChatHistory, ChatMessage } from '@/hooks/useChatHistory';
import { format } from 'date-fns';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

type View = 'history' | 'chat';

interface NotesChatDialogProps {
  open: boolean;
  onClose: () => void;
  onSaveAll: (text: string) => void;
  onSaveSelected: (text: string) => void;
}

export const NotesChatDialog = ({ open, onClose, onSaveAll, onSaveSelected }: NotesChatDialogProps) => {
  const { t } = useLanguage();
  const {
    sessions, activeSession, activeSessionId,
    setActiveSessionId, createSession, updateSessionMessages, deleteSession, clearAllSessions,
  } = useChatHistory();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedMsgs, setSelectedMsgs] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [view, setView] = useState<View>('history');
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const currentSessionRef = useRef<string | null>(null);

  // On open, always show history
  useEffect(() => {
    if (open) {
      setView('history');
      setMessages([]);
      setActiveSessionId(null);
      setSelectMode(false);
      setSelectedMsgs(new Set());
      setInput('');
    }
  }, [open, setActiveSessionId]);

  // When active session changes, load its messages
  useEffect(() => {
    if (activeSession) {
      setMessages(activeSession.messages);
      currentSessionRef.current = activeSession.id;
    }
  }, [activeSessionId]);

  // Sync messages back to session
  useEffect(() => {
    if (currentSessionRef.current && messages.length > 0) {
      updateSessionMessages(currentSessionRef.current, messages);
    }
  }, [messages, updateSessionMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startNewChat = () => {
    const session = createSession();
    currentSessionRef.current = session.id;
    setMessages([]);
    setView('chat');
  };

  const openSession = (id: string) => {
    setActiveSessionId(id);
    setView('chat');
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim(), id: crypto.randomUUID() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const assistantId = crypto.randomUUID();

    try {
      const resp = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `System context: Ты — умный помощник в приложении-ежедневнике. Сегодня: ${new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Текущее время (UTC): ${new Date().toISOString().slice(11, 16)}. Отвечай кратко и по делу. Помогай с планированием, заметками, идеями и любыми вопросами. Можешь отвечать на русском и английском в зависимости от языка пользователя.` }]
            },
            ...messages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            })),
            {
              role: 'user',
              parts: [{ text: text.trim() }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`AI error: ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (content) {
                assistantSoFar += content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.id === assistantId) {
                    return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                  }
                  return [...prev, { role: 'assistant', content: assistantSoFar, id: assistantId }];
                });
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${e.message}`, id: assistantId }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const startVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    recognition.onresult = (e: any) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    setIsListening(true);
    recognition.start();
  }, []);

  const stopVoice = useCallback(() => { recognitionRef.current?.stop(); }, []);

  const toggleSelect = (id: string) => {
    setSelectedMsgs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSaveAll = () => {
    const text = messages.map(m => `${m.role === 'user' ? '👤' : '🤖'} ${m.content}`).join('\n\n');
    onSaveAll(text);
  };

  const handleSaveSelected = () => {
    const selected = messages.filter(m => selectedMsgs.has(m.id));
    const text = selected.map(m => `${m.role === 'user' ? '👤' : '🤖'} ${m.content}`).join('\n\n');
    onSaveSelected(text);
    setSelectedMsgs(new Set());
    setSelectMode(false);
  };

  const handleClearChat = () => {
    setMessages([]);
    if (currentSessionRef.current) {
      deleteSession(currentSessionRef.current);
    }
    setView('history');
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
        {view === 'history' ? (
          <>
            <DialogHeader className="px-4 py-3 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold">{t('chatHistory')}</DialogTitle>
                {sessions.length > 0 && (
                  <button
                    onClick={clearAllSessions}
                    className="text-xs text-destructive/70 hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-destructive/10"
                  >
                    {t('clearAll')}
                  </button>
                )}
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              <button
                onClick={startNewChat}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-5 h-5" />
                {t('newChat')}
              </button>

              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Clock className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">{t('noHistoryChats')}</p>
                </div>
              ) : (
                <AnimatePresence>
                  {sessions.map(session => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -80 }}
                      className="flex items-center gap-2"
                    >
                      <button
                        onClick={() => openSession(session.id)}
                        className="flex-1 text-left p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
                      >
                        <p className="text-sm font-medium truncate text-foreground">
                          {session.title || t('newChat')}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(session.updatedAt), 'dd.MM.yyyy HH:mm')} · {session.messages.length} msg
                        </p>
                      </button>
                      <button
                        onClick={() => deleteSession(session.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive/60 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="px-4 py-3 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => setView('history')} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <DialogTitle className="text-base font-bold">{t('aiChatTitle')}</DialogTitle>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleClearChat}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive/60 transition-colors"
                    title={t('clearChat')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {messages.length > 0 && (
                    <>
                      <button
                        onClick={() => setSelectMode(!selectMode)}
                        className={`p-2 rounded-lg text-xs font-medium transition-colors ${selectMode ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      {selectMode && selectedMsgs.size > 0 && (
                        <button onClick={handleSaveSelected} className="p-2 rounded-lg hover:bg-primary/10 text-primary">
                          <Save className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={handleSaveAll} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" title={t('saveAll')}>
                        <Save className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">{t('chatEmpty')}</p>
                </div>
              )}
              <AnimatePresence>
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    onClick={() => selectMode && toggleSelect(msg.id)}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      } ${selectMode ? 'cursor-pointer' : ''} ${
                        selectedMsgs.has(msg.id) ? 'ring-2 ring-primary ring-offset-2' : ''
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 border-t border-border px-3 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={isListening ? stopVoice : startVoice}
                  className={`p-2.5 rounded-xl transition-colors ${
                    isListening ? 'bg-destructive/20 text-destructive animate-pulse' : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                  placeholder={t('chatPlaceholder')}
                  className="flex-1 bg-muted rounded-xl px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect, useCallback, useRef } from 'react';
import { Note } from '@/types/task';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useNotifications } from './useNotifications';

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const { user, profile } = useAuth();
  const { sendNotification, playSound } = useNotifications();

  const loadNotes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setNotes(data.map((n: any) => ({
        id: n.id,
        content: n.content,
        reminderAt: n.reminder_at ? new Date(n.reminder_at) : undefined,
        completed: n.completed,
        createdAt: new Date(n.created_at),
        updatedAt: new Date(n.updated_at),
      })));
    }
  }, [user]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notes-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        loadNotes();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, loadNotes]);

  const addNote = useCallback(async () => {
    if (!user) return { id: '', content: '', createdAt: new Date(), updatedAt: new Date() } as Note;
    const { data, error } = await supabase.from('notes').insert({
      user_id: user.id,
      content: '',
      completed: false
    }).select('*').single();

    if (error) {
      console.error('Error inserting note:', error);
      throw error;
    }

    if (data) {
      const note: Note = {
        id: data.id,
        content: data.content,
        reminderAt: undefined,
        completed: false,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
      setNotes(prev => [note, ...prev]);
      return note;
    }
    return { id: '', content: '', createdAt: new Date(), updatedAt: new Date() } as Note;
  }, [user]);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n =>
      n.id === id ? { ...n, ...updates, updatedAt: new Date() } : n
    ));
    
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.reminderAt !== undefined) dbUpdates.reminder_at = updates.reminderAt?.toISOString() || null;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;

    await supabase.from('notes').update(dbUpdates).eq('id', id);
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    await supabase.from('notes').delete().eq('id', id);
  }, []);

  const hasActiveReminders = useCallback(() => {
    const now = new Date();
    return notes.some(n => 
      !n.completed && 
      n.reminderAt && 
      new Date(n.reminderAt) <= now
    );
  }, [notes]);

  const triggeredReminders = useRef<Set<string>>(new Set());

  // Check for reminders every 10 seconds for better precision
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const activeNotes = notes.filter(n => !n.completed && n.reminderAt);
      
      activeNotes.forEach(note => {
        const reminderTime = new Date(note.reminderAt!).getTime();
        const diff = now.getTime() - reminderTime;
        
        // If reminder time has reached and it wasn't triggered yet
        // We allow a 1-minute window to trigger it
        if (diff >= 0 && diff < 60000 && !triggeredReminders.current.has(note.id)) {
          triggeredReminders.current.add(note.id);
          
          const soundToPlay = profile?.notification_sound || 'bell';
          
          // Play sound directly to ensure it works even if notifications are blocked
          playSound(soundToPlay);
          
          // Also send system notification
          sendNotification('📝 Напоминание из заметок', {
            body: note.content || 'Пора проверить ваши заметки!',
            tag: `note-${note.id}`,
            sound: soundToPlay,
          });
        }
      });

      // Cleanup old triggered reminders from the set (older than 2 minutes)
      const nowMs = now.getTime();
      notes.forEach(note => {
        if (note.reminderAt) {
          const rTime = new Date(note.reminderAt).getTime();
          if (nowMs - rTime > 120000) {
            triggeredReminders.current.delete(note.id);
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 10000);
    checkReminders();
    return () => clearInterval(interval);
  }, [notes, sendNotification, playSound]);

  return { notes, addNote, updateNote, deleteNote, hasActiveReminders };
};

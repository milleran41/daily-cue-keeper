import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskFormData } from '@/types/task';
import { useNotifications } from './useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<Task[]>([]);
  const { sendNotification, playSound } = useNotifications();
  const { user, profile } = useAuth();
  const triggeredTasks = useRef<Set<string>>(new Set());

  // Load tasks from Supabase
  const loadTasks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('datetime', { ascending: true });

    if (error) {
      console.error('Error loading tasks:', error);
      return;
    }

    if (data) {
      console.log('Loaded tasks from DB:', data.length);
      setTasks(data.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description || undefined,
        datetime: new Date(t.datetime),
        repeatType: t.repeat_type,
        repeatInterval: t.repeat_interval || undefined,
        customReminders: t.custom_reminders || undefined,
        category: t.category,
        sound: t.sound,
        completed: t.completed,
        completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
        createdAt: new Date(t.created_at),
        updatedAt: new Date(t.updated_at),
      })));
    }
  }, [user]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('task_history')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });

    if (data) {
      setHistory(data.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description || undefined,
        datetime: new Date(t.datetime),
        repeatType: t.repeat_type,
        category: t.category,
        sound: t.sound,
        completed: true,
        completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
        createdAt: new Date(t.created_at),
        updatedAt: new Date(t.created_at),
      })));
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
    loadHistory();
  }, [loadTasks, loadHistory]);

  // Realtime subscription for tasks
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        loadTasks();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, loadTasks]);

  // Check for due tasks
  useEffect(() => {
    const check = () => {
      const now = new Date();
      tasks.forEach(task => {
        if (task.completed) return;
        
        const taskTime = new Date(task.datetime).getTime();
        const nowTime = now.getTime();
        const diff = nowTime - taskTime;
        
        // Trigger if current time is within 1 minute AFTER the task time
        if (diff >= 0 && diff < 60000 && !triggeredTasks.current.has(task.id)) {
          triggeredTasks.current.add(task.id);
          
          const soundToPlay = task.sound !== 'none' ? task.sound : (profile?.notification_sound || 'bell');
          
          // Play sound directly
          playSound(soundToPlay);
          
          sendNotification(task.name, {
            body: task.description || 'Время выполнить задачу!',
            tag: task.id,
            sound: soundToPlay,
          });
        }
      });
    };
    
    // Check more frequently (every 10 seconds)
    const interval = setInterval(check, 10000);
    check();
    return () => clearInterval(interval);
  }, [tasks, sendNotification, profile?.notification_sound, playSound]);

  const addTask = useCallback(async (data: TaskFormData) => {
    if (!user) throw new Error('Not authenticated');
    const [hours, minutes] = data.time.split(':');
    const datetime = new Date(`${data.date}T00:00:00`);
    datetime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    console.log('Inserting task for user:', user.id);
    const { data: inserted, error } = await supabase.from('tasks').insert({
      user_id: user.id,
      name: data.name,
      description: data.description || null,
      datetime: datetime.toISOString(),
      repeat_type: data.repeatType,
      repeat_interval: data.repeatInterval || null,
      custom_reminders: data.customReminders || null,
      category: data.category,
      sound: data.sound,
    }).select('*').single();

    if (error) {
      console.error('Error inserting task:', error);
      throw error;
    }

    console.log('Task inserted successfully:', inserted.id);
    await loadTasks();
    return inserted;
  }, [user, loadTasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    console.log('Updating task:', id);
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    
    if (updates.datetime !== undefined) {
      dbUpdates.datetime = updates.datetime instanceof Date ? updates.datetime.toISOString() : updates.datetime;
    }

    if (updates.repeatType !== undefined) dbUpdates.repeat_type = updates.repeatType;
    if (updates.repeatInterval !== undefined) dbUpdates.repeat_interval = updates.repeatInterval;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.sound !== undefined) dbUpdates.sound = updates.sound;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt instanceof Date ? updates.completedAt.toISOString() : updates.completedAt;

    const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating task:', error);
      throw error;
    }
    await loadTasks();
  }, [loadTasks]);

  const deleteTask = useCallback(async (id: string) => {
    console.log('Deleting task:', id);
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
    await loadTasks();
  }, [loadTasks]);

  const completeTask = useCallback(async (id: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Add to history
    const { error: histError } = await supabase.from('task_history').insert({
      user_id: user.id,
      name: task.name,
      description: task.description || null,
      datetime: task.datetime.toISOString(),
      repeat_type: task.repeatType,
      category: task.category,
      sound: task.sound,
      completed_at: new Date().toISOString(),
    });

    if (histError) {
      console.error('Error adding to history:', histError);
      throw histError;
    }

    // Handle repeating tasks
    if (task.repeatType !== 'none') {
      const next = new Date(task.datetime);
      switch (task.repeatType) {
        case 'daily': next.setDate(next.getDate() + 1); break;
        case 'every': {
          const hours = task.repeatInterval || 1;
          next.setHours(next.getHours() + hours);
          break;
        }
        case 'monthly': next.setMonth(next.getMonth() + 1); break;
        case 'custom': {
          if (task.customReminders && task.customReminders.length > 0) {
            for (const r of task.customReminders.filter(r => r.date && r.time)) {
              const [hours, minutes] = r.time.split(':');
              const nextDt = new Date(`${r.date}T00:00:00`);
              nextDt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

              const { error: customError } = await supabase.from('tasks').insert({
                user_id: user.id,
                name: task.name,
                description: task.description || null,
                datetime: nextDt.toISOString(),
                repeat_type: 'custom',
                category: task.category,
                sound: task.sound,
                custom_reminders: task.customReminders,
              });
              if (customError) throw customError;
            }
          }
          const { error: delError } = await supabase.from('tasks').delete().eq('id', id);
          if (delError) throw delError;
          await loadTasks();
          await loadHistory();
          return;
        }
      }
      // Create next occurrence
      const { error: nextError } = await supabase.from('tasks').insert({
        user_id: user.id,
        name: task.name,
        description: task.description || null,
        datetime: next.toISOString(),
        repeat_type: task.repeatType,
        repeat_interval: task.repeatInterval || null,
        category: task.category,
        sound: task.sound,
        custom_reminders: task.customReminders || null,
      });
      if (nextError) throw nextError;
    }

    const { error: finalDelError } = await supabase.from('tasks').delete().eq('id', id);
    if (finalDelError) throw finalDelError;
    await loadTasks();
    await loadHistory();
  }, [user, tasks, loadTasks, loadHistory]);

  const snoozeTask = useCallback(async (id: string, minutes: number) => {
    const newTime = new Date();
    newTime.setMinutes(newTime.getMinutes() + minutes);
    await supabase.from('tasks').update({
      datetime: newTime.toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    await loadTasks();
  }, [loadTasks]);

  const clearHistory = useCallback(async () => {
    if (!user) return;
    await supabase.from('task_history').delete().eq('user_id', user.id);
    setHistory([]);
  }, [user]);

  const getTodayTasks = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return tasks.filter(t => {
      // Create a date object from the task's datetime string
      const taskDate = new Date(t.datetime);
      
      // Use the date part in the local timezone for comparison
      const localTaskDate = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
      const localTodayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      return localTaskDate.getTime() === localTodayDate.getTime() && !t.completed;
    });
  }, [tasks]);

  const getTasksForDate = useCallback((date: Date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return tasks.filter(t => {
      const d = new Date(t.datetime);
      return d >= start && d < end;
    });
  }, [tasks]);

  return {
    tasks, history, addTask, updateTask, deleteTask,
    completeTask, snoozeTask, clearHistory, getTodayTasks, getTasksForDate,
  };
};

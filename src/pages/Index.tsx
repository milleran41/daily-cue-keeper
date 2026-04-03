import { useState, useCallback } from 'react';
import { formatLocalDate } from '@/lib/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav, TabId } from '@/components/BottomNav';
import { TodayView } from '@/components/TodayView';
import { CalendarView } from '@/components/CalendarView';
import { NotesView } from '@/components/NotesView';
import { SettingsView } from '@/components/SettingsView';
import { TaskFormDialog } from '@/components/TaskFormDialog';
import { SnoozeDialog } from '@/components/SnoozeDialog';
import { useTasks } from '@/hooks/useTasks';
import { useNotifications } from '@/hooks/useNotifications';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';
import { useNotes } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import { Task, TaskFormData } from '@/types/task';
import { Plus, ArrowLeft } from 'lucide-react';

const Index = () => {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const {
    tasks, history, addTask, updateTask, deleteTask,
    completeTask, snoozeTask, clearHistory, getTodayTasks, getTasksForDate,
  } = useTasks();
  const { notes, hasActiveReminders } = useNotes();
  const { requestPermission } = useNotifications();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [snoozeTask_, setSnoozeTask_] = useState<Task | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  const hasNoteAlert = hasActiveReminders();

  const handleSubmit = useCallback(async (data: TaskFormData) => {
    try {
      if (editingTask) {
        const [hours, minutes] = data.time.split(':');
        const datetime = new Date(`${data.date}T00:00:00`);
        datetime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        await updateTask(editingTask.id, {
          name: data.name,
          description: data.description,
          datetime,
          repeatType: data.repeatType,
          repeatInterval: data.repeatInterval,
          category: data.category,
          sound: data.sound,
        });
        toast({ title: t('taskUpdated'), description: data.name });
      } else {
        const newTask = await addTask(data);
        // We don't strictly need newTask here since loadTasks is called inside addTask
        toast({ title: t('taskCreated'), description: data.name });
      }
      setShowForm(false);
      setEditingTask(null);
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast({ 
        title: 'Error saving task', 
        description: error.message || 'Check your internet connection or database status',
        variant: 'destructive' 
      });
    }
  }, [editingTask, addTask, updateTask, toast, t]);

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const task = tasks.find(t => t.id === id);
      await deleteTask(id);
      toast({ title: t('taskDeleted'), description: task?.name, variant: 'destructive' });
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({ 
        title: 'Error deleting task', 
        description: error.message || 'Check your internet connection',
        variant: 'destructive' 
      });
    }
  }, [tasks, deleteTask, toast, t]);

  const handleComplete = useCallback(async (id: string) => {
    try {
      const task = tasks.find(t => t.id === id);
      await completeTask(id);
      toast({ title: '🎉 ' + t('taskCompleted'), description: task?.name });
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast({ 
        title: 'Error completing task', 
        description: error.message || 'Check your internet connection',
        variant: 'destructive' 
      });
    }
  }, [tasks, completeTask, toast, t]);

  const handleToggleNotifications = useCallback(async () => {
    try {
      const granted = await requestPermission();
      setNotificationsEnabled(granted);
      toast({
        title: t('enableNotifications'),
        description: granted ? t('notifGranted') : t('notifDenied'),
      });
    } catch (e) {
      toast({
        title: t('enableNotifications'),
        description: t('notifUnsupported'),
        variant: 'destructive',
      });
    }
  }, [requestPermission, toast, t]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getFormInitialData = (): Partial<TaskFormData> | undefined => {
    if (!editingTask) return undefined;
    const dt = new Date(editingTask.datetime);
    return {
      name: editingTask.name,
      description: editingTask.description || '',
      date: formatLocalDate(dt),
      time: dt.toTimeString().slice(0, 5),
      repeatType: editingTask.repeatType,
      repeatInterval: editingTask.repeatInterval,
      category: editingTask.category,
      sound: editingTask.sound,
    };
  };

  const tabContent: Record<TabId, React.ReactNode> = {
    today: (
      <TodayView
        tasks={tasks}
        onComplete={handleComplete}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSnooze={snoozeTask}
      />
    ),
    calendar: (
      <CalendarView
        tasks={tasks}
        notes={notes}
        getTasksForDate={getTasksForDate}
        onComplete={handleComplete}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSnooze={snoozeTask}
      />
    ),
    notes: <NotesView />,
    settings: (
      <SettingsView
        history={history}
        onClearHistory={clearHistory}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleToggleNotifications}
      />
    ),
  };

  return (
    <div className="min-h-screen bg-background pb-20 safe-top">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          {activeTab !== 'today' && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTab('today')}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </motion.button>
          )}
          <div className="flex-1">
            <h1
              className="text-2xl font-extrabold text-foreground cursor-pointer hover:text-primary transition-colors"
              onClick={() => setActiveTab('today')}
            >
              {t('appName')}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tasks.filter(t => !t.completed).length} {t(activeTab === 'today' ? 'today' : 'allTasks').toLowerCase()}
            </p>
          </div>
        </div>

        {activeTab !== 'settings' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingTask(null);
              setShowForm(true);
            }}
            className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg mb-6 hover:shadow-xl transition-shadow"
          >
            <Plus className="w-5 h-5" />
            {t('addTask')}
          </motion.button>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tabContent[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav active={activeTab} onChange={setActiveTab} hasNoteAlert={hasNoteAlert} />

      <AnimatePresence>
        {showForm && (
          <TaskFormDialog
            key="task-form-dialog"
            onClose={() => {
              setShowForm(false);
              setEditingTask(null);
            }}
            onSubmit={handleSubmit}
            initialData={getFormInitialData()}
          />
        )}
      </AnimatePresence>

      <SnoozeDialog
        open={!!snoozeTask_}
        taskName={snoozeTask_?.name || ''}
        onSnooze={(mins) => {
          if (snoozeTask_) {
            snoozeTask(snoozeTask_.id, mins);
            setSnoozeTask_(null);
          }
        }}
        onDismiss={() => setSnoozeTask_(null)}
      />
    </div>
  );
};

export default Index;

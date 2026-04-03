import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '@/types/task';
import { TaskCard } from './TaskCard';
import { useLanguage } from '@/hooks/useLanguage';
import { isPast, isToday } from 'date-fns';

interface TodayViewProps {
  tasks: Task[];
  onComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onSnooze?: (id: string, minutes: number) => void;
}

export const TodayView = ({ tasks, onComplete, onEdit, onDelete, onSnooze }: TodayViewProps) => {
  const { t } = useLanguage();

  const todayTasks = useMemo(() => {
    const now = new Date();
    return tasks
      .filter(task => !task.completed)
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }, [tasks]);

  const overdue = todayTasks.filter(t => isPast(new Date(t.datetime)));
  const todayOnly = todayTasks.filter(t => isToday(new Date(t.datetime)) && !isPast(new Date(t.datetime)));
  const upcoming = todayTasks.filter(t => !isToday(new Date(t.datetime)) && !isPast(new Date(t.datetime)));

  if (todayTasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="text-6xl mb-4">✨</div>
        <h3 className="text-xl font-bold text-foreground mb-1">{t('noTasksToday')}</h3>
        <p className="text-muted-foreground">{t('enjoyDay')}</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <Section title={`⚠️ ${t('overdue')}`} count={overdue.length}>
          {overdue.map(task => (
            <TaskCard key={task.id} task={task} onComplete={onComplete} onEdit={onEdit} onDelete={onDelete} onSnooze={onSnooze} />
          ))}
        </Section>
      )}

      {todayOnly.length > 0 && (
        <Section title={`📌 ${t('today')}`} count={todayOnly.length}>
          {todayOnly.map(task => (
            <TaskCard key={task.id} task={task} onComplete={onComplete} onEdit={onEdit} onDelete={onDelete} onSnooze={onSnooze} />
          ))}
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title={`📅 ${t('upcoming')}`} count={upcoming.length}>
          {upcoming.map(task => (
            <TaskCard key={task.id} task={task} onComplete={onComplete} onEdit={onEdit} onDelete={onDelete} onSnooze={onSnooze} />
          ))}
        </Section>
      )}
    </div>
  );
};

const Section = ({ title, count, children }: { title: string; count: number; children: React.ReactNode }) => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h2>
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
        {count}
      </span>
    </div>
    <AnimatePresence>
      <div className="space-y-3">{children}</div>
    </AnimatePresence>
  </div>
);

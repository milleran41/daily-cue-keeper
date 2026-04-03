import { useState, useRef, useEffect } from 'react';
import { Task, CATEGORY_COLORS } from '@/types/task';
import { useLanguage } from '@/hooks/useLanguage';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { CheckCircle, Clock, Edit, Trash2, AlertTriangle, Bell, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onSnooze?: (id: string, minutes: number) => void;
}

export const TaskCard = ({ task, onComplete, onEdit, onDelete, onSnooze }: TaskCardProps) => {
  const { t, language } = useLanguage();
  const locale = language === 'ru' ? ru : enUS;
  const taskDate = new Date(task.datetime);
  const overdue = isPast(taskDate) && !task.completed;
  const cat = CATEGORY_COLORS[task.category];
  const [showSnooze, setShowSnooze] = useState(false);
  const [isIntervalSnooze, setIsIntervalSnooze] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [customMinutes, setCustomMinutes] = useState('');
  const snoozeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSnooze) return;
    const handler = (e: MouseEvent) => {
      if (snoozeRef.current && !snoozeRef.current.contains(e.target as Node)) {
        setShowSnooze(false);
        setIsIntervalSnooze(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSnooze]);

  const handleCustomIntervalSnooze = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(customMinutes);
    if (!isNaN(mins) && mins > 0 && onSnooze) {
      onSnooze(task.id, mins);
      setShowSnooze(false);
      setIsIntervalSnooze(false);
      setCustomMinutes('');
    }
  };

  const dateLabel = isToday(taskDate)
    ? t('today')
    : isTomorrow(taskDate)
    ? t('tomorrow')
    : format(taskDate, 'dd MMM', { locale });

  const handleCustomSnooze = () => {
    if (!customDate || !customTime || !onSnooze) return;
    const [hours, minutes] = customTime.split(':');
    const target = new Date(`${customDate}T00:00:00`);
    target.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const now = new Date();
    const diffMin = Math.max(1, Math.round((target.getTime() - now.getTime()) / 60000));
    onSnooze(task.id, diffMin);
    setShowSnooze(false);
    setCustomDate('');
    setCustomTime('');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`relative rounded-2xl p-4 transition-all ${
        task.completed
          ? 'bg-muted/50 opacity-60'
          : overdue
          ? 'bg-destructive/5 border border-destructive/20'
          : 'bg-card border border-border shadow-sm hover:shadow-md'
      }`}
    >
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full`}
        style={{ backgroundColor: `hsl(var(--cat-${task.category}))` }}
      />

      <div className="pl-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-base leading-tight ${
              task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
            }`}>
              {task.name}
            </h3>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
            )}
          </div>
          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${cat.bg} ${cat.text}`}>
            {cat.emoji} {t(cat.labelKey as any)}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className={`flex items-center gap-1 ${overdue ? 'text-destructive font-semibold' : ''}`}>
            {overdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {dateLabel}, {format(taskDate, 'HH:mm')}
          </span>
          {task.repeatType !== 'none' && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              🔁 {task.repeatType}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!task.completed && (
            <button
              onClick={() => onComplete(task.id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-success/10 text-success text-xs font-bold hover:bg-success/20 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {t('complete')}
            </button>
          )}

          {!task.completed && onSnooze && (
            <div className="relative" ref={snoozeRef}>
              <button
                onClick={() => setShowSnooze(!showSnooze)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                {t('reminder').replace('⏰ ', '')}
                <ChevronDown className={`w-3 h-3 transition-transform ${showSnooze ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showSnooze && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-2xl shadow-lg p-2 min-w-[220px]"
                  >
                    {!isIntervalSnooze ? (
                      <>
                        <button
                          onClick={() => { onSnooze(task.id, 10); setShowSnooze(false); }}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-secondary transition-colors text-foreground"
                        >
                          {t('remindIn10')}
                        </button>
                        <button
                          onClick={() => { onSnooze(task.id, 30); setShowSnooze(false); }}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-secondary transition-colors text-foreground"
                        >
                          {t('remindIn30')}
                        </button>
                        <button
                          onClick={() => { onSnooze(task.id, 60); setShowSnooze(false); }}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-secondary transition-colors text-foreground"
                        >
                          {t('remindIn1h')}
                        </button>
                        <button
                          onClick={() => setIsIntervalSnooze(true)}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-primary hover:bg-primary/10 transition-colors"
                        >
                          {t('snoozeCustom')}
                        </button>
                        <div className="border-t border-border mt-1 pt-1">
                          <p className="px-3 py-1 text-xs text-muted-foreground font-semibold">{t('remindAt')}</p>
                          <div className="flex gap-1.5 px-2 py-1">
                            <Input
                              type="date"
                              value={customDate}
                              onChange={e => setCustomDate(e.target.value)}
                              className="h-8 text-xs rounded-lg bg-secondary/50 border-0 flex-1"
                            />
                            <Input
                              type="time"
                              step="60"
                              value={customTime}
                              onChange={e => setCustomTime(e.target.value)}
                              className="h-8 text-xs rounded-lg bg-secondary/50 border-0 w-20"
                            />
                          </div>
                          <button
                            onClick={handleCustomSnooze}
                            disabled={!customDate || !customTime}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                          >
                            {t('setReminder')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <form onSubmit={handleCustomIntervalSnooze} className="p-1 space-y-2">
                        <div className="flex items-center justify-between px-2">
                          <span className="text-xs font-bold text-foreground">{t('snoozeCustom')}</span>
                          <button
                            type="button"
                            onClick={() => setIsIntervalSnooze(false)}
                            className="p-1 hover:bg-secondary rounded-full"
                          >
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            autoFocus
                            placeholder={t('snoozeCustomPlaceholder')}
                            value={customMinutes}
                            onChange={e => setCustomMinutes(e.target.value)}
                            className="h-9 text-sm rounded-xl bg-secondary/50 border-0 flex-1 text-center font-bold"
                          />
                          <button
                            type="submit"
                            disabled={!customMinutes || isNaN(parseInt(customMinutes)) || parseInt(customMinutes) <= 0}
                            className="px-3 h-9 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50"
                          >
                            {t('save')}
                          </button>
                        </div>
                      </form>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={() => onEdit(task)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground text-xs"
          >
            <Edit className="w-3.5 h-3.5" />
            {t('edit')}
          </button>

          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 rounded-xl hover:bg-destructive/10 transition-colors text-destructive/70 ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

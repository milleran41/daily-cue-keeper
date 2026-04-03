import { useState, useMemo } from 'react';
import { Task, Note, CATEGORY_COLORS } from '@/types/task';
import { TaskCard } from './TaskCard';
import { useLanguage } from '@/hooks/useLanguage';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek, addMonths, subMonths, setYear, setMonth } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, FileText, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useNotes } from '@/hooks/useNotes';

interface CalendarViewProps {
  tasks: Task[];
  notes: Note[];
  getTasksForDate: (date: Date) => Task[];
  onComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onSnooze?: (id: string, minutes: number) => void;
}

export const CalendarView = ({ tasks, notes, getTasksForDate, onComplete, onEdit, onDelete, onSnooze }: CalendarViewProps) => {
  const { t, language } = useLanguage();
  const { updateNote, deleteNote } = useNotes();
  const locale = language === 'ru' ? ru : enUS;
  const [current, setCurrent] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekDays = [
    t('weekMon'), t('weekTue'), t('weekWed'), t('weekThu'), t('weekFri'), t('weekSat'), t('weekSun')
  ];

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(t => {
      const key = format(new Date(t.datetime), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [tasks]);

  const notesByDate = useMemo(() => {
    const map = new Map<string, Note[]>();
    notes.forEach(n => {
      if (n.reminderAt) {
        const key = format(new Date(n.reminderAt), 'yyyy-MM-dd');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(n);
      }
    });
    return map;
  }, [notes]);

  const selectedTasks = getTasksForDate(selectedDate);
  const selectedNotes = notesByDate.get(format(selectedDate, 'yyyy-MM-dd')) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrent(subMonths(current, 1))} className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-foreground capitalize">
            {format(current, 'LLLL', { locale })}
          </h2>
          <Select
            value={current.getFullYear().toString()}
            onValueChange={(val) => setCurrent(setYear(current, parseInt(val)))}
          >
            <SelectTrigger className="w-[80px] h-8 text-sm font-bold border-border rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <button onClick={() => setCurrent(addMonths(current, 1))} className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-muted-foreground uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate.get(key) || [];
          const dayNotes = notesByDate.get(key) || [];
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = day.getMonth() === current.getMonth();
          const isTodayDay = isToday(day);

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(day)}
              className={`relative flex flex-col items-center justify-center h-11 rounded-xl transition-all text-sm ${
                isSelected
                  ? 'bg-primary text-primary-foreground font-bold shadow-md'
                  : isTodayDay
                  ? 'bg-primary/10 text-primary font-bold'
                  : isCurrentMonth
                  ? 'text-foreground hover:bg-secondary'
                  : 'text-muted-foreground/40'
              }`}
            >
              {day.getDate()}
              <div className="flex gap-0.5 mt-0.5">
                {dayTasks.slice(0, 3).map((t, i) => (
                  <div
                    key={i}
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: `hsl(var(--cat-${t.category}))` }}
                  />
                ))}
                {dayNotes.length > 0 && (
                  <div className="w-1 h-1 rounded-full bg-blue-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        <h3 className="text-sm font-bold text-foreground mb-3">
          {format(selectedDate, 'd MMMM', { locale })}
          <span className="text-muted-foreground font-normal ml-2">
            {selectedTasks.length + selectedNotes.length} {t('tasks')}
          </span>
        </h3>
        <AnimatePresence>
          <div className="space-y-3">
            {selectedTasks.map(task => (
              <TaskCard key={task.id} task={task} onComplete={onComplete} onEdit={onEdit} onDelete={onDelete} onSnooze={onSnooze} />
            ))}
            {selectedNotes.map(note => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  "bg-card rounded-2xl border border-border p-4 shadow-sm transition-all flex items-start gap-3",
                  note.completed && "opacity-60 grayscale-[0.5]"
                )}
              >
                <button
                  onClick={() => updateNote(note.id, { completed: !note.completed })}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 shrink-0",
                    note.completed ? "bg-success border-success text-white" : "border-muted-foreground/30 hover:border-primary"
                  )}
                >
                  {note.completed && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {t('notes')} • {format(new Date(note.reminderAt!), 'HH:mm')}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="p-1 rounded-lg hover:bg-destructive/10 text-destructive/60 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className={cn(
                    "text-sm text-foreground leading-relaxed break-words",
                    note.completed && "line-through"
                  )}>
                    {note.content || t('writeHere')}
                  </p>
                </div>
              </motion.div>
            ))}
            {selectedTasks.length === 0 && selectedNotes.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">✨</p>
            )}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
};

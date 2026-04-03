import { useState, useRef, useEffect } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { useLanguage } from '@/hooks/useLanguage';
import { Plus, Trash2, Calendar, Clock, Check, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ru, enUS } from 'date-fns/locale';

export const NotesView = () => {
  const { notes, addNote, updateNote, deleteNote } = useNotes();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const handleAddNote = async () => {
    await addNote();
  };

  const handleSetReminder = (noteId: string, date?: Date, time?: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    let reminderAt: Date | undefined = undefined;
    if (date) {
      reminderAt = new Date(date);
      if (time) {
        const [hours, minutes] = time.split(':');
        reminderAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        // Default to current time or next hour if no time provided
        const now = new Date();
        reminderAt.setHours(now.getHours(), now.getMinutes(), 0, 0);
      }
    }

    updateNote(noteId, { reminderAt });
    if (reminderAt) {
      toast({ title: t('reminderSet') });
    } else {
      toast({ title: t('reminderRemoved') });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={handleAddNote}
          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('newNote')}
        </button>
      </div>

      <AnimatePresence>
        {notes.map(note => (
          <motion.div
            key={note.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className={cn(
              "bg-card rounded-2xl border border-border p-4 shadow-sm transition-all",
              note.completed && "opacity-60 grayscale-[0.5]"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateNote(note.id, { completed: !note.completed })}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    note.completed ? "bg-success border-success text-white" : "border-muted-foreground/30 hover:border-primary"
                  )}
                >
                  {note.completed && <Check className="w-3 h-3" />}
                </button>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {format(new Date(note.updatedAt), 'dd.MM.yyyy HH:mm')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "p-2 rounded-xl transition-colors",
                        note.reminderAt ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground/60"
                      )}
                    >
                      {note.reminderAt ? <Bell className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4 z-[80] rounded-2xl shadow-xl border-border bg-card" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{t('setReminder')}</span>
                        {note.reminderAt && (
                          <button
                            onClick={() => handleSetReminder(note.id, undefined)}
                            className="text-[10px] text-destructive font-bold hover:underline"
                          >
                            {t('delete')}
                          </button>
                        )}
                      </div>
                      <CalendarComponent
                        mode="single"
                        selected={note.reminderAt}
                        onSelect={(date) => date && handleSetReminder(note.id, date, note.reminderAt ? format(note.reminderAt, 'HH:mm') : format(new Date(), 'HH:mm'))}
                        className="rounded-xl border border-border/50"
                        locale={language === 'ru' ? ru : enUS}
                      />
                      <div className="flex items-center gap-2 bg-secondary/50 p-2 rounded-xl">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <input
                          type="time"
                          step="60"
                          value={note.reminderAt ? format(note.reminderAt, 'HH:mm') : format(new Date(), 'HH:mm')}
                          onChange={(e) => handleSetReminder(note.id, note.reminderAt || new Date(), e.target.value)}
                          className="bg-transparent text-sm outline-none flex-1"
                        />
                      </div>
                      {note.reminderAt && (
                        <p className="text-[10px] text-center text-primary font-medium">
                          {t('reminderSet')}: {format(note.reminderAt, 'd MMM, HH:mm', { locale: language === 'ru' ? ru : enUS })}
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="p-2 rounded-xl hover:bg-destructive/10 text-destructive/60 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <textarea
              value={note.content}
              onChange={e => updateNote(note.id, { content: e.target.value })}
              placeholder={t('writeHere')}
              className={cn(
                "w-full bg-transparent text-foreground text-sm resize-none outline-none min-h-[80px] leading-relaxed",
                note.completed && "line-through"
              )}
              rows={4}
            />
            {note.reminderAt && !note.completed && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg w-fit">
                <Bell className="w-3 h-3" />
                {format(note.reminderAt, 'd MMM, HH:mm', { locale: language === 'ru' ? ru : enUS })}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {notes.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-3">📝</div>
          <p className="text-sm">{t('writeHere')}</p>
        </div>
      )}
    </div>
  );
};

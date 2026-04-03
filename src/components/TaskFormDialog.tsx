import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/hooks/useLanguage';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  TaskFormData, TaskCategory, RepeatType, NotificationSound,
  CATEGORY_COLORS, REPEAT_OPTION_KEYS, SOUND_OPTION_KEYS
} from '@/types/task';
import { X, Save, Volume2, Loader2, Check, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { formatLocalDate } from '@/lib/dateUtils';
import { ru, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TaskFormDialogProps {
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  initialData?: Partial<TaskFormData>;
}

export const TaskFormDialog = ({ onClose, onSubmit, initialData }: TaskFormDialogProps) => {
  const { t, language } = useLanguage();
  const { playSound } = useNotifications();
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState<TaskFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    date: initialData?.date || formatLocalDate(new Date()),
    time: initialData?.time || new Date().toTimeString().slice(0, 5),
    repeatType: initialData?.repeatType || 'none',
    repeatInterval: initialData?.repeatInterval,
    customReminders: initialData?.customReminders || [],
    category: initialData?.category || 'personal',
    sound: initialData?.sound || profile?.notification_sound || 'bell',
  });

  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Initialize form only once on mount since component unmounts on close
  useEffect(() => {
    setForm({
      name: initialData?.name || '',
      description: initialData?.description || '',
      date: initialData?.date || formatLocalDate(new Date()),
      time: initialData?.time || new Date().toTimeString().slice(0, 5),
      repeatType: initialData?.repeatType || 'none',
      repeatInterval: initialData?.repeatInterval,
      customReminders: initialData?.customReminders || [],
      category: initialData?.category || 'personal',
      sound: initialData?.sound || profile?.notification_sound || 'bell',
    });
    setMissingFields([]);
  }, [initialData, profile?.notification_sound]);

  const set = (field: keyof TaskFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setMissingFields(prev => prev.filter(f => f !== field));
  };

  const handleSaveDefaultSound = async () => {
    await updateProfile({ notification_sound: form.sound });
    toast({ title: t('soundSaved') });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  };

  const fieldHighlight = (field: string) =>
    missingFields.includes(field)
      ? 'ring-2 ring-warning ring-offset-1 ring-offset-card animate-pulse'
      : '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">
            {initialData ? t('edit') : t('addTask')}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Error Message */}
        {missingFields.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mb-4 overflow-hidden"
          >
            <div className="p-3 rounded-2xl bg-warning/10 text-warning border border-warning/20 text-sm font-semibold">
              <span>{t('fillHighlightedFields')} </span>
              {missingFields.map((f, idx) => {
                const labels: Record<string, string> = { date: t('fieldDate'), time: t('fieldTime'), name: t('fieldName') };
                return (
                  <span key={f}>
                    {labels[f] || f}{idx < missingFields.length - 1 ? ', ' : ''}
                  </span>
                );
              })}
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-foreground">{t('taskName')} *</Label>
                <Input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder={t('taskName')}
                  className={`h-12 rounded-2xl bg-secondary/50 border-0 text-base ${fieldHighlight('name')}`}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-foreground">{t('taskDescription')}</Label>
                <Textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder={t('taskDescription')}
                  className="rounded-2xl bg-secondary/50 border-0 resize-none"
                  rows={2}
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-foreground">{t('selectDate')}</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={e => set('date', e.target.value)}
                    className={`h-12 rounded-2xl bg-secondary/50 border-0 ${fieldHighlight('date')}`}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-foreground">{t('selectTime')}</Label>
                  <Input
                    type="time"
                    step="60"
                    value={form.time}
                    onChange={e => set('time', e.target.value)}
                    className={`h-12 rounded-2xl bg-secondary/50 border-0 ${fieldHighlight('time')}`}
                    required
                  />
                </div>
              </div>

              {/* Repeat */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-foreground">{t('repeat')}</Label>
                <Select value={form.repeatType} onValueChange={v => set('repeatType', v as RepeatType)}>
                  <SelectTrigger className="h-12 rounded-2xl bg-secondary/50 border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(REPEAT_OPTION_KEYS) as [RepeatType, string][]).map(([key, labelKey]) => (
                      <SelectItem key={key} value={key}>{t(labelKey as any)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.repeatType === 'every' && (
                  <div className="mt-3 space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">{t('repeatEveryHours')}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.repeatInterval || ''}
                      onChange={e => set('repeatInterval', parseInt(e.target.value) || undefined)}
                      placeholder="2"
                      className="h-10 rounded-xl bg-secondary/50 border-0"
                    />
                  </div>
                )}
                {form.repeatType === 'custom' && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground font-semibold">
                      {t('customRemindersHint')}
                    </p>
                    {(form.customReminders || []).map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "h-10 rounded-xl bg-secondary/50 border-0 flex-1 text-sm justify-start font-normal",
                                !r.date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="w-4 h-4 mr-2 opacity-50" />
                              {r.date ? format(new Date(r.date + 'T00:00'), 'd MMM yyyy', { locale: language === 'ru' ? ru : enUS }) : t('selectDatePicker')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-[80]" align="start">
                            <Calendar
                              mode="single"
                              selected={r.date ? new Date(r.date + 'T00:00') : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  const updated = [...(form.customReminders || [])];
                                  updated[i] = { ...updated[i], date: format(date, 'yyyy-MM-dd') };
                                  set('customReminders', updated);
                                }
                              }}
                              fromYear={new Date().getFullYear()}
                              toYear={new Date().getFullYear() + 15}
                              captionLayout="dropdown-buttons"
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="time"
                          step="60"
                          value={r.time}
                          onChange={e => {
                            const updated = [...(form.customReminders || [])];
                            updated[i] = { ...updated[i], time: e.target.value };
                            set('customReminders', updated);
                          }}
                          className="h-10 rounded-xl bg-secondary/50 border-0 w-24 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (form.customReminders || []).filter((_, idx) => idx !== i);
                            set('customReminders', updated);
                          }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/70 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const reminders = [...(form.customReminders || []), { date: '', time: new Date().toTimeString().slice(0, 5) }];
                        set('customReminders', reminders);
                      }}
                      className="w-full h-10 rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-bold hover:bg-primary/5 transition-colors"
                    >
                      {t('addReminder')}
                    </button>
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-foreground">{t('category')}</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(CATEGORY_COLORS) as [TaskCategory, typeof CATEGORY_COLORS[TaskCategory]][]).map(
                    ([key, { bg, text, labelKey, emoji }]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => set('category', key)}
                        className={`px-3 py-2 rounded-2xl text-sm font-medium transition-all ${bg} ${text} ${
                          form.category === key
                            ? 'ring-2 ring-offset-2 ring-offset-card ring-current scale-105'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {emoji} {t(labelKey as any)}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Sound */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">{t('sound')}</Label>
                  <button
                    type="button"
                    onClick={handleSaveDefaultSound}
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    {t('saveAsDefault')}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(SOUND_OPTION_KEYS) as [NotificationSound, typeof SOUND_OPTION_KEYS[NotificationSound]][]).map(
                    ([key, { labelKey, emoji }]) => (
                      <div key={key} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => set('sound', key)}
                          className={`px-3 py-2 rounded-2xl text-sm font-medium transition-all bg-secondary/50 ${
                            form.sound === key
                              ? 'ring-2 ring-primary text-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {emoji} {t(labelKey as any)}
                        </button>
                        {key !== 'none' && (
                          <button
                            type="button"
                            onClick={() => playSound(key)}
                            className="p-1.5 rounded-full hover:bg-secondary/50 text-muted-foreground"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
              >
                <Save className="w-4 h-4 mr-2" />
                {t('save')}
              </Button>
            </form>
          </motion.div>
        </motion.div>
  );
};

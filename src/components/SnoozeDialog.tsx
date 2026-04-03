import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { X, Clock, Check } from 'lucide-react';

interface SnoozeDialogProps {
  open: boolean;
  taskName: string;
  onSnooze: (minutes: number) => void;
  onDismiss: () => void;
}

export const SnoozeDialog = ({ open, taskName, onSnooze, onDismiss }: SnoozeDialogProps) => {
  const { t } = useLanguage();
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const options = [
    { minutes: 5, label: t('snooze5') },
    { minutes: 10, label: t('snooze10') },
    { minutes: 30, label: t('snooze30') },
    { minutes: 60, label: t('snooze60') },
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const minutes = parseInt(customValue);
    if (!isNaN(minutes) && minutes > 0) {
      onSnooze(minutes);
      setIsCustom(false);
      setCustomValue('');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-background/80 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => {
            setIsCustom(false);
            onDismiss();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-2xl border border-border"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">{t('reminder')}</h3>
              </div>
              <button
                onClick={() => {
                  setIsCustom(false);
                  onDismiss();
                }}
                className="p-1.5 rounded-full hover:bg-secondary"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <p className="text-foreground font-semibold mb-5 text-center text-lg">{taskName}</p>

            {!isCustom ? (
              <div className="grid grid-cols-2 gap-2">
                {options.map(({ minutes, label }) => (
                  <button
                    key={minutes}
                    onClick={() => onSnooze(minutes)}
                    className="h-12 rounded-2xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-all hover:scale-[1.02]"
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => setIsCustom(true)}
                  className="h-12 col-span-2 rounded-2xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-all hover:scale-[1.02]"
                >
                  {t('snoozeCustom')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleCustomSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type="number"
                    autoFocus
                    value={customValue}
                    onChange={e => setCustomValue(e.target.value)}
                    placeholder={t('snoozeCustomPlaceholder')}
                    className="w-full h-12 px-4 rounded-2xl bg-secondary/50 border-2 border-primary/20 focus:border-primary focus:outline-none text-foreground font-bold text-center"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCustom(false)}
                    className="flex-1 h-12 rounded-2xl bg-secondary text-muted-foreground font-bold text-sm hover:bg-secondary/80 transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={!customValue || isNaN(parseInt(customValue)) || parseInt(customValue) <= 0}
                    className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {t('save')}
                  </button>
                </div>
              </form>
            )}

            {!isCustom && (
              <button
                onClick={onDismiss}
                className="w-full mt-3 h-10 rounded-2xl text-muted-foreground text-sm font-medium hover:bg-secondary transition-colors"
              >
                {t('dismiss')}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


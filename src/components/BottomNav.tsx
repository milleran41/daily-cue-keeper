import { motion } from 'framer-motion';
import { Calendar, FileText, Settings, Sun } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

export type TabId = 'today' | 'calendar' | 'notes' | 'settings';

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  hasNoteAlert?: boolean;
}

const tabs: { id: TabId; icon: typeof Sun; labelKey: string }[] = [
  { id: 'today', icon: Sun, labelKey: 'today' },
  { id: 'calendar', icon: Calendar, labelKey: 'calendar' },
  { id: 'notes', icon: FileText, labelKey: 'notes' },
  { id: 'settings', icon: Settings, labelKey: 'settings' },
];

export const BottomNav = ({ active, onChange, hasNoteAlert }: BottomNavProps) => {
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {tabs.map(({ id, icon: Icon, labelKey }) => {
          const isActive = active === id;
          const isNotes = id === 'notes';
          const showAlert = isNotes && hasNoteAlert && !isActive;

          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={cn(
                "relative flex flex-col items-center justify-center w-16 h-full gap-0.5 transition-all",
                showAlert && "animate-pulse"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-0.5 w-8 h-1 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <div className="relative">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-primary" : showAlert ? "text-destructive" : "text-muted-foreground"
                  )}
                />
                {showAlert && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full"
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold transition-colors",
                  isActive ? "text-primary" : showAlert ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {t(labelKey as any)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

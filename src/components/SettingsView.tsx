import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme, ThemeMode } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { Task, NotificationSound } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Bell, Globe, Moon, Sun, Sunset, Trash2, Clock, History, LogOut, Volume2, Download, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SettingsViewProps {
  history: Task[];
  onClearHistory: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
}

export const SettingsView = ({
  history,
  onClearHistory,
  notificationsEnabled,
  onToggleNotifications,
}: SettingsViewProps) => {
  const { t, language, setLanguage } = useLanguage();
  const { mode, setMode } = useTheme();
  const { user, profile, updateProfile, signOut } = useAuth();
  const { playSound } = useNotifications();
  const [cleanupDays, setCleanupDays] = useState(
    localStorage.getItem('history_cleanup_days') || '30'
  );
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
  };

  const soundOptions: { value: NotificationSound; labelKey: string }[] = [
    { value: 'bell', labelKey: 'soundBell' },
    { value: 'alarm', labelKey: 'soundAlarm' },
    { value: 'gentle', labelKey: 'soundGentle' },
    { value: 'none', labelKey: 'soundNone' },
  ];

  const handleSoundChange = async (sound: NotificationSound) => {
    await playSound(sound);
    await updateProfile({ notification_sound: sound });
  };

  const handleCleanupChange = (val: string) => {
    setCleanupDays(val);
    localStorage.setItem('history_cleanup_days', val);
  };

  const handleResetApp = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } finally {
      window.location.reload();
    }
  };

  const themeOptions: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: t('themeLight') },
    { value: 'dark', icon: Moon, label: t('themeDark') },
    { value: 'auto', icon: Sunset, label: t('themeAuto') },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Installation Guide / Button */}
      {!isInstalled && (
        <SettingsSection icon={Download} title={t('installApp')}>
          <Accordion type="single" collapsible className="w-full border-none">
            <AccordionItem value="install" className="border-none">
              <AccordionTrigger className="py-2 hover:no-underline text-xs font-semibold text-primary">
                {deferredPrompt ? t('installApp') : t('installApp')}
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {deferredPrompt 
                      ? t('installAppDesc') 
                      : language === 'ru' 
                        ? 'Чтобы установить приложение: нажмите на три точки в браузере и выберите "Установить приложение" или "Добавить на главный экран".'
                        : 'To install the app: tap the three dots in your browser and select "Install app" or "Add to home screen".'
                    }
                  </p>
                  {deferredPrompt && (
                    <Button
                      onClick={handleInstall}
                      className="w-full rounded-2xl bg-primary text-primary-foreground font-bold shadow-md hover:shadow-lg transition-all"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('installApp')}
                    </Button>
                  )}
                  {!deferredPrompt && (
                    <div className="p-3 bg-secondary/50 rounded-xl border border-border/50">
                      <p className="text-[10px] text-muted-foreground italic">
                        {language === 'ru' 
                          ? '💡 Кнопка появится, когда браузер подтвердит готовность. Попробуйте обновить страницу или зайти через http://localhost:8080/' 
                          : '💡 Button will appear once the browser is ready. Try refreshing or using http://localhost:8080/'}
                      </p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </SettingsSection>
      )}

      {/* Account */}
      <SettingsSection icon={LogOut} title={user?.email || ''}>
        <Button
          onClick={signOut}
          variant="outline"
          className="w-full rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t('logout')}
        </Button>
      </SettingsSection>

      <SettingsSection icon={Volume2} title={t('sound')}>
        <div className="grid grid-cols-2 gap-2">
          {soundOptions.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => handleSoundChange(value)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                (profile?.notification_sound || 'bell') === value
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{t(labelKey as any)}</span>
              {value !== 'none' && <Volume2 className="w-3.5 h-3.5 opacity-50" />}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection icon={Bell} title={t('enableNotifications')}>
        <div className="space-y-3">
          <button
            onClick={onToggleNotifications}
            className={`w-full px-4 py-2 rounded-2xl text-sm font-bold transition-all ${
              notificationsEnabled
                ? 'bg-success/15 text-success'
                : 'bg-destructive/15 text-destructive'
            }`}
          >
            {notificationsEnabled ? t('notifEnabled') : t('notifDisabled')}
          </button>
          
          {!notificationsEnabled && Notification.permission === 'denied' && (
            <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20">
              <p className="text-[11px] text-destructive leading-relaxed">
                {language === 'ru' 
                  ? '⚠️ Уведомления заблокированы в браузере. Чтобы их включить: нажмите на иконку "Замок" слева от адреса сайта и разрешите "Уведомления".'
                  : '⚠️ Notifications are blocked in your browser. To enable: click the "Lock" icon next to the URL and allow "Notifications".'}
              </p>
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection icon={Trash2} title={language === 'ru' ? 'Диагностика' : 'Troubleshooting'}>
        <div className="space-y-3">
          <div className="p-3 bg-secondary/50 rounded-xl border border-border/50">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {language === 'ru'
                ? 'Если в Chrome задачи не сохраняются, чаще всего мешают расширения (например, Browser Control/переводчик). Попробуйте инкогнито или отключите расширения.'
                : 'If tasks do not save in Chrome, browser extensions often interfere. Try incognito or disable extensions.'}
            </p>
          </div>
          <Button
            onClick={handleResetApp}
            variant="outline"
            className="w-full rounded-2xl"
          >
            {language === 'ru' ? 'Сбросить кэш и перезагрузить' : 'Reset cache and reload'}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection icon={Sun} title={t('theme')}>
        <div className="flex gap-2">
          {themeOptions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-semibold transition-all ${
                mode === value
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection icon={Globe} title={t('language')}>
        <div className="flex flex-wrap gap-2">
          {[
            { code: 'ru' as const, label: '🇷🇺 Русский' },
            { code: 'en' as const, label: '🇬🇧 English' },
            { code: 'es' as const, label: '🇪🇸 Español' },
            { code: 'fr' as const, label: '🇫🇷 Français' },
            { code: 'de' as const, label: '🇩🇪 Deutsch' },
            { code: 'zh' as const, label: '🇨🇳 中文' },
            { code: 'ja' as const, label: '🇯🇵 日本語' },
            { code: 'ar' as const, label: '🇸🇦 العربية' },
            { code: 'pt' as const, label: '🇵🇹 Português' },
            { code: 'hi' as const, label: '🇮🇳 हिन्दी' },
          ].map(({ code, label }) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              className={`px-3 py-2 rounded-2xl text-sm font-semibold transition-all ${
                language === code
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection icon={Clock} title={t('autoCleanup')}>
        <div className="flex gap-2">
          {['7', '30', '90'].map(d => (
            <button
              key={d}
              onClick={() => handleCleanupChange(d)}
              className={`px-3 py-2 rounded-2xl text-sm font-semibold transition-all ${
                cleanupDays === d
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(`days${d}` as any)}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection icon={History} title={`${t('history')} (${history.length})`}>
        <div className="space-y-3 w-full">
          {history.length > 0 && (
            <>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {history.slice(0, 20).map(task => (
                  <div key={task.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary/50 text-sm">
                    <span className="text-foreground font-medium truncate">{task.name}</span>
                    <span className="text-muted-foreground text-xs ml-2 whitespace-nowrap">
                      {task.completedAt ? format(new Date(task.completedAt), 'dd.MM HH:mm') : ''}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                onClick={onClearHistory}
                variant="outline"
                className="w-full rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('clearHistory')}
              </Button>
            </>
          )}
          {history.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('historyEmpty')}</p>
          )}
        </div>
      </SettingsSection>
    </div>
  );
};

const SettingsSection = ({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Sun;
  title: string;
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-card rounded-2xl border border-border p-4 shadow-sm"
  >
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
    </div>
    {children}
  </motion.div>
);

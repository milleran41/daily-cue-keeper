export type TaskCategory = 'health' | 'work' | 'personal' | 'urgent' | 'medicine' | 'birthday';

export type RepeatType = 'none' | 'daily' | 'monthly' | 'custom' | 'every';

export type NotificationSound = 'bell' | 'alarm' | 'gentle' | 'none';

export interface Task {
  id: string;
  name: string;
  description?: string;
  datetime: Date;
  repeatType: RepeatType;
  repeatInterval?: number;
  customReminders?: { date: string; time: string }[];
  category: TaskCategory;
  sound: NotificationSound;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskFormData {
  name: string;
  description: string;
  date: string;
  time: string;
  repeatType: RepeatType;
  repeatInterval?: number;
  customReminders?: { date: string; time: string }[];
  category: TaskCategory;
  sound: NotificationSound;
}

export interface Note {
  id: string;
  content: string;
  reminderAt?: Date;
  completed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Static style info only — labels come from translations
export const CATEGORY_COLORS: Record<TaskCategory, { bg: string; text: string; emoji: string; labelKey: string }> = {
  health: { bg: 'bg-emerald-500/15', text: 'text-emerald-500', emoji: '💚', labelKey: 'catHealth' },
  work: { bg: 'bg-blue-500/15', text: 'text-blue-500', emoji: '💼', labelKey: 'catWork' },
  personal: { bg: 'bg-amber-500/15', text: 'text-amber-500', emoji: '⭐', labelKey: 'catPersonal' },
  urgent: { bg: 'bg-red-500/15', text: 'text-red-500', emoji: '🔴', labelKey: 'catUrgent' },
  medicine: { bg: 'bg-purple-500/15', text: 'text-purple-500', emoji: '💊', labelKey: 'catMedicine' },
  birthday: { bg: 'bg-pink-500/15', text: 'text-pink-500', emoji: '🎂', labelKey: 'catBirthday' },
};

export const REPEAT_OPTION_KEYS: Record<RepeatType, string> = {
  none: 'repeatNone',
  daily: 'repeatDaily',
  every: 'repeatEvery',
  monthly: 'repeatMonthly',
  custom: 'repeatCustom',
};

export const SOUND_OPTION_KEYS: Record<NotificationSound, { emoji: string; labelKey: string }> = {
  bell: { emoji: '🔔', labelKey: 'soundBell' },
  alarm: { emoji: '⏰', labelKey: 'soundAlarm' },
  gentle: { emoji: '🎵', labelKey: 'soundGentle' },
  none: { emoji: '🔇', labelKey: 'soundNone' },
};

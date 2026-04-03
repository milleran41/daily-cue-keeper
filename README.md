# ChimeUp — Напоминания

Кроссплатформенное приложение для управления напоминаниями с поддержкой PWA, Android и синхронизацией данных.

## Стек технологий

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Lovable Cloud (Supabase)
- **Mobile:** Capacitor (Android)
- **PWA:** vite-plugin-pwa

## Быстрый старт

```bash
# 1. Клонируйте репозиторий
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2. Установите зависимости
npm install

# 3. Создайте .env на основе .env.example и заполните переменные
cp .env.example .env

# 4. Запустите dev-сервер
npm run dev
```

Приложение откроется на `http://localhost:8080`

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск dev-сервера |
| `npm run build` | Production сборка |
| `npm run preview` | Превью production сборки |
| `npm run android` | Синхронизация и открытие Android проекта |

## PWA (Progressive Web App)

Приложение полностью поддерживает установку как PWA:

1. Откройте приложение в Chrome/Safari
2. **Android:** Меню → «Добавить на главный экран»
3. **iOS:** Поделиться → «На экран "Домой"»
4. **Desktop:** Иконка установки в адресной строке

Функции PWA:
- ✅ Установка на домашний экран
- ✅ Standalone режим (без панели браузера)
- ✅ Иконки приложения (192x192, 512x512)
- ✅ Кэширование ресурсов через Service Worker

## Сборка Android

### Предварительные требования

- Node.js 18+
- Android Studio
- JDK 17+

### Шаги сборки

```bash
# 1. Установите зависимости
npm install

# 2. Добавьте платформу Android (один раз)
npx cap add android

# 3. Соберите и синхронизируйте
npm run build
npx cap sync

# 4. Откройте в Android Studio
npx cap open android
```

Или используйте одну команду:
```bash
npm run android
```

### Запуск на устройстве
```bash
npx cap run android
```

## Синхронизация данных

Данные синхронизируются через Lovable Cloud:

- **Задачи** — realtime синхронизация между устройствами
- **Заметки** — realtime синхронизация между устройствами
- **История** — хранение выполненных задач

При входе в аккаунт на другом устройстве все данные появляются автоматически.

## Аутентификация

Поддерживается:
- 📧 Email + пароль
- 🔑 Google OAuth (автоматически через Lovable Cloud)

## Структура проекта

```
├── public/              # Статические файлы, иконки PWA
├── src/
│   ├── components/      # React компоненты
│   ├── hooks/           # Кастомные хуки
│   ├── integrations/    # Supabase клиент
│   ├── pages/           # Страницы (Index, Auth)
│   ├── types/           # TypeScript типы
│   └── lib/             # Утилиты
├── supabase/
│   └── functions/       # Edge Functions
├── capacitor.config.ts  # Настройки Capacitor
├── vite.config.ts       # Настройки Vite + PWA
└── tailwind.config.ts   # Настройки Tailwind
```

## Развертывание

Откройте [Lovable](https://lovable.dev/projects/f8644f31-9a82-4e39-a41e-cc41b9941e82) и нажмите Share → Publish.

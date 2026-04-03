import { useState, useCallback, useRef } from 'react';
import { TaskFormData, TaskCategory, RepeatType } from '@/types/task';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export const useVoiceInput = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return { error: 'Speech recognition not supported' };
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    return new Promise<string>((resolve, reject) => {
      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscript || interim);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (finalTranscript) {
          resolve(finalTranscript);
        } else {
          reject(new Error('Не удалось распознать речь'));
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        reject(new Error(`Ошибка: ${event.error}`));
      };

      setIsListening(true);
      setTranscript('');
      recognition.start();
    });
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const parseWithGemini = useCallback(async (text: string): Promise<Partial<TaskFormData> & { missingFields?: string[] }> => {
    setIsProcessing(true);
    try {
      const now = new Date();
      const { formatLocalDate } = await import('@/lib/dateUtils');
      const todayStr = formatLocalDate(now);
      const tomorrowDate = new Date(now);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = formatLocalDate(tomorrowDate);

      const prompt = `Ты — парсер голосовых команд для приложения-ежедневника. Разбери голосовую команду пользователя и верни JSON.

Сегодня: ${todayStr}, сейчас: ${now.toTimeString().slice(0, 5)}
Завтра: ${tomorrowStr}

Голосовая команда: "${text}"

Верни ТОЛЬКО валидный JSON (без markdown) со следующими полями:
{
  "name": "название задачи (строка, обязательно)",
  "description": "описание если есть (строка или пустая строка)",
  "date": "дата в формате YYYY-MM-DD (если не указана, оставь null)",
  "time": "время в формате HH:MM (если не указано, оставь null)",
  "repeatType": "none|daily|weekly|monthly|hourly|custom (если не указано повторение, ставь none)",
  "category": "health|work|personal|urgent|medicine (определи по контексту: лекарства/таблетки=medicine, работа/офис=work, срочно/важно=urgent, здоровье/спорт=health, остальное=personal)",
  "missingFields": ["массив незаполненных обязательных полей: date, time"]
}

Примеры:
"Напомни завтра в 8 утра принять таблетки" → {"name":"Принять таблетки","description":"","date":"${tomorrowStr}","time":"08:00","repeatType":"none","category":"medicine","missingFields":[]}
"Каждый день в 9 совещание" → {"name":"Совещание","description":"","date":"${todayStr}","time":"09:00","repeatType":"daily","category":"work","missingFields":[]}
"Купить продукты" → {"name":"Купить продукты","description":"","date":null,"time":null,"repeatType":"none","category":"personal","missingFields":["date","time"]}`;

      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Не удалось разобрать ответ AI');

      const parsed = JSON.parse(jsonMatch[0]);

      const result: Partial<TaskFormData> & { missingFields?: string[] } = {
        name: parsed.name || text,
        description: parsed.description || '',
        category: parsed.category || 'personal',
        repeatType: parsed.repeatType || 'none',
        missingFields: [],
      };

      if (parsed.date) {
        result.date = parsed.date;
      } else {
        result.missingFields!.push('date');
      }

      if (parsed.time) {
        result.time = parsed.time;
      } else {
        result.missingFields!.push('time');
      }

      return result;
    } catch (error) {
      console.error('Gemini parse error:', error);
      return {
        name: text,
        description: '',
        category: 'personal' as TaskCategory,
        repeatType: 'none' as RepeatType,
        missingFields: ['date', 'time'],
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { isListening, isProcessing, transcript, startListening, stopListening, parseWithGemini };
};

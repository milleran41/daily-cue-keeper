import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=" + GEMINI_API_KEY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `System context: Ты — умный помощник в приложении-ежедневнике. Сегодня: ${new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Текущее время (UTC): ${new Date().toISOString().slice(11, 16)}. Отвечай кратко и по делу. Помогай с планированием, заметками, идеями и любыми вопросами. Можешь отвечать на русском и английском в зависимости от языка пользователя.` }]
          },
          ...messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }))
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini API error:", response.status, t);
      return new Response(JSON.stringify({ error: "Ошибка AI: " + response.status }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Gemini SSE to the format expected by the frontend
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (content) {
                const payload = JSON.stringify({
                  choices: [{ delta: { content } }]
                });
                controller.enqueue(new TextEncoder().encode(`data: ${payload}\n\n`));
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
      }
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

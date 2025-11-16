import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { threadId, message } = req.body;
    console.log("📬 [create-run] Входящий запрос:", { threadId, message });

    // 1. Проверка на threadId
    if (!threadId) {
      return res.status(400).json({ error: "threadId обязателен" });
    }

    console.log("📌 Используем существующий thread:", threadId);

    // 2. Добавляем сообщение в существующий thread
    const messageAdded = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });
    console.log("✉️ Сообщение добавлено:", messageAdded.id);

    // 3. Запускаем ассистента
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.ASSISTANT_ID,
    });
    console.log("🤖 Run запущен:", run.id);

    // 4. Возвращаем runId
    res.status(200).json({
      runId: run.id,
      threadId: threadId,
    });
  } catch (error) {
    console.error("❌ Ошибка в create-run:", error);
    res.status(500).json({ error: error.message });
  }
}
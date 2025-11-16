import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { message, threadId } = req.body;

    console.log("📬 [create-run] Входящий запрос:", { message, threadId });

    // 1. Создаём thread, если не был передан
    let threadIdFinal = threadId;
    if (!threadIdFinal) {
      const thread = await openai.beta.threads.create();
      threadIdFinal = thread.id;
      console.log("🧵 Новый thread создан:", threadIdFinal);
    } else {
      console.log("📌 Используем существующий thread:", threadIdFinal);
    }

    // 2. Добавляем сообщение
    const userMessage = await openai.beta.threads.messages.create(threadIdFinal, {
      role: "user",
      content: message,
    });
    console.log("✉️ Сообщение добавлено:", userMessage.id);

    // 3. Запускаем ассистента
    const run = await openai.beta.threads.runs.create(threadIdFinal, {
      assistant_id: process.env.ASSISTANT_ID,
    });
    console.log("🤖 Run запущен:", run.id);

    res.status(200).json({
      threadId: threadIdFinal,
      runId: run.id,
      status: run.status,
    });
  } catch (error) {
    console.error("❌ Ошибка в create-run:", error);
    res.status(500).json({ error: error.message });
  }
}
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { threadId, message } = req.body;
    console.log("📬 [chat-assistant] Входящий запрос:", { threadId, message });

    // 1. Получаем или создаём thread
    const thread =
      threadId && threadId.startsWith("thread_")
        ? { id: threadId }
        : await openai.beta.threads.create();

    console.log("📌 Используем thread:", thread.id);

    // 2. Добавляем сообщение
    const msg = await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    console.log("✉️ Сообщение добавлено:", msg.id);

    // 3. Запускаем run
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    console.log("🤖 Run запущен:", run.id);

    // 4. Ждём завершения
    let runStatus;
    const maxAttempts = 30;
    let attempt = 0;

    while (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1500));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log(`⏱️ Попытка ${attempt + 1}: статус =`, runStatus.status);

      if (runStatus.status === "completed") break;
      if (["failed", "cancelled", "expired"].includes(runStatus.status)) {
        throw new Error(`Run status is "${runStatus.status}"`);
      }

      attempt++;
    }

    if (runStatus.status !== "completed") {
      throw new Error("Run did not complete in time.");
    }

    // 5. Получаем результат
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessages = messages.data.filter((m) => m.role === "assistant");

    console.log(`📨 Получено сообщений ассистента: ${assistantMessages.length}`);

    res.status(200).json({
      threadId: thread.id,
      messages: assistantMessages.map((m) => m.content?.[0]?.text?.value ?? ""),
    });
  } catch (error) {
    console.error("❌ Ошибка в chat-assistant:", error);
    res.status(500).json({ error: error.message });
  }
}
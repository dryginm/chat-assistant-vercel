export default async function handler(req, res) {
  try {
    const { threadId, message } = req.body;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const ASSISTANT_ID = process.env.ASSISTANT_ID;

    const openai = require("openai");
    openai.apiKey = OPENAI_API_KEY;

    const client = new openai.OpenAI({ apiKey: OPENAI_API_KEY });

    // 1. Создаём тред или используем переданный
    const thread = threadId
      ? { id: threadId }
      : await client.beta.threads.create();

    // 2. Добавляем сообщение пользователя
    await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    // 3. Запускаем обработку ассистентом
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    // 4. Ждём завершения
    let runStatus = null;
    let attempts = 0;

    while (attempts < 8) {
      await new Promise((r) => setTimeout(r, 1000));
      runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
      if (runStatus.status === "completed") break;
      attempts++;
    }

    if (runStatus.status !== "completed") {
      return res.status(408).json({ error: "Timeout waiting for assistant" });
    }

    // 5. Получаем шаги и ищем ответ ассистента
    const steps = await client.beta.threads.runs.steps.list(thread.id, run.id);

    const assistantMessage = steps.data.find(
      (step) => step.type === "message_creation"
    )?.step_details?.message_creation?.message?.content[0]?.text?.value;

    res.status(200).json({
      result: assistantMessage,
      runId: run.id,
      threadId: thread.id,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
}
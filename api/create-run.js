// /api/create-run.js

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    const { threadId, message } = req.body;
    console.log("📬 [create-run] Входящий запрос:", { message, threadId });

    const threadIdFinal = threadId || (await openai.beta.threads.create()).id;
    console.log("📌 Используем thread:", threadIdFinal);

    const messageResponse = await openai.beta.threads.messages.create(threadIdFinal, {
      role: "user",
      content: message,
    });
    console.log("✉️ Сообщение добавлено:", messageResponse.id);

    const run = await openai.beta.threads.runs.create(threadIdFinal, {
      assistant_id: process.env.ASSISTANT_ID,
    });
    console.log("🤖 Run запущен:", run.id);

    res.status(200).json({ threadId: threadIdFinal, runId: run.id });
  } catch (error) {
    console.error("❌ Ошибка в create-run:", error);
    res.status(500).json({ error: error.message });
  }
}
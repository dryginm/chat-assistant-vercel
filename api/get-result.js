// /api/get-result.js

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    const { threadId } = req.body;
    console.log("📨 [get-result] Получение ответов из thread:", threadId);

    const messages = await openai.beta.threads.messages.list(threadId);
    const last = messages.data?.[0]?.content?.[0]?.text?.value || "Ответ не найден";

    console.log("📤 Ответ ассистента:", last);

    res.status(200).json({ message: last });
  } catch (error) {
    console.error("❌ Ошибка в get-result:", error);
    res.status(500).json({ error: error.message });
  }
}
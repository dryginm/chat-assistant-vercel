import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { threadId, runId } = req.body;
    console.log("🔍 [check-run] Проверка статуса run:", { threadId, runId });

    const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    console.log("📊 Статус run:", runStatus.status);

    res.status(200).json({ status: runStatus.status });
  } catch (error) {
    console.error("❌ Ошибка в check-run:", error);
    res.status(500).json({ error: error.message });
  }
}
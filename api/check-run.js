import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { threadId, runId } = req.body;

    console.log("🔍 [check-run] Проверка статуса run:", { threadId, runId });

    // ✅ Валидация входных данных
    if (!threadId || typeof threadId !== "string" || !threadId.startsWith("thread_")) {
      throw new Error(`❗ Invalid or missing threadId: ${threadId}`);
    }

    if (!runId || typeof runId !== "string" || !runId.startsWith("run_")) {
      throw new Error(`❗ Invalid or missing runId: ${runId}`);
    }

    // 📥 Запрос к OpenAI
    const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    console.log("📊 Статус run:", runStatus.status);

    res.status(200).json({ status: runStatus.status });
  } catch (error) {
    console.error("❌ Ошибка в check-run:", error);
    res.status(500).json({ error: error.message });
  }
}
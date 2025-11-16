import { config } from "dotenv";
config();
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { threadId, runId } = req.body;
  console.log("🔍 [check-run] Проверка статуса run:", { threadId, runId });

  if (!threadId || !runId) {
    return res.status(400).json({ error: "threadId и runId обязательны" });
  }

  try {
    let runStatus;
    const maxAttempts = 20;
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const run = await openai.beta.threads.runs.retrieve(threadId, runId);
      runStatus = run.status;

      console.log(`📊 Попытка ${attempt}: статус run = ${runStatus}`);

      if (["completed", "failed", "cancelled"].includes(runStatus)) {
        return res.status(200).json({ status: runStatus });
      }

      // ⏱ Ждём перед следующей проверкой
      await delay(10_000);
    }

    // ⏳ Превышено количество попыток
    return res.status(202).json({
      status: "timeout",
      message: "Ожидание завершения run превысило лимит"
    });

  } catch (error) {
    console.error("❌ Ошибка в check-run:", error);
    return res.status(500).json({ error: error.message });
  }
}
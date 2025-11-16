// /api/check-run.js

export default async function handler(req, res) {
  try {
    const { threadId, runId } = req.body;
    console.log("🔍 [check-run] Проверка статуса run:", { threadId, runId });

    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("📊 Статус run:", data.status);

    res.status(200).json({ status: data.status });
  } catch (error) {
    console.error("❌ Ошибка в check-run:", error);
    res.status(500).json({ error: error.message });
  }
}
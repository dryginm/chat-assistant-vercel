export default async function handler(req, res) {
  const { threadId, runId } = req.body;
  console.log("🔍 [check-run] Проверка статуса run:", { threadId, runId });

  if (!threadId || !runId) {
    return res.status(400).json({ error: "Missing threadId or runId" });
  }

  const headers = {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    "OpenAI-Beta": "assistants=v2",
    "Content-Type": "application/json",
  };

  const fetchRunStatus = async () => {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const data = await response.json();
    return data.status;
  };

  try {
    let status = "queued";
    let attempts = 0;
    const maxAttempts = 20;
    const delay = 10000; // 10 секунд

    while (status !== "completed" && status !== "failed" && attempts < maxAttempts) {
      status = await fetchRunStatus();
      console.log(`🔄 Попытка ${attempts + 1}: статус = ${status}`);
      if (status === "completed" || status === "failed") break;

      attempts++;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (status !== "completed") {
      return res.status(408).json({ error: `Run not completed after ${attempts} attempts`, status });
    }

    res.status(200).json({ status: "completed" });

  } catch (error) {
    console.error("❌ Ошибка в check-run:", error);
    res.status(500).json({ error: error.message });
  }
}
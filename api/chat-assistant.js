export default async function handler(req, res) {
  const { apiKey, assistantId, threadId } = req.body;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'OpenAI-Beta': 'assistants=v2'
  };

  try {
    // 1. Создаём Run
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ assistant_id: assistantId })
    });

    const runData = await runResponse.json();
    const runId = runData.id;

    // 2. Цикл ожидания завершения выполнения
    let status = runData.status;
    let attempts = 0;
    while (status !== 'completed' && attempts < 8) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const checkRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        method: 'GET',
        headers
      });
      const checkData = await checkRes.json();
      status = checkData.status;
      attempts++;
    }

    // 3. Получаем результат
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'GET',
      headers
    });

    const messagesData = await messagesRes.json();
    const lastMessage = messagesData.data.find(msg => msg.role === 'assistant');
    const result = lastMessage?.content?.[0]?.text?.value || '[no response]';

    // 4. Отправляем ответ
    res.status(200).json({ runId, threadId, result });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { threadId, message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  const assistantId = process.env.ASSISTANT_ID;
  if (!assistantId || !openai.apiKey) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  try {
    // Шаг 1. Создаём или получаем thread
    let thread;
    if (threadId) {
      thread = await openai.beta.threads.retrieve(threadId);
    } else {
      thread = await openai.beta.threads.create();
    }

    // Шаг 2. Добавляем сообщение в thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message,
    });

    // Шаг 3. Запускаем assistant run
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // Ждём завершения run
    let completedRun;
    const maxRetries = 16;
    let retries = 0;
    while (retries < maxRetries) {
      completedRun = await openai.beta.threads.runs.retrieve(run.id, thread.id); // ✅ FIX: правильный порядок аргументов
      if (completedRun.status === 'completed') break;
      if (completedRun.status === 'failed') {
        return res.status(500).json({ error: 'Run failed' });
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
      retries++;
    }

    if (completedRun.status !== 'completed') {
      return res.status(500).json({ error: 'Run did not complete in time' });
    }

    // Получаем последнее сообщение от ассистента
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');

    if (assistantMessages.length === 0) {
      return res.status(500).json({ error: 'No assistant messages found' });
    }

    const lastMessage = assistantMessages[0].content
      .map(part => part.text?.value || '')
      .join('\n');

    return res.status(200).json({
      threadId: thread.id,
      response: lastMessage,
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
}
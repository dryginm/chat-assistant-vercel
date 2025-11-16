import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.ASSISTANT_ID;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { threadId, message } = req.body;

    console.log('📬 Входящий запрос:', { threadId, message });

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing message' });
    }

    // 1. Используем либо переданный threadId, либо создаём новый thread
    const thread = threadId
      ? { id: threadId }
      : await openai.beta.threads.create();

    const threadIdFinal = thread.id;
    console.log('📌 Используем thread:', threadIdFinal);

    // 2. Добавляем сообщение от пользователя
    const msg = await openai.beta.threads.messages.create(threadIdFinal, {
      role: 'user',
      content: message,
    });

    console.log('✉️ Сообщение добавлено в thread:', msg.id);

    // 3. Запускаем ассистента
    const run = await openai.beta.threads.runs.create(threadIdFinal, {
      assistant_id: ASSISTANT_ID,
    });

    console.log('🤖 Assistant run создан:', run.id);

    // 4. Ждём завершения
    let runStatus = await openai.beta.threads.runs.retrieve(threadIdFinal, run.id);

    while (
      runStatus.status === 'queued' ||
      runStatus.status === 'in_progress'
    ) {
      console.log(`⏳ Ждём завершения run... статус: ${runStatus.status}`);
      await new Promise((r) => setTimeout(r, 1500));
      runStatus = await openai.beta.threads.runs.retrieve(threadIdFinal, run.id);
    }

    console.log('✅ Run завершён. Финальный статус:', runStatus.status);

    if (runStatus.status !== 'completed') {
      return res.status(500).json({ error: 'Run did not complete successfully' });
    }

    // 5. Получаем последнее сообщение ассистента
    const messages = await openai.beta.threads.messages.list(threadIdFinal);
    const lastMessage = messages.data.find((msg) => msg.role === 'assistant');

    const reply = lastMessage?.content?.[0]?.text?.value || 'Ответ не найден';

    console.log('📨 Ответ ассистента:', reply);

    return res.status(200).json({
      threadId: threadIdFinal,
      runId: run.id,
      reply,
    });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    return res.status(500).json({ error: error.message });
  }
}
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const assistantId = process.env.ASSISTANT_ID;

export default async function handler(req, res) {
  try {
    const { threadId, message } = req.body;
    console.log('📬 Входящий запрос:', { threadId, message });

    // 1. Создаём новый thread, если не был передан
    let threadIdFinal = threadId;
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadIdFinal = thread.id;
      console.log('🧵 Новый thread создан:', threadIdFinal);
    } else {
      console.log('📌 Используем thread:', threadIdFinal);
    }

    // 2. Добавляем сообщение в thread
    const msg = await openai.beta.threads.messages.create(threadIdFinal, {
      role: 'user',
      content: message
    });
    console.log('✉️ Сообщение добавлено в thread:', msg.id);

    // 3. Создаём запуск ассистента
    const run = await openai.beta.threads.runs.create(threadIdFinal, {
      assistant_id: assistantId
    });
    console.log('🤖 Assistant run создан:', run.id, run);

    // 4. Ждём завершения
    let runStatus = await openai.beta.threads.runs.retrieve(threadIdFinal, run.id);
    let attempts = 0;
    while (['queued', 'in_progress'].includes(runStatus.status) && attempts < 20) {
      await new Promise((r) => setTimeout(r, 1000)); // ждем 1 сек
      runStatus = await openai.beta.threads.runs.retrieve(threadIdFinal, run.id);
      attempts++;
    }

    if (runStatus.status !== 'completed') {
      console.error('❌ Run не завершён:', runStatus.status);
      return res.status(500).json({ error: 'Assistant run did not complete in time' });
    }

    // 5. Получаем сообщения и находим последний ответ ассистента
    const messages = await openai.beta.threads.messages.list(threadIdFinal);
    const lastMessage = messages.data
      .filter((msg) => msg.role === 'assistant')
      .sort((a, b) => b.created_at - a.created_at)[0];

    if (!lastMessage) {
      console.error('❌ Ответ ассистента не найден');
      return res.status(500).json({ error: 'No assistant message found' });
    }

    const text = lastMessage.content
      .map((part) => part.text?.value || '')
      .join('\n');

    console.log('✅ Ответ ассистента:', text);
    return res.status(200).json({ text, threadId: threadIdFinal, runId: run.id });
  } catch (err) {
    console.error('❌ Ошибка:', err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
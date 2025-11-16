import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ASSISTANT_ID = process.env.ASSISTANT_ID;

export default async function handler(req, res) {
  try {
    const { threadId, message } = req.body;

    console.log('📬 Входящий запрос:', { threadId, message });

    if (!message || typeof message !== 'string') {
      console.error('❌ Ошибка: message не передано или не строка');
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    const threadIdFinal = threadId || (await openai.beta.threads.create()).id;
    console.log('📌 Используем thread:', threadIdFinal);

    const addedMessage = await openai.beta.threads.messages.create(threadIdFinal, {
      role: 'user',
      content: message
    });
    console.log('✉️ Сообщение добавлено в thread:', addedMessage.id);

    const run = await openai.beta.threads.runs.create(threadIdFinal, {
      assistant_id: ASSISTANT_ID
    });
    console.log('🤖 Assistant run создан:', run.id, run);

    if (!run?.id || !threadIdFinal) {
      console.error('❌ Ошибка: run.id или threadIdFinal не определены');
      return res.status(500).json({ error: 'run.id or threadIdFinal is undefined' });
    }

    let runStatus = await openai.beta.threads.runs.retrieve(threadIdFinal, run.id);
    let attempts = 0;
    while (['queued', 'in_progress'].includes(runStatus.status) && attempts < 20) {
      await new Promise((r) => setTimeout(r, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadIdFinal, run.id);
      attempts++;
    }

    if (runStatus.status !== 'completed') {
      console.error('❌ Run не завершился. Статус:', runStatus.status);
      return res.status(500).json({ error: 'Run did not complete', status: runStatus.status });
    }

    const messages = await openai.beta.threads.messages.list(threadIdFinal);
    const lastMessage = messages.data.find((msg) => msg.role === 'assistant');

    if (!lastMessage) {
      console.warn('⚠️ Assistant не вернул сообщение');
      return res.status(200).json({ result: '', threadId: threadIdFinal });
    }

    const text = lastMessage.content
      .map((part) => (typeof part.text?.value === 'string' ? part.text.value : ''))
      .join('\n')
      .trim();

    console.log('✅ Ответ assistant:', text);

    return res.status(200).json({ result: text, threadId: threadIdFinal });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
}
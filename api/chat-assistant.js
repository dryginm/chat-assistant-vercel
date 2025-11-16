import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ASSISTANT_ID = process.env.ASSISTANT_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed' });
  }

  const { threadId, message } = req.body;

  console.log('📥 Входящий запрос:', { threadId, message });

  if (!ASSISTANT_ID) {
    console.error('❌ Ошибка: ASSISTANT_ID is not defined');
    return res.status(500).json({ error: 'Server configuration error: missing ASSISTANT_ID' });
  }

  if (!openai.apiKey) {
    console.error('❌ Ошибка: OPENAI_API_KEY is not defined');
    return res.status(500).json({ error: 'Server configuration error: missing OPENAI_API_KEY' });
  }

  try {
    let thread;

    if (threadId) {
      thread = { id: threadId };
      console.log('📌 Используем thread:', threadId);
    } else {
      thread = await openai.beta.threads.create();
      console.log('🧵 Новый thread создан:', thread.id);
    }

    const messageResponse = await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message
    });

    console.log('✉️ Сообщение добавлено в thread:', messageResponse.id);

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    });

    if (!run || !run.id) {
      console.error('❌ Ошибка: не удалось создать run:', run);
      return res.status(500).json({ error: 'Failed to create assistant run' });
    }

    console.log('🤖 Assistant run создан:', run.id);

    // Ждём завершения run (polling)
    let runStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log('⌛ Run статус:', runStatus.status);
    } while (runStatus.status !== 'completed' && runStatus.status !== 'failed');

    if (runStatus.status === 'failed') {
      console.error('❌ Ошибка: Assistant run завершился с ошибкой');
      return res.status(500).json({ error: 'Assistant run failed' });
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data
      .filter(msg => msg.role === 'assistant')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    const text = lastMessage?.content?.[0]?.text?.value;

    console.log('📤 Ответ Assistant:', text);

    res.status(200).json({ text, threadId: thread.id });

  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
}
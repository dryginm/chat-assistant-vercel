import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.ASSISTANT_ID;

export default async function handler(req, res) {
  try {
    const { threadId, message } = req.body;
    console.log('📬 Входящий запрос:', { threadId, message });

    if (!message || typeof message !== 'string') {
      throw new Error('❌ message is missing or not a string');
    }

    // 1. Создаём thread при необходимости
    let threadIdFinal = threadId;
    if (!threadIdFinal) {
      const thread = await openai.beta.threads.create();
      threadIdFinal = thread.id;
      console.log('🧵 Новый thread создан:', threadIdFinal);
    } else {
      console.log('📌 Используем thread:', threadIdFinal);
    }

    // 2. Добавляем сообщение в thread
    const addedMsg = await openai.beta.threads.messages.create(threadIdFinal, {
      role: 'user',
      content: message,
    });
    console.log('✉️ Сообщение добавлено в thread:', addedMsg.id);

    // 3. Запускаем ассистента
    const run = await openai.beta.threads.runs.create(threadIdFinal, {
      assistant_id: ASSISTANT_ID,
    });

    console.log('🤖 Assistant run создан:', run?.id, run);

    if (!run?.id) {
      throw new Error('❌ Ошибка: run.id is undefined');
    }

    // 4. Ждём завершения run
    let runStatus = await openai.beta.threads.runs.retrieve(threadIdFinal, run.id);
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      console.log('⏳ Ожидаем завершения run... статус:', runStatus.status);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadIdFinal, run.id);
    }

    console.log('✅ Run завершён:', runStatus.status);

    // 5. Получаем ответ
    const messages = await openai.beta.threads.messages.list(threadIdFinal);
    const lastMessage = messages.data.find(
      (msg) => msg.role === 'assistant' && msg.run_id === run.id
    );

    if (!lastMessage) {
      throw new Error('❌ Ответ от ассистента не найден');
    }

    const responseText = lastMessage.content
      .map((part) => part.text?.value || '')
      .join('\n');

    console.log('📤 Ответ ассистента:', responseText);

    // 6. Возвращаем результат
    res.status(200).json({
      threadId: threadIdFinal,
      message: responseText,
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
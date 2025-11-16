// api/chat-assistant.js

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ASSISTANT_ID = process.env.ASSISTANT_ID;

export default async function handler(req, res) {
  try {
    const { threadId, message } = req.body;

    console.log('➡️ Входящий запрос:', { threadId, message });

    let thread;
    if (!threadId) {
      // Создаём новый поток
      thread = await openai.beta.threads.create();
      console.log('🧵 Новый thread создан:', thread.id);
    } else {
      // Используем существующий поток
      thread = { id: threadId };
      console.log('📌 Используем thread:', threadId);
    }

    // Добавляем сообщение в поток
    const userMessage = await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message
    });
    console.log('✉️ Сообщение добавлено в thread:', userMessage.id);

    // Запускаем Assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    });
    console.log('▶️ Assistant run создан:', run.id);

    const runId = run.id;

    // Ожидаем завершения run
    let attempts = 0;
    let completedRun = null;

    while (attempts < 10) {
      completedRun = await openai.beta.threads.runs.retrieve(thread.id, runId);
      console.log(`⌛ Статус на попытке ${attempts + 1}: ${completedRun.status}`);

      if (completedRun.status === 'completed') break;
      if (completedRun.status === 'failed' || completedRun.status === 'cancelled') {
        throw new Error(`Run завершился с ошибкой: ${completedRun.status}`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    if (completedRun.status !== 'completed') {
      throw new Error('Run не завершился вовремя');
    }

    // Получаем ответ Assistant'а
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data.find(m => m.role === 'assistant');

    const reply = lastMessage?.content?.[0]?.text?.value || 'Нет ответа от Assistant';

    console.log('✅ Ответ Assistant:', reply);

    return res.status(200).json({
      threadId: thread.id,
      runId,
      reply
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
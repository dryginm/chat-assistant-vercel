import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { threadId } = req.body;
    console.log("📬 [get-result] Получение сообщений для thread:", threadId);

    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessages = messages.data
      .filter(msg => msg.role === "assistant")
      .map(msg => ({
        role: msg.role,
        content: msg.content
          .map(c => c.text?.value || c.text?.content || "")
          .join("\n"),
      }));

    console.log("✅ Сообщения получены:", assistantMessages.length);
    res.status(200).json({ messages: assistantMessages });
  } catch (error) {
    console.error("❌ Ошибка в get-result:", error);
    res.status(500).json({ error: error.message });
  }
}
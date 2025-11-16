import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { threadId } = req.body;
    console.log("📥 [get-result] Получение результата по thread:", threadId);

    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessage = messages.data.find(msg => msg.role === "assistant");

    if (!assistantMessage) {
      return res.status(404).json({ error: "Ответ ассистента не найден" });
    }

    const content = assistantMessage.content.map(part => part.text.value).join("\n");
    console.log("📤 Ответ ассистента:", content);

    res.status(200).json({ text: content });
  } catch (error) {
    console.error("❌ Ошибка в get-result:", error);
    res.status(500).json({ error: error.message });
  }
}
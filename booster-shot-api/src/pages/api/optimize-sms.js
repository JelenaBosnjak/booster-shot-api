export default async function handler(req, res) {
  if (req.method === "POST") {
    let message;
    try {
      if (req.body && typeof req.body === "object") {
        ({ message } = req.body);
      } else {
        ({ message } = JSON.parse(req.body || "{}"));
      }
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    if (!message) {
      return res.status(400).json({ error: "Missing message." });
    }

    // Your custom prompt
    const prompt = `
Make this message easy to read, format it, add spaces and don't change the values or text in the message.

Message:
${message}
`;

    try {
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPEN_AI_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert at formatting SMS for clarity and readability, without altering content."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 256,
          temperature: 0.3
        }),
      });

      if (!openaiRes.ok) {
        const error = await openaiRes.text();
        return res.status(500).json({ error: "OpenAI error: " + error });
      }

      const data = await openaiRes.json();
      const optimized = data.choices?.[0]?.message?.content?.trim();

      if (!optimized) {
        return res.status(500).json({ error: "No optimization returned by OpenAI." });
      }

      return res.status(200).json({ optimized });
    } catch (e) {
      return res.status(500).json({ error: e.message || "Unknown error with OpenAI." });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
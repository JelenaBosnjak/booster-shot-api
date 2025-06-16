export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    // Prepare the payload for the webhook
    const webhookUrl = "https://services.leadconnectorhq.com/hooks/QoVl53giULLNf7iUH7LE/webhook-trigger/b4ca2252-b3f8-4eee-991c-cd468b2a3b18";
    const payload = {
      booster_shot_message: message // This will fill custom value {{ custom_values.booster_shot_message }}
    };

    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    // Optionally handle webhook response, or just acknowledge
    if (!webhookRes.ok) {
      const error = await webhookRes.text();
      return res.status(500).json({ error: "Failed to call GHL webhook: " + error });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
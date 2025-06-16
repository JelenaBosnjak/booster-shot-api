export default async function handler(req, res) {
  // Accept both POST (send to webhook) and GET (fetch optimized message)
  if (req.method === "POST") {
    try {
      const { message, locationId } = req.body;

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

      if (!webhookRes.ok) {
        const error = await webhookRes.text();
        return res.status(500).json({ error: "Failed to call GHL webhook: " + error });
      }

      // After sending to webhook, try to fetch the optimized message back (if locationId is provided)
      if (locationId) {
        // Wait a short time to allow workflow to complete (adjust as needed)
        await new Promise(r => setTimeout(r, 2000));

        // Fetch from GHL location API
        const GHL_API_KEY = process.env.GHL_API_KEY || process.env.GHL_API_TOKEN;
        if (!GHL_API_KEY) {
          return res.status(500).json({ error: "Missing GHL API Key" });
        }
        const url = `https://rest.gohighlevel.com/v1/locations/${locationId}`;
        const ghRes = await fetch(url, {
          headers: {
            Authorization: `Bearer ${GHL_API_KEY}`
          }
        });
        if (!ghRes.ok) {
          const error = await ghRes.text();
          return res.status(500).json({ error: "Failed to fetch location: " + error });
        }
        const data = await ghRes.json();
        const customValues = data.location?.customValues || data.location?.custom_values || {};
        const boosterShotMsg = customValues.booster_shot_message || "";
        return res.status(200).json({ success: true, optimized: boosterShotMsg });
      }

      // If no locationId, just acknowledge
      return res.status(200).json({ success: true });

    } catch (error) {
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  } else if (req.method === "GET") {
    // GET: Fetch the optimized message by locationId
    const { locationId } = req.query;
    const GHL_API_KEY = process.env.GHL_API_KEY || process.env.GHL_API_TOKEN;
    if (!locationId) return res.status(400).json({ error: "Missing locationId" });
    if (!GHL_API_KEY) return res.status(400).json({ error: "Missing API key" });

    try {
      const url = `https://rest.gohighlevel.com/v1/locations/${locationId}`;
      const ghRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`
        }
      });
      if (!ghRes.ok) {
        const error = await ghRes.text();
        return res.status(500).json({ error: "Failed to fetch location: " + error });
      }
      const data = await ghRes.json();
      const customValues = data.location?.customValues || data.location?.custom_values || {};
      const boosterShotMsg = customValues.booster_shot_message || "";
      return res.status(200).json({ boosterShotMessage: boosterShotMsg });
    } catch (e) {
      return res.status(500).json({ error: e.message || "Unknown error" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
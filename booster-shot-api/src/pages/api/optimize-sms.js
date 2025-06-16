export default async function handler(req, res) {
  // --- POST HANDLER: Send to webhook only ---
  if (req.method === "POST") {
    const { message, locationId } = req.body;
    const WEBHOOK_URL = process.env.OPTIMIZE_SMS_WEBHOOK_URL;

    if (!WEBHOOK_URL) {
      return res.status(500).json({ error: "Webhook URL not configured." });
    }
    if (!message || !locationId) {
      return res.status(400).json({ error: "Missing message or locationId." });
    }

    try {
      const webhookRes = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, locationId }),
      });

      if (!webhookRes.ok) {
        const error = await webhookRes.text();
        return res
          .status(500)
          .json({ error: "Failed to send to webhook: " + error });
      }

      return res.status(200).json({ success: true });
    } catch (e) {
      return res
        .status(500)
        .json({ error: e.message || "Unknown error sending to webhook." });
    }
  }

  // --- GET HANDLER: Fetch the optimized message from GoHighLevel ---
  if (req.method === "GET") {
    const { locationId } = req.query;
    const GHL_API_KEY = process.env.GHL_API_KEY || process.env.GHL_API_TOKEN;

    if (!locationId) {
      return res.status(400).json({ error: "Missing locationId" });
    }
    if (!GHL_API_KEY) {
      return res.status(400).json({ error: "Missing API key" });
    }

    try {
      const url = `https://rest.gohighlevel.com/v1/locations/${locationId}`;
      const ghRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
        },
      });

      if (!ghRes.ok) {
        const error = await ghRes.text();
        return res
          .status(500)
          .json({ error: "Failed to fetch location: " + error });
      }

      const data = await ghRes.json();

      // --- Debug log: print the full GoHighLevel API response structure ---
      console.log("GHL Location API Response:", JSON.stringify(data, null, 2));

      // --- Robust extraction of the custom value, regardless of format ---
      let boosterShotMsg = "";

      // 1. If custom_values is an array (common in GHL)
      if (Array.isArray(data.location?.custom_values)) {
        const match = data.location.custom_values.find(
          (v) => v.key === "booster_shot_message"
        );
        boosterShotMsg = match ? match.value : "";
      }
      // 2. If customValues is an object
      else if (
        data.location?.customValues &&
        data.location.customValues.booster_shot_message
      ) {
        boosterShotMsg = data.location.customValues.booster_shot_message;
      }
      // 3. If custom_values is an object
      else if (
        data.location?.custom_values &&
        data.location.custom_values.booster_shot_message
      ) {
        boosterShotMsg = data.location.custom_values.booster_shot_message;
      }
      // 4. Fallback: try looking for a top-level key just in case
      else if (data.location?.booster_shot_message) {
        boosterShotMsg = data.location.booster_shot_message;
      }

      // --- Return the message, even if blank ---
      return res.status(200).json({ boosterShotMessage: boosterShotMsg });
    } catch (e) {
      return res
        .status(500)
        .json({ error: e.message || "Unknown error" });
    }
  }

  // --- Fallback for unsupported methods ---
  res.status(405).json({ error: "Method not allowed" });
}
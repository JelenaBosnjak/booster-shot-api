export default async function handler(req, res) {
  // --- POST HANDLER (stub, implement as needed for your workflow) ---
  if (req.method === "POST") {
    // Example: Store or trigger optimization. Adjust as needed for your backend/workflow.
    // You may want to call a webhook, trigger a workflow, or just acknowledge receipt.
    // For now, this is a stub that signals success.
    res.status(200).json({ success: true });
    return;
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
          Authorization: `Bearer ${GHL_API_KEY}`
        }
      });

      if (!ghRes.ok) {
        const error = await ghRes.text();
        return res.status(500).json({ error: "Failed to fetch location: " + error });
      }

      const data = await ghRes.json();

      // --- Debug log: print the full GoHighLevel API response structure ---
      console.log("GHL Location API Response:", JSON.stringify(data, null, 2));

      // --- Robust extraction of the custom value, regardless of format ---
      let boosterShotMsg = "";

      // 1. If custom_values is an array (common in GHL)
      if (Array.isArray(data.location?.custom_values)) {
        const match = data.location.custom_values.find(
          v => v.key === "booster_shot_message"
        );
        boosterShotMsg = match ? match.value : "";
      }

      // 2. If customValues is an object
      else if (data.location?.customValues && data.location.customValues.booster_shot_message) {
        boosterShotMsg = data.location.customValues.booster_shot_message;
      }

      // 3. If custom_values is an object
      else if (data.location?.custom_values && data.location.custom_values.booster_shot_message) {
        boosterShotMsg = data.location.custom_values.booster_shot_message;
      }

      // 4. Fallback: try looking for a top-level key just in case
      else if (data.location?.booster_shot_message) {
        boosterShotMsg = data.location.booster_shot_message;
      }

      // --- Return the message, even if blank ---
      return res.status(200).json({ boosterShotMessage: boosterShotMsg });
    } catch (e) {
      return res.status(500).json({ error: e.message || "Unknown error" });
    }
  }

  // --- Fallback for unsupported methods ---
  res.status(405).json({ error: "Method not allowed" });
}
else if (req.method === "GET") {
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
    console.log("GHL Location API Response:", JSON.stringify(data, null, 2)); // <--- Debug log, pretty print

    // Try both object and array format for custom values
    let boosterShotMsg = "";
    if (Array.isArray(data.location?.custom_values)) {
      const match = data.location.custom_values.find(v => v.key === "booster_shot_message");
      boosterShotMsg = match ? match.value : "";
    } else if (data.location?.customValues && data.location.customValues.booster_shot_message) {
      boosterShotMsg = data.location.customValues.booster_shot_message;
    } else if (data.location?.custom_values && data.location.custom_values.booster_shot_message) {
      boosterShotMsg = data.location.custom_values.booster_shot_message;
    }
    return res.status(200).json({ boosterShotMessage: boosterShotMsg });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Unknown error" });
  }
}
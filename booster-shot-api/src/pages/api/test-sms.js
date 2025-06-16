export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, phone } = req.body;

  // These are set in your Vercel environment
  const GHL_API_KEY = process.env.GHL_API_KEY || process.env.GHL_API_TOKEN;
  const LOCATION_ID = process.env.GHL_LOCATION_ID;

  if (!message || !phone) {
    return res.status(400).json({ error: "Missing message or phone" });
  }
  if (!GHL_API_KEY || !LOCATION_ID) {
    return res.status(500).json({ error: "Missing GHL API key or location ID" });
  }

  try {
    // 1. Ensure contact exists (create or update)
    const contactRes = await fetch("https://rest.gohighlevel.com/v1/contacts/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone,
        locationId: LOCATION_ID
      })
    });

    if (!contactRes.ok) {
      const error = await contactRes.text();
      return res.status(500).json({ error: "Failed to create or update contact: " + error });
    }

    // 2. Send the SMS
    const smsRes = await fetch("https://rest.gohighlevel.com/v1/messages/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone,
        message,
        locationId: LOCATION_ID
      })
    });

    if (!smsRes.ok) {
      const error = await smsRes.text();
      return res.status(500).json({ error: "Failed to send test SMS: " + error });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Unknown error sending test SMS." });
  }
}
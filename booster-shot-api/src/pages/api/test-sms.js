const API_TOKEN = process.env.GHL_API_TOKEN || process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_ACCOUNT_ID; // <--- Updated to match your environment variable name!
const GHL_API_CONTACTS_URL = "https://rest.gohighlevel.com/v1/contacts";
const GHL_API_MESSAGES_URL = "https://rest.gohighlevel.com/v1/messages";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, phone } = req.body;

  if (!API_TOKEN || !LOCATION_ID) {
    return res.status(500).json({ error: "Missing API token or location ID" });
  }
  if (!message || !phone) {
    return res.status(400).json({ error: "Missing message or phone" });
  }

  try {
    // 1. Ensure contact exists (create or update)
    const contactRes = await fetch(GHL_API_CONTACTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
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
    const smsRes = await fetch(GHL_API_MESSAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
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
    console.error("Server Error:", e);
    return res.status(500).json({ error: e.message || "Unknown error sending test SMS." });
  }
}
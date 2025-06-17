const API_TOKEN = process.env.GHL_API_TOKEN || process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_ACCOUNT_ID;
const GHL_API_CONTACTS_URL = "https://rest.gohighlevel.com/v1/contacts";
const GHL_API_MESSAGES_URL = "https://rest.gohighlevel.com/v1/messages";
const GHL_API_LOCATION_URL = `https://rest.gohighlevel.com/v1/locations/${LOCATION_ID}`;
const GHL_CUSTOM_VALUES_URL = "https://rest.gohighlevel.com/v1/custom-values";
const BOOSTER_SHOT_MESSAGE_ID = "ihlURpt2R0a74k2nCB0i"; // Use your actual custom value ID here

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone, message } = req.body;

  if (!API_TOKEN || !LOCATION_ID) {
    return res.status(500).json({ error: "Missing API token or location ID" });
  }
  if (!phone) {
    return res.status(400).json({ error: "Missing phone" });
  }
  if (!message) {
    return res.status(400).json({ error: "Missing message" });
  }

  try {
    // 1. Update the custom value "Booster Shot Message"
    let customValueResult = null;
    try {
      const customValueRes = await fetch(`${GHL_CUSTOM_VALUES_URL}/${BOOSTER_SHOT_MESSAGE_ID}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          value: message,
          locationId: LOCATION_ID
        })
      });
      if (!customValueRes.ok) {
        const errData = await customValueRes.json().catch(() => ({}));
        customValueResult = { success: false, error: errData.error || customValueRes.statusText };
      } else {
        customValueResult = { success: true };
      }
    } catch (err) {
      customValueResult = { success: false, error: err.message || "Unknown error" };
    }

    // 2. Fetch subaccount's main phone number (for display/logging)
    const locationRes = await fetch(GHL_API_LOCATION_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    });
    if (!locationRes.ok) {
      const error = await locationRes.text();
      return res.status(500).json({ error: "Failed to fetch location details: " + error, customValueResult });
    }
    const locationData = await locationRes.json();
    const fromNumber = locationData.phone;

    // 3. Ensure contact exists (create or update)
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
      return res.status(500).json({ error: "Failed to create or update contact: " + error, customValueResult });
    }

    // 4. Send the SMS (GHL will use the assigned number automatically)
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
      return res.status(500).json({ error: "Failed to send test SMS: " + error, customValueResult });
    }

    // Return info back to the client
    return res.status(200).json({ success: true, fromNumber, customValueResult });
  } catch (e) {
    console.error("Server Error:", e);
    return res.status(500).json({ error: e.message || "Unknown error sending test SMS." });
  }
}
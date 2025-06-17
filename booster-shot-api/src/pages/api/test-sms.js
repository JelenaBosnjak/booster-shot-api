const API_TOKEN = process.env.GHL_API_TOKEN || process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_ACCOUNT_ID;
const GHL_API_CONTACTS_URL = "https://rest.gohighlevel.com/v1/contacts";
const GHL_API_MESSAGES_URL = "https://rest.gohighlevel.com/v1/messages";
const GHL_API_PHONE_NUMBERS_URL = `https://rest.gohighlevel.com/v1/locations/${LOCATION_ID}/phoneNumbers`;
const GHL_API_CUSTOM_VALUES_URL = "https://rest.gohighlevel.com/v1/customValues";
const CUSTOM_VALUE_KEY = "Booster Shot Message"; // update if your custom value key is different

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone } = req.body;

  if (!API_TOKEN || !LOCATION_ID) {
    return res.status(500).json({ error: "Missing API token or location ID" });
  }
  if (!phone) {
    return res.status(400).json({ error: "Missing phone" });
  }

  try {
    // 1. Fetch subaccount's SMS number(s)
    const phoneRes = await fetch(GHL_API_PHONE_NUMBERS_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    });
    if (!phoneRes.ok) {
      const error = await phoneRes.text();
      return res.status(500).json({ error: "Failed to fetch location phone numbers: " + error });
    }
    const phoneData = await phoneRes.json();
    const smsNumberObj = phoneData.phoneNumbers?.find(num => num.type === "SMS" && num.phoneNumber);
    if (!smsNumberObj) {
      return res.status(400).json({ error: "No SMS phone number assigned to this subaccount." });
    }
    const fromNumber = smsNumberObj.phoneNumber;

    // 2. Fetch custom value for message
    const customValueRes = await fetch(`${GHL_API_CUSTOM_VALUES_URL}?locationId=${LOCATION_ID}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${API_TOKEN}`, "Content-Type": "application/json" }
    });
    if (!customValueRes.ok) {
      const error = await customValueRes.text();
      return res.status(500).json({ error: "Failed to fetch custom values: " + error });
    }
    const customValues = await customValueRes.json();
    const customValue = customValues.customValues?.find(
      (cv) => cv.name === CUSTOM_VALUE_KEY || cv.key === CUSTOM_VALUE_KEY
    );
    if (!customValue) {
      return res.status(400).json({ error: "Custom value not found" });
    }
    const message = customValue.value;

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
      return res.status(500).json({ error: "Failed to create or update contact: " + error });
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
      return res.status(500).json({ error: "Failed to send test SMS: " + error });
    }

    // Optionally return the fromNumber so the client knows what number was used
    return res.status(200).json({ success: true, fromNumber });
  } catch (e) {
    console.error("Server Error:", e);
    return res.status(500).json({ error: e.message || "Unknown error sending test SMS." });
  }
}
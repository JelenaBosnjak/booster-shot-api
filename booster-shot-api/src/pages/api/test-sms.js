const API_TOKEN = process.env.GHL_API_TOKEN || process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_ACCOUNT_ID;
const GHL_API_CONTACTS_URL = "https://rest.gohighlevel.com/v1/contacts";
const GHL_API_MESSAGES_URL = "https://rest.gohighlevel.com/v1/messages";
const GHL_API_LOCATION_URL = `https://rest.gohighlevel.com/v1/locations/${LOCATION_ID}`;
const GHL_CUSTOM_VALUES_URL = "https://rest.gohighlevel.com/v1/custom-values";

const BOOSTER_SHOT_CUSTOM_VALUE_NAME = "Booster Shot Message"; // updated to match your GHL custom value exactly

export default async function handler(req, res) {
  if (req.method !== "POST") {
    console.debug("[DEBUG] Invalid HTTP method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone, message } = req.body;

  if (!API_TOKEN || !LOCATION_ID) {
    console.debug("[DEBUG] Missing tokens", { API_TOKEN, LOCATION_ID });
    return res.status(500).json({ error: "Missing API token or location ID" });
  }
  if (!phone) {
    console.debug("[DEBUG] Missing phone in request body:", req.body);
    return res.status(400).json({ error: "Missing phone" });
  }
  if (!message) {
    console.debug("[DEBUG] Missing message in request body:", req.body);
    return res.status(400).json({ error: "Missing message" });
  }

  try {
    // 1. Get all custom values
    console.debug("[DEBUG] Fetching custom values:", GHL_CUSTOM_VALUES_URL);
    const customValuesRes = await fetch(GHL_CUSTOM_VALUES_URL, {
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    });
    if (!customValuesRes.ok) {
      const error = await customValuesRes.text();
      console.error("[DEBUG] Failed to fetch custom values:", error);
      return res.status(500).json({ error: "Failed to fetch custom values: " + error });
    }
    const customValuesData = await customValuesRes.json();
    console.debug("[DEBUG] Custom values response:", customValuesData);

    // 2. Find the custom value by name (case-insensitive, but using exact spelling preferred)
    const customValue = customValuesData.customValues.find(
      v => v.name.trim().toLowerCase() === BOOSTER_SHOT_CUSTOM_VALUE_NAME.toLowerCase()
    );
    if (!customValue) {
      console.warn("[DEBUG] Custom value not found", BOOSTER_SHOT_CUSTOM_VALUE_NAME);
      return res.status(400).json({
        error: `Custom value "${BOOSTER_SHOT_CUSTOM_VALUE_NAME}" not found`,
        availableNames: customValuesData.customValues.map(v => v.name)
      });
    }
    const customValueId = customValue.id;

    // 3. Update the custom value
    let customValueResult = null;
    try {
      console.debug("[DEBUG] Updating custom value:", customValueId, "with value:", message);
      const customValueRes = await fetch(`${GHL_CUSTOM_VALUES_URL}/${customValueId}`, {
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
        console.error("[DEBUG] Failed to update custom value:", errData);
        customValueResult = { success: false, error: errData.error || customValueRes.statusText };
      } else {
        customValueResult = { success: true };
      }
    } catch (err) {
      console.error("[DEBUG] Exception updating custom value:", err);
      customValueResult = { success: false, error: err.message || "Unknown error" };
    }

    // 4. Fetch subaccount's main phone number (for display/logging)
    console.debug("[DEBUG] Fetching location data:", GHL_API_LOCATION_URL);
    const locationRes = await fetch(GHL_API_LOCATION_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    });
    if (!locationRes.ok) {
      const error = await locationRes.text();
      console.error("[DEBUG] Failed to fetch location details:", error);
      return res.status(500).json({ error: "Failed to fetch location details: " + error, customValueResult });
    }
    const locationData = await locationRes.json();
    const fromNumber = locationData.phone;
    console.debug("[DEBUG] Location data:", locationData);

    // 5. Ensure contact exists (create or update)
    console.debug("[DEBUG] Creating/updating contact:", phone);
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
    let contactData = null;
    if (!contactRes.ok) {
      const error = await contactRes.text();
      console.error("[DEBUG] Failed to create or update contact:", error);
      return res.status(500).json({ error: "Failed to create or update contact: " + error, customValueResult });
    } else {
      contactData = await contactRes.json().catch(() => ({}));
    }
    console.debug("[DEBUG] Contact creation/update response:", contactData);

    // 6. Send the SMS (GHL will use the assigned number automatically)
    console.debug("[DEBUG] Sending SMS:", { phone, message, locationId: LOCATION_ID });
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

    let smsResponseBody = null;
    if (!smsRes.ok) {
      smsResponseBody = await smsRes.text();
      console.error("[DEBUG] Failed to send test SMS:", smsResponseBody);
      return res.status(500).json({ 
        error: "Failed to send test SMS", 
        smsApiRaw: smsResponseBody,
        customValueResult,
        contactData
      });
    } else {
      smsResponseBody = await smsRes.json().catch(() => ({}));
    }
    console.debug("[DEBUG] SMS send response:", smsResponseBody);

    // Return info back to the client
    return res.status(200).json({ 
      success: true,
      fromNumber,
      customValueResult,
      contactData,
      smsApiResponse: smsResponseBody
    });
  } catch (e) {
    console.error("[DEBUG] Server Error:", e);
    return res.status(500).json({ error: e.message || "Unknown error sending test SMS." });
  }
}
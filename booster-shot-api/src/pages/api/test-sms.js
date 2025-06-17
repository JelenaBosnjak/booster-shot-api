const API_TOKEN = process.env.GHL_API_TOKEN || process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_ACCOUNT_ID;
const GHL_API_CONTACTS_URL = "https://rest.gohighlevel.com/v1/contacts";
const GHL_API_MESSAGES_URL = "https://rest.gohighlevel.com/v1/messages";
const GHL_API_LOCATION_URL = `https://rest.gohighlevel.com/v1/locations/${LOCATION_ID}`;
const GHL_CUSTOM_VALUES_URL = "https://rest.gohighlevel.com/v1/custom-values";
const BOOSTER_SHOT_CUSTOM_VALUE_NAME = "Booster shot message";

function makeDebugToken() {
  return Math.random().toString(36).slice(2, 10);
}

export default async function handler(req, res) {
  const debugToken = makeDebugToken();
  function log(...args) {
    console.log(`[test-sms:${debugToken}]`, ...args);
  }

  if (req.method !== "POST") {
    log("405 Method Not Allowed");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone, message } = req.body;
  log("Request body:", req.body);

  if (!API_TOKEN || !LOCATION_ID) {
    log("Missing API token or location ID");
    return res.status(500).json({ error: "Missing API token or location ID" });
  }
  if (!phone) {
    log("Missing phone");
    return res.status(400).json({ error: "Missing phone" });
  }
  if (!message) {
    log("Missing message");
    return res.status(400).json({ error: "Missing message" });
  }

  try {
    // 1. Get all custom values
    log("Fetching custom values...");
    const customValuesRes = await fetch(GHL_CUSTOM_VALUES_URL, {
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    });
    const customValuesText = await customValuesRes.text();
    let customValueId = null;
    let customValuesData = {};
    if (!customValuesRes.ok) {
      log("Failed to fetch custom values", customValuesRes.status, customValuesText);
      return res.status(500).json({ 
        error: "Failed to fetch custom values", 
        details: customValuesText, 
        smsStep: "fetch-custom-values",
        debugToken
      });
    }
    try {
      customValuesData = JSON.parse(customValuesText);
    } catch (e) {
      log("Failed to parse custom values JSON", e, customValuesText);
      return res.status(500).json({ 
        error: "Failed to parse custom values JSON", 
        details: customValuesText, 
        smsStep: "parse-custom-values",
        debugToken
      });
    }
    const customValue = customValuesData.customValues?.find(
      v => v.name.trim().toLowerCase() === BOOSTER_SHOT_CUSTOM_VALUE_NAME.toLowerCase()
    );
    if (!customValue) {
      log("Custom value not found", BOOSTER_SHOT_CUSTOM_VALUE_NAME, customValuesData.customValues?.map(v=>v.name));
      return res.status(400).json({
        error: `Custom value "${BOOSTER_SHOT_CUSTOM_VALUE_NAME}" not found`,
        availableNames: customValuesData.customValues?.map(v => v.name),
        smsStep: "find-custom-value",
        debugToken
      });
    }
    customValueId = customValue.id;
    log("Booster Shot Custom Value ID:", customValueId);

    // 2. Update the custom value
    log("Updating custom value...");
    let customValueResult = null;
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
    const customValueText = await customValueRes.text();
    log("Custom value response:", customValueRes.status, customValueText);
    if (!customValueRes.ok) {
      customValueResult = { success: false, error: customValueText, status: customValueRes.status };
    } else {
      customValueResult = { success: true, status: customValueRes.status };
    }

    // 3. Fetch subaccount's main phone number
    log("Fetching location...");
    const locationRes = await fetch(GHL_API_LOCATION_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    });
    const locationText = await locationRes.text();
    log("Location response:", locationRes.status, locationText);
    let fromNumber = null;
    if (!locationRes.ok) {
      return res.status(500).json({ 
        error: "Failed to fetch location details", 
        details: locationText, 
        customValueResult, 
        smsStep: "fetch-location",
        debugToken
      });
    }
    let locationData = {};
    try {
      locationData = JSON.parse(locationText);
      fromNumber = locationData.phone;
    } catch (e) {
      log("Failed to parse location JSON", e, locationText);
      return res.status(500).json({ 
        error: "Failed to parse location JSON", 
        details: locationText, 
        customValueResult, 
        smsStep: "parse-location",
        debugToken
      });
    }

    // 4. Ensure contact exists
    log("Creating/updating contact...");
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
    const contactText = await contactRes.text();
    log("Contact response:", contactRes.status, contactText);
    if (!contactRes.ok) {
      return res.status(500).json({ 
        error: "Failed to create or update contact", 
        details: contactText, 
        customValueResult, 
        smsStep: "create-contact",
        debugToken
      });
    }

    // 5. Send the SMS
    log("Sending SMS...", {
      phone,
      message,
      locationId: LOCATION_ID
    });
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
    const smsText = await smsRes.text();
    log("SMS response:", smsRes.status, smsText);
    if (!smsRes.ok) {
      return res.status(500).json({
        error: "Failed to send test SMS",
        smsStatus: smsRes.status,
        smsResponse: smsText,
        customValueResult,
        smsStep: "send-sms",
        debugToken
      });
    }

    // Success!
    log("Test SMS sent successfully");
    return res.status(200).json({ 
      success: true, 
      fromNumber, 
      customValueResult, 
      smsStep: "success",
      debugToken,
      smsApiResponse: smsText
    });

  } catch (e) {
    log("Server exception:", e);
    return res.status(500).json({ 
      error: e.message || "Unknown error sending test SMS.",
      smsStep: "exception",
      debugToken
    });
  }
}
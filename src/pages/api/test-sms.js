const API_TOKEN = process.env.GHL_API_TOKEN || process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_ACCOUNT_ID;
const GHL_API_CONTACTS_URL = "https://rest.gohighlevel.com/v1/contacts";
const GHL_API_MESSAGES_URL = "https://rest.gohighlevel.com/v1/messages";
const GHL_CUSTOM_VALUES_URL = "https://rest.gohighlevel.com/v1/custom-values";
const GHL_API_MESSAGESEARCH_URL = "https://rest.gohighlevel.com/v1/messages/search";
const BOOSTER_SHOT_CUSTOM_VALUE_NAME = "Booster Shot Message";
const SUPPORT_NUMBER = "+13135131469"; // Hardcoded sender

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return text || "";
  }
}

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

  let customValueResult = null;

  try {
    // 1. Update the custom value
    const customValuesRes = await fetch(GHL_CUSTOM_VALUES_URL, {
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    });
    const customValuesText = await customValuesRes.text();
    const customValuesData = safeJson(customValuesText);

    const customValue = Array.isArray(customValuesData.customValues)
      ? customValuesData.customValues.find(
          v => v.name.trim().toLowerCase() === BOOSTER_SHOT_CUSTOM_VALUE_NAME.toLowerCase()
        )
      : undefined;

    if (customValue) {
      const customValueId = customValue.id;
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
      const customValueJson = safeJson(customValueText);
      customValueResult = customValueRes.ok
        ? { success: true, body: customValueJson }
        : { success: false, error: customValueJson.error || customValueRes.statusText, body: customValueJson };
    } else {
      customValueResult = { success: false, error: "Custom value not found" };
    }

    // 2. Ensure contact exists
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
    const contactData = safeJson(contactText);

    if (!contactRes.ok) {
      return res.status(500).json({ error: "Failed to create or update contact", contactText });
    }

    // 3. Send SMS from hardcoded support number
    const smsRes = await fetch(GHL_API_MESSAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone,
        message,
        locationId: LOCATION_ID,
        fromNumber: SUPPORT_NUMBER
      })
    });

    const smsHeaders = Object.fromEntries(smsRes.headers.entries());
    const smsStatus = smsRes.status;
    const smsStatusText = smsRes.statusText;
    const smsResponseBodyRaw = await smsRes.text();
    const smsResponseBody = safeJson(smsResponseBodyRaw);

    const finalApiResponse = {
      success: smsRes.ok,
      fromNumber: SUPPORT_NUMBER,
      customValueResult,
      contactData,
      smsApi: {
        status: smsStatus,
        statusText: smsStatusText,
        headers: smsHeaders,
        body: smsResponseBody
      },
      debugMeta: {
        time: new Date().toISOString(),
        handler: "test-sms",
        phone,
        message,
        locationId: LOCATION_ID,
        apiTokenFirst8: API_TOKEN?.slice(0,8)
      }
    };

    if (!smsRes.ok) {
      return res.status(500).json({ ...finalApiResponse, error: "Failed to send test SMS" });
    }
    return res.status(200).json(finalApiResponse);

  } catch (e) {
    return res.status(500).json({
      error: e.message || "Unknown error sending test SMS.",
      stack: e.stack
    });
  }
}
const API_TOKEN = process.env.GHL_API_TOKEN || process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_ACCOUNT_ID;
const GHL_API_CONTACTS_URL = "https://rest.gohighlevel.com/v1/contacts";
const GHL_API_MESSAGES_URL = "https://rest.gohighlevel.com/v1/messages";
const GHL_API_LOCATION_URL = `https://rest.gohighlevel.com/v1/locations/${LOCATION_ID}`;
const GHL_CUSTOM_VALUES_URL = "https://rest.gohighlevel.com/v1/custom-values";
const GHL_API_MESSAGESEARCH_URL = "https://rest.gohighlevel.com/v1/messages/search";
const BOOSTER_SHOT_CUSTOM_VALUE_NAME = "Booster Shot Message"; // exact match

// Utility: Sleep for ms milliseconds
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Utility: Safe JSON parse
function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return text || "";
  }
}

export default async function handler(req, res) {
  // Debug: Start of handler
  console.debug("[DEBUG] Handler invoked. Method:", req.method, "Time:", new Date().toISOString());

  if (req.method !== "POST") {
    console.debug("[DEBUG] Invalid HTTP method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone, message } = req.body;

  console.debug('[DEBUG] Incoming API request body:', req.body);

  // Debug: Env and config
  console.debug("[DEBUG] Loaded ENV", {
    API_TOKEN: API_TOKEN ? API_TOKEN.slice(0,8) + "...(hidden)" : undefined,
    LOCATION_ID,
    CONTACTS_URL: GHL_API_CONTACTS_URL,
    MESSAGES_URL: GHL_API_MESSAGES_URL,
    LOCATION_URL: GHL_API_LOCATION_URL,
    CUSTOM_VALUES_URL: GHL_CUSTOM_VALUES_URL,
    MESSAGESEARCH_URL: GHL_API_MESSAGESEARCH_URL
  });

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
    // 1. Fetch all custom values
    console.debug("[DEBUG] Fetching custom values:", GHL_CUSTOM_VALUES_URL);
    const customValuesRes = await fetch(GHL_CUSTOM_VALUES_URL, {
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    });
    console.debug("[DEBUG] Custom values response status:", customValuesRes.status, customValuesRes.statusText);
    const customValuesText = await customValuesRes.text();
    const customValuesData = safeJson(customValuesText);
    if (!customValuesRes.ok) {
      console.error("[DEBUG] Failed to fetch custom values:", customValuesText);
      return res.status(500).json({ error: "Failed to fetch custom values", customValuesText });
    }
    console.debug("[DEBUG] Custom values response body:", customValuesData);

    // 2. Find the custom value by name
    const customValue = Array.isArray(customValuesData.customValues)
      ? customValuesData.customValues.find(
          v => v.name.trim().toLowerCase() === BOOSTER_SHOT_CUSTOM_VALUE_NAME.toLowerCase()
        )
      : undefined;

    if (!customValue) {
      console.warn("[DEBUG] Custom value not found", BOOSTER_SHOT_CUSTOM_VALUE_NAME);
      return res.status(400).json({
        error: `Custom value "${BOOSTER_SHOT_CUSTOM_VALUE_NAME}" not found`,
        availableNames: Array.isArray(customValuesData.customValues)
          ? customValuesData.customValues.map(v => v.name)
          : []
      });
    }
    const customValueId = customValue.id;
    console.debug("[DEBUG] Matched customValueId:", customValueId);

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
      const customValueText = await customValueRes.text();
      const customValueJson = safeJson(customValueText);
      console.debug("[DEBUG] Custom value update response:", {
        status: customValueRes.status,
        statusText: customValueRes.statusText,
        body: customValueJson
      });
      if (!customValueRes.ok) {
        customValueResult = { success: false, error: customValueJson.error || customValueRes.statusText, body: customValueJson };
      } else {
        customValueResult = { success: true, body: customValueJson };
      }
    } catch (err) {
      console.error("[DEBUG] Exception updating custom value:", err);
      customValueResult = { success: false, error: err.message || "Unknown error" };
    }

    // 4. Fetch subaccount's main phone number
    console.debug("[DEBUG] Fetching location data:", GHL_API_LOCATION_URL);
    const locationRes = await fetch(GHL_API_LOCATION_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    });
    const locationText = await locationRes.text();
    const locationData = safeJson(locationText);
    console.debug("[DEBUG] Location fetch status:", locationRes.status, locationRes.statusText);
    console.debug("[DEBUG] Location data:", locationData);

    const fromNumber = locationData.phone || locationData?.business?.phone || undefined;
    console.debug("[DEBUG] Location phone for sending:", fromNumber);

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
    const contactText = await contactRes.text();
    const contactData = safeJson(contactText);
    console.debug("[DEBUG] Contact creation/update response:", {
      status: contactRes.status,
      statusText: contactRes.statusText,
      body: contactData
    });

    if (!contactRes.ok) {
      return res.status(500).json({ error: "Failed to create or update contact", contactText });
    }

    // 6. Send the SMS
    console.debug("[DEBUG] About to send SMS:", {
      url: GHL_API_MESSAGES_URL,
      payload: { phone, message, locationId: LOCATION_ID },
      headers: {
        Authorization: `Bearer ${API_TOKEN?.slice(0,8) + '...(hidden)'}`,
        "Content-Type": "application/json"
      }
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

    const smsHeaders = Object.fromEntries(smsRes.headers.entries());
    const smsStatus = smsRes.status;
    const smsStatusText = smsRes.statusText;
    const smsResponseBodyRaw = await smsRes.text();
    const smsResponseBody = safeJson(smsResponseBodyRaw);

    console.debug("[DEBUG] SMS response status:", smsStatus, smsStatusText);
    console.debug("[DEBUG] SMS response headers:", smsHeaders);
    console.debug("[DEBUG] SMS response body:", smsResponseBody);

    // 7. Wait and check status via /v1/messages/search
    let smsStatusInfo = null;
    let statusSearchUrl = `${GHL_API_MESSAGESEARCH_URL}?locationId=${encodeURIComponent(LOCATION_ID)}&toNumber=${encodeURIComponent(phone)}&limit=5`;

    if (smsRes.ok) {
      await delay(3000); // Wait for message to appear in GHL search index

      console.debug("[DEBUG] Checking SMS delivery status via:", statusSearchUrl);
      const statusRes = await fetch(statusSearchUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${API_TOKEN}` }
      });
      const statusHeaders = Object.fromEntries(statusRes.headers.entries());
      const statusResStatus = statusRes.status;
      const statusResStatusText = statusRes.statusText;
      const statusResBodyRaw = await statusRes.text();
      const statusResBody = safeJson(statusResBodyRaw);

      console.debug("[DEBUG] Delivery status response:", {
        url: statusSearchUrl,
        status: statusResStatus,
        statusText: statusResStatusText,
        headers: statusHeaders,
        body: statusResBody
      });

      if (Array.isArray(statusResBody?.messages) && statusResBody.messages.length > 0) {
        // Try to find the most recent matching outgoing message
        const msg = statusResBody.messages
          .filter(m =>
            m.direction === "outbound" &&
            m.toNumber?.replace(/[^0-9]/g, '') === phone.replace(/[^0-9]/g, '')
          )[0] || statusResBody.messages[0];
        smsStatusInfo = {
          id: msg?.id,
          status: msg?.status,
          deliveredAt: msg?.deliveredAt,
          sentAt: msg?.createdAt,
          to: msg?.toNumber,
          from: msg?.fromNumber,
          direction: msg?.direction,
          body: msg?.body,
          raw: msg
        };
      } else {
        smsStatusInfo = { raw: statusResBody };
      }
    }

    // 8. Final summary log
    const finalApiResponse = {
      success: smsRes.ok,
      fromNumber,
      customValueResult,
      contactData,
      smsApi: {
        status: smsStatus,
        statusText: smsStatusText,
        headers: smsHeaders,
        body: smsResponseBody
      },
      smsStatusInfo,
      debugMeta: {
        time: new Date().toISOString(),
        handler: "test-sms",
        phone,
        message,
        locationId: LOCATION_ID,
        apiTokenFirst8: API_TOKEN?.slice(0,8)
      }
    };
    console.debug("[DEBUG] Final API response:", finalApiResponse);

    if (!smsRes.ok) {
      return res.status(500).json({ ...finalApiResponse, error: "Failed to send test SMS" });
    }
    return res.status(200).json(finalApiResponse);

  } catch (e) {
    console.error("[DEBUG] Server Error:", e, e.stack);
    return res.status(500).json({
      error: e.message || "Unknown error sending test SMS.",
      stack: e.stack
    });
  }
}
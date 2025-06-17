const API_TOKEN = process.env.GHL_API_TOKEN || process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_ACCOUNT_ID;
const GHL_API_CONTACTS_URL = "https://rest.gohighlevel.com/v1/contacts";
const GHL_API_MESSAGES_URL = "https://rest.gohighlevel.com/v1/messages";
const GHL_API_LOCATION_URL = `https://rest.gohighlevel.com/v1/locations/${LOCATION_ID}`;
const GHL_CUSTOM_VALUES_URL = "https://rest.gohighlevel.com/v1/custom-values";
const GHL_API_MESSAGESEARCH_URL = "https://rest.gohighlevel.com/v1/messages/search";

const BOOSTER_SHOT_CUSTOM_VALUE_NAME = "Booster Shot Message"; // exact match

// Helper to wait (ms)
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    console.debug("[DEBUG] Invalid HTTP method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone, message } = req.body;

  console.debug('[DEBUG] Incoming API request body:', req.body);

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
    console.debug("[DEBUG] About to send SMS:", {
      url: GHL_API_MESSAGES_URL,
      payload: { phone, message, locationId: LOCATION_ID },
      headers: { Authorization: `Bearer ${API_TOKEN?.slice(0,8) + '...'}`, "Content-Type": "application/json" }
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

    console.debug("[DEBUG] SMS response status:", smsRes.status, smsRes.statusText);
    console.debug("[DEBUG] SMS response headers:", JSON.stringify([...smsRes.headers.entries()]));

    let smsResponseBodyRaw = await smsRes.text();
    console.debug("[DEBUG] SMS response body:", smsResponseBodyRaw);

    // In most GHL setups, the /v1/messages response doesn't directly provide a message ID.
    // We'll search for the most recent message to that number and try to confirm delivery status.

    let smsStatusInfo = null;

    if (smsRes.ok) {
      // Wait a moment to let GHL process and index the message
      await delay(2500);

      // Message search endpoint (filters: locationId, phone)
      // Best effort: get most recent message to this phone for this location
      let searchUrl = `${GHL_API_MESSAGESEARCH_URL}?locationId=${encodeURIComponent(LOCATION_ID)}&toNumber=${encodeURIComponent(phone)}&limit=3`;

      console.debug("[DEBUG] Checking SMS delivery status via:", searchUrl);
      const statusRes = await fetch(searchUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${API_TOKEN}` }
      });
      let statusResBody = await statusRes.text();
      try {
        statusResBody = JSON.parse(statusResBody);
      } catch {
        // leave as text
      }
      console.debug("[DEBUG] Delivery status response:", statusResBody);

      // Try to extract status for the most recent message
      if (Array.isArray(statusResBody?.messages) && statusResBody.messages.length > 0) {
        // Assume the most recent message matching our send
        const msg = statusResBody.messages[0];
        smsStatusInfo = {
          id: msg.id,
          status: msg.status,
          deliveredAt: msg.deliveredAt,
          sentAt: msg.createdAt,
          to: msg.toNumber,
          from: msg.fromNumber,
          direction: msg.direction,
          body: msg.body
        };
      } else {
        smsStatusInfo = { raw: statusResBody };
      }
    }

    if (!smsRes.ok) {
      return res.status(500).json({
        error: "Failed to send test SMS",
        smsApiRaw: smsResponseBodyRaw,
        smsApiStatus: smsRes.status,
        smsApiHeaders: [...smsRes.headers.entries()],
        payload: { phone, message, locationId: LOCATION_ID },
        smsStatusInfo
      });
    } else {
      let smsResponseBody = {};
      try {
        smsResponseBody = JSON.parse(smsResponseBodyRaw);
      } catch {
        smsResponseBody = smsResponseBodyRaw;
      }
      console.debug("[DEBUG] SMS send response (parsed):", smsResponseBody);

      // Return info back to the client, including message delivery status if found
      return res.status(200).json({
        success: true,
        fromNumber,
        customValueResult,
        contactData,
        smsApiResponse: smsResponseBody,
        smsStatusInfo
      });
    }
  } catch (e) {
    console.error("[DEBUG] Server Error:", e);
    return res.status(500).json({ error: e.message || "Unknown error sending test SMS." });
  }
}
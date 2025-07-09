/**
 * Handler for triggering a GoHighLevel workflow via webhook, and updating a custom value.
 * 
 * - Updates a custom value ("Booster Shot Message") in the subaccount as before.
 * - Ensures the contact exists (as before).
 * - Triggers your provided GHL workflow webhook instead of using /v1/messages (NO REST API needed).
 * - Returns success response if webhook POST is accepted (200 OK).
 * 
 * NOTE: The actual SMS is sent by the GHL workflow, not this script!
 */

const API_TOKEN = process.env.GHL_API_TOKEN || process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_ACCOUNT_ID;
const GHL_API_CONTACTS_URL = "https://rest.gohighlevel.com/v1/contacts";
const GHL_CUSTOM_VALUES_URL = "https://rest.gohighlevel.com/v1/custom-values";
const BOOSTER_SHOT_CUSTOM_VALUE_NAME = "Booster Shot Message";

// Your GHL workflow webhook URL
const GHL_WORKFLOW_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/zyqWCxyLmqChNzRwf630/webhook-trigger/beb4af91-ce2c-4a2b-b288-e6607b5024c6";

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

    // 2. Ensure contact exists (optional for workflow, but useful for reporting)
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

    // 3. Trigger the GHL workflow via webhook POST
    const webhookRes = await fetch(GHL_WORKFLOW_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message })
    });
    const webhookStatus = webhookRes.status;
    const webhookStatusText = webhookRes.statusText;
    const webhookBodyRaw = await webhookRes.text();
    const webhookBody = safeJson(webhookBodyRaw);

    const finalApiResponse = {
      success: webhookRes.ok,
      customValueResult,
      contactData,
      webhook: {
        status: webhookStatus,
        statusText: webhookStatusText,
        body: webhookBody
      },
      debugMeta: {
        time: new Date().toISOString(),
        handler: "send-ghl-workflow",
        phone,
        message,
        locationId: LOCATION_ID,
        apiTokenFirst8: API_TOKEN?.slice(0,8)
      }
    };

    if (!webhookRes.ok) {
      return res.status(500).json({ ...finalApiResponse, error: "Failed to trigger GHL workflow webhook" });
    }
    return res.status(200).json(finalApiResponse);

  } catch (e) {
    return res.status(500).json({
      error: e.message || "Unknown error sending workflow request.",
      stack: e.stack
    });
  }
}
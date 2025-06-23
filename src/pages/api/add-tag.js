const GHL_API_KEY = process.env.GHL_API_KEY || process.env.GHL_API_TOKEN;
const GHL_API_URL = "https://rest.gohighlevel.com/v1/contacts";
const CUSTOM_FIELDS_URL = "https://rest.gohighlevel.com/v1/custom-fields";
const BATCH_SIZE = 100;
const BATCH_INTERVAL = 10_000;

const BOOSTER_SMS_NAME_FIELD_NAME = "Booster Sms Name";
const BOOSTER_SHOT_CUSTOM_VALUE_NAME = "Booster shot message";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { contactIds, tag, boosterShotMessage, boosterCampaignName, locationId } = req.body;

  if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0 || !tag) {
    return res.status(400).json({ error: 'contactIds (array) and tag are required' });
  }

  if (!GHL_API_KEY) {
    return res.status(500).json({ error: 'API key missing' });
  }

  let results = [];
  let rateLimitHit = false;
  let resetTime = null;

  async function tagContact(contactId) {
    try {
      const response = await fetch(`${GHL_API_URL}/${contactId}/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tags: [tag] })
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('ratelimit-reset')) || 10;
        rateLimitHit = true;
        resetTime = retryAfter;
        return { contactId, success: false, error: 'Rate limit hit', resetTime: retryAfter };
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return { contactId, success: false, error: errData.error || response.statusText };
      }

      return { contactId, success: true };
    } catch (err) {
      return { contactId, success: false, error: err.message || 'Unknown error' };
    }
  }

  // Tagging contacts in batches
  for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
    const batch = contactIds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(tagContact));
    results.push(...batchResults);

    if (rateLimitHit) break;
    if (i + BATCH_SIZE < contactIds.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_INTERVAL));
    }
  }

  // Set Custom Value for Booster Shot Message (location-wide), dynamically get the ID
  let customValueResult = null;
  if (boosterShotMessage && locationId) {
    try {
      const GHL_CUSTOM_VALUES_URL = "https://rest.gohighlevel.com/v1/custom-values";
      const customValuesRes = await fetch(GHL_CUSTOM_VALUES_URL, {
        headers: { 'Authorization': `Bearer ${GHL_API_KEY}` }
      });
      if (!customValuesRes.ok) {
        const error = await customValuesRes.text();
        customValueResult = { success: false, error: "Failed to fetch custom values: " + error };
      } else {
        const customValuesData = await customValuesRes.json();
        const customValue = customValuesData.customValues.find(
          v => v.name && v.name.trim().toLowerCase() === BOOSTER_SHOT_CUSTOM_VALUE_NAME.toLowerCase()
        );
        if (!customValue) {
          customValueResult = {
            success: false,
            error: `Custom value "${BOOSTER_SHOT_CUSTOM_VALUE_NAME}" not found`
          };
        } else {
          const customValueRes = await fetch(`${GHL_CUSTOM_VALUES_URL}/${customValue.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${GHL_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              value: boosterShotMessage,
              locationId
            })
          });

          if (!customValueRes.ok) {
            const errData = await customValueRes.json().catch(() => ({}));
            customValueResult = { success: false, error: errData.error || customValueRes.statusText };
          } else {
            customValueResult = { success: true };
          }
        }
      }
    } catch (err) {
      customValueResult = { success: false, error: err.message || 'Unknown error' };
    }
  }

  // Set Booster Sms Name as custom field for each contact, now using PATCH
  let boosterSmsNameResults = [];
  if (boosterCampaignName && contactIds.length > 0 && locationId) {
    let fieldId = null;
    try {
      const fieldsRes = await fetch(`${CUSTOM_FIELDS_URL}/?locationId=${locationId}`, {
        headers: { 'Authorization': `Bearer ${GHL_API_KEY}` }
      });
      if (fieldsRes.ok) {
        const fieldsData = await fieldsRes.json();
        const found = fieldsData.customFields.find(f =>
          f.name && f.name.trim().toLowerCase() === BOOSTER_SMS_NAME_FIELD_NAME.toLowerCase()
        );
        if (found) fieldId = found.id;
      }
    } catch (e) {}
    if (fieldId) {
      for (const contactId of contactIds) {
        try {
          const updateRes = await fetch(`${GHL_API_URL}/${contactId}/customFields`, {
            method: "PATCH", // PATCH instead of POST
            headers: {
              'Authorization': `Bearer ${GHL_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify([
              { field: fieldId, value: boosterCampaignName }
            ])
          });
          if (!updateRes.ok) {
            const errData = await updateRes.json().catch(() => ({}));
            boosterSmsNameResults.push({ contactId, success: false, error: errData.error || updateRes.statusText });
          } else {
            boosterSmsNameResults.push({ contactId, success: true });
          }
        } catch (err) {
          boosterSmsNameResults.push({ contactId, success: false, error: err.message || 'Unknown error' });
        }
      }
    } else {
      boosterSmsNameResults = contactIds.map(contactId => ({
        contactId, success: false,
        error: `Custom field "${BOOSTER_SMS_NAME_FIELD_NAME}" not found for location`
      }));
    }
  }

  if (rateLimitHit) {
    return res.status(429).json({
      error: `Rate limit exceeded. Try again after ${resetTime} seconds.`,
      results,
      resetTime,
      customValueResult,
      boosterSmsNameResults
    });
  }

  // Success
  return res.status(200).json({ results, customValueResult, boosterSmsNameResults });
}
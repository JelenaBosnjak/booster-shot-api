export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const API_TOKEN = process.env.GHL_API_TOKEN;
  if (!API_TOKEN) {
    return res.status(500).json({ error: "Missing API token" });
  }

  // Extract all campaign launches (timestamp + campaign name) from a booster field string
  function extractAllCampaignTimestampsAndNames(str) {
    if (!str) return [];
    const regex = /Campaign Name:\s*([^;]+);\s*Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})(?:\s+(\d{2}:\d{2}))?/g;
    let launches = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
      const [_, campaignName, datePart, timePart] = match;
      const [month, day, year] = datePart.split('/');
      let isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      if (timePart) {
        isoString += 'T' + timePart;
      }
      launches.push({
        iso: isoString,
        campaignName: campaignName.trim()
      });
    }
    return launches;
  }

  // Extract all campaign names from a string like "Campaign Name: ...; Date: ...; ...||Campaign Name: ...; Date: ...; ..."
  function extractAllCampaignNames(str) {
    if (!str) return [];
    const regex = /Campaign Name:\s*([^;]+);/g;
    let names = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
      names.push(match[1].trim());
    }
    return names;
  }

  try {
    // 1. Fetch all custom fields to get the ID for "Booster History Data" and "1st Message Sent"
    const fieldsUrl = `https://rest.gohighlevel.com/v1/custom-fields/`;
    const fieldsResponse = await fetch(fieldsUrl, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!fieldsResponse.ok) {
      let error;
      try {
        error = await fieldsResponse.json();
      } catch {
        error = { message: "Unknown API error" };
      }
      return res
        .status(fieldsResponse.status)
        .json({ error: error.message || "API Error" });
    }

    const fieldsData = await fieldsResponse.json();
    const boosterFieldObj = (fieldsData.customFields || []).find(
      (f) => f.name && f.name.toLowerCase() === "booster history data"
    );
    const firstMsgFieldObj = (fieldsData.customFields || []).find(
      (f) => f.name && f.name.toLowerCase() === "1st message sent"
    );

    if (!boosterFieldObj) {
      return res
        .status(200)
        .json({ error: 'Custom field "Booster History Data" not found.', count: 0, contacts: [], previousCampaigns: [] });
    }
    if (!firstMsgFieldObj) {
      return res
        .status(200)
        .json({ error: 'Custom field "1st Message Sent" not found.', count: 0, contacts: [], previousCampaigns: [] });
    }

    const boosterFieldId = boosterFieldObj.id;
    const firstMsgFieldId = firstMsgFieldObj.id;

    // 2. Fetch contacts
    const ghlUrl = `https://rest.gohighlevel.com/v1/contacts?limit=100`;
    const response = await fetch(ghlUrl, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let error;
      try {
        error = await response.json();
      } catch {
        error = { message: "Unknown API error" };
      }
      return res
        .status(response.status)
        .json({ error: error.message || "API Error" });
    }

    const data = await response.json();
    const contacts = data.contacts || [];

    // campaignKey = `${campaignName}::${isoString}`
    const campaignMap = {};
    const campaignContacts = {};
    const campaignFirstMsgCounts = {};

    contacts.forEach((contact) => {
      const boosterFields = (contact.customField || []).filter(
        (field) => field.id === boosterFieldId && !!field.value
      );
      const firstMsgField = (contact.customField || []).find(
        (field) => field.id === firstMsgFieldId && !!field.value
      );
      // Extract all campaign names from 1st Message Sent field for this contact
      const sentCampaignNames = firstMsgField ? extractAllCampaignNames(firstMsgField.value) : [];

      boosterFields.forEach(field => {
        const launches = extractAllCampaignTimestampsAndNames(field.value);
        launches.forEach(({ iso, campaignName }) => {
          const campaignKey = `${campaignName}::${iso}`;
          if (!campaignMap[campaignKey]) {
            campaignMap[campaignKey] = {
              name: campaignName,
              date: iso,
              status: "Done"
            };
            campaignContacts[campaignKey] = [];
            campaignFirstMsgCounts[campaignKey] = 0;
          }
          campaignContacts[campaignKey].push({
            id: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            phone: contact.phone
          });

          // Only count as "1st Message Sent" if campaign name matches
          if (sentCampaignNames.includes(campaignName)) {
            campaignFirstMsgCounts[campaignKey]++;
          }
        });
      });
    });

    // Convert to array and sort by date descending
    const previousCampaigns = Object.values(campaignMap)
      .map(campaign => ({
        ...campaign,
        contacts: campaignContacts[`${campaign.name}::${campaign.date}`] || [],
        firstMsgCount: campaignFirstMsgCounts[`${campaign.name}::${campaign.date}`] || 0
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Usual stats for rest of the page
    let timestampToContacts = {};
    let timestampToNames = {};
    const boosterContacts = contacts
      .map((contact) => {
        const boosterFields = (contact.customField || []).filter(
          (field) => field.id === boosterFieldId && !!field.value
        );
        let allTimestamps = [];
        boosterFields.forEach(field => {
          const launches = extractAllCampaignTimestampsAndNames(field.value);
          launches.forEach(({ iso, campaignName }) => {
            allTimestamps.push(iso);
            if (!timestampToContacts[iso]) timestampToContacts[iso] = new Set();
            timestampToContacts[iso].add(contact.id);
            if (!timestampToNames[iso]) timestampToNames[iso] = new Set();
            timestampToNames[iso].add(campaignName);
          });
        });
        return {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          boosterFields: boosterFields.map((field) => ({
            id: field.id,
            value: field.value,
          })),
          campaignTimestamps: allTimestamps
        };
      })
      .filter(c => c.campaignTimestamps.length > 0);

    const allTimestampsSorted = Object.keys(timestampToContacts).sort((a, b) => new Date(b) - new Date(a));

    const currentTimestamp = allTimestampsSorted[0] || null;
    const previousTimestamp = allTimestampsSorted[1] || null;

    const contactsWithCurrent = currentTimestamp ? Array.from(timestampToContacts[currentTimestamp]) : [];
    const contactsWithPrevious = previousTimestamp ? Array.from(timestampToContacts[previousTimestamp]) : [];

    const getNamesForTimestamp = (ts) => {
      if (!ts || !timestampToNames[ts]) return null;
      const arr = Array.from(timestampToNames[ts]);
      return arr.length === 1 ? arr[0] : arr.join(", ");
    };

    // Find "firstMsgCount" for current and previous campaigns
    const currentCampaignKey = previousCampaigns.length > 0
      ? `${previousCampaigns[0].name}::${previousCampaigns[0].date}`
      : null;
    const previousCampaignKey = previousCampaigns.length > 1
      ? `${previousCampaigns[1].name}::${previousCampaigns[1].date}`
      : null;

    return res.status(200).json({
      previousCampaigns,
      count: boosterContacts.length,
      contacts: boosterContacts,
      previous: contactsWithPrevious.length,
      current: contactsWithCurrent.length,
      currentBoosterCampaignName: getNamesForTimestamp(currentTimestamp),
      previousBoosterCampaignName: getNamesForTimestamp(previousTimestamp),
      currentCampaignTimestamp: currentTimestamp ? new Date(currentTimestamp).toISOString() : null,
      previousCampaignTimestamp: previousTimestamp ? new Date(previousTimestamp).toISOString() : null,
      totalCampaigns: allTimestampsSorted.length,
      currentFirstMsgCount: currentCampaignKey ? campaignFirstMsgCounts[currentCampaignKey] || 0 : 0,
      previousFirstMsgCount: previousCampaignKey ? campaignFirstMsgCounts[previousCampaignKey] || 0 : 0
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
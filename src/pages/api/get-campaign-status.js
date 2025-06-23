export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const API_TOKEN = process.env.GHL_API_TOKEN;
  if (!API_TOKEN) {
    return res.status(500).json({ error: "Missing API token" });
  }

  // Extract all campaign launches (name + datetime) from a booster field string
  function extractAllCampaignLaunches(str) {
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
        campaignName: campaignName.trim(),
        campaignDate: new Date(isoString),
        iso: isoString,
        raw: match[0]
      });
    }
    return launches;
  }

  try {
    // 1. Fetch all custom fields to get the ID for "Booster History Data"
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

    if (!boosterFieldObj) {
      return res
        .status(200)
        .json({ error: 'Custom field "Booster History Data" not found.', count: 0, contacts: [] });
    }

    const boosterFieldId = boosterFieldObj.id;

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

    // Fetch custom value for Booster Campaign Name (location-wide)
    let boosterCampaignName = null;
    const locationId = contacts[0]?.locationId;
    if (locationId) {
      const customValuesRes = await fetch(
        `https://rest.gohighlevel.com/v1/custom-values?locationId=${locationId}`,
        { headers: { Authorization: `Bearer ${API_TOKEN}` } }
      );
      if (customValuesRes.ok) {
        const customValuesData = await customValuesRes.json();
        const customValue = (customValuesData.customValues || []).find(
          v => v.name && v.name.trim().toLowerCase() === "booster campaign name"
        );
        if (customValue) boosterCampaignName = customValue.value || null;
      }
    }

    // Extract all launches for all contacts
    let allLaunches = [];
    const boosterContacts = contacts
      .map((contact) => {
        const boosterFields = (contact.customField || []).filter(
          (field) => field.id === boosterFieldId && !!field.value
        );
        let launches = [];
        boosterFields.forEach(field => {
          launches = launches.concat(extractAllCampaignLaunches(field.value));
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
          launches
        };
      })
      .filter(c => c.launches.length > 0);

    // Flatten all launches for all contacts
    boosterContacts.forEach(c => {
      c.launches.forEach(l => {
        allLaunches.push({
          ...l,
          contactId: c.id
        });
      });
    });

    // Only consider launches for the current campaign name
    const currentCampaignName = boosterCampaignName;
    const currentNameLaunches = allLaunches.filter(l => l.campaignName === currentCampaignName);

    // Find all unique ISO datetime launches (campaign runs) for this name
    const uniqueIsoLaunches = Array.from(new Set(currentNameLaunches.map(l => l.iso)));
    // Sort descending (latest first)
    uniqueIsoLaunches.sort((a, b) => new Date(b) - new Date(a));

    // Determine current and previous campaign timestamps
    const currentIso = uniqueIsoLaunches[0] || null;
    const previousIso = uniqueIsoLaunches[1] || null;

    // Count contacts with the latest and previous timestamp
    const contactsWithCurrent = new Set(
      currentNameLaunches.filter(l => l.iso === currentIso).map(l => l.contactId)
    );
    const contactsWithPrevious = new Set(
      currentNameLaunches.filter(l => l.iso === previousIso).map(l => l.contactId)
    );

    return res.status(200).json({
      count: boosterContacts.length,
      contacts: boosterContacts.map(({ launches, ...rest }) => rest),
      previous: contactsWithPrevious.size,
      current: contactsWithCurrent.size,
      currentBoosterCampaignName: currentCampaignName,
      currentCampaignTimestamp: currentIso ? new Date(currentIso).toISOString() : null,
      previousCampaignTimestamp: previousIso ? new Date(previousIso).toISOString() : null,
      totalCampaigns: uniqueIsoLaunches.length
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
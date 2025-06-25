export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const API_TOKEN = process.env.GHL_API_TOKEN;
  if (!API_TOKEN) {
    return res.status(500).json({ error: "Missing API token" });
  }

  // Utility to extract campaign launches (name, date, time) from the custom field string
  function extractAllCampaignLaunches(str) {
    if (!str) return [];
    const regex = /Campaign Name:\s*([^;]+);\s*Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})(?:\s+(\d{2}:\d{2}))?/g;
    let launches = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
      const [_, campaignName, datePart, timePart] = match;
      const [month, day, year] = datePart.split('/');
      let isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      if (timePart) isoString += 'T' + timePart;
      launches.push({
        campaignName: campaignName.trim(),
        iso: isoString,
        date: new Date(isoString),
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
      return res.status(fieldsResponse.status).json({ error: error.message || "API Error" });
    }

    const fieldsData = await fieldsResponse.json();
    const boosterFieldObj = (fieldsData.customFields || []).find(
      (f) => f.name && f.name.toLowerCase() === "booster history data"
    );

    if (!boosterFieldObj) {
      return res.status(200).json({ error: 'Custom field "Booster History Data" not found.', count: 0, contacts: [], previousCampaigns: [] });
    }

    const boosterFieldId = boosterFieldObj.id;

    // 2. Fetch contacts
    let allContacts = [];
    let nextPageUrl = `https://rest.gohighlevel.com/v1/contacts?limit=100`;
    while (nextPageUrl) {
      const response = await fetch(nextPageUrl, {
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
        return res.status(response.status).json({ error: error.message || "API Error" });
      }

      const data = await response.json();
      allContacts = allContacts.concat(data.contacts || []);
      nextPageUrl = data.meta && data.meta.nextPageUrl ? data.meta.nextPageUrl : null;
    }

    // 3. Build campaign instances: { [campaignKey]: { name, date, stats: { total, ... } } }
    // We'll use campaignKey as `${campaignName}::${iso}` for uniqueness.
    const campaignMap = {};
    const campaignOrder = []; // To preserve order for display
    const contactsByCampaign = {};

    allContacts.forEach((contact) => {
      const boosterFields = (contact.customField || []).filter(
        (field) => field.id === boosterFieldId && !!field.value
      );
      boosterFields.forEach(field => {
        const launches = extractAllCampaignLaunches(field.value);
        launches.forEach(({ campaignName, iso, date }) => {
          const campaignKey = `${campaignName}::${iso}`;
          // Init if not present
          if (!campaignMap[campaignKey]) {
            campaignMap[campaignKey] = {
              name: campaignName,
              date: iso,
              status: "Done", // You can adjust if you have real status
              stats: {
                total: 0,
                firstMsg: 0, // If you track this elsewhere
                remaining: 0, // If you track this elsewhere
                waiting: 0,   // If you track this elsewhere
                responded: 0, // If you track this elsewhere
                noResponse: 0 // If you track this elsewhere
              }
            };
            campaignOrder.push({ campaignKey, date: new Date(iso) });
            contactsByCampaign[campaignKey] = [];
          }
          campaignMap[campaignKey].stats.total += 1; // Just count appearances in contacts
          contactsByCampaign[campaignKey].push(contact.id);
        });
      });
    });

    // Sort campaigns by date, latest first
    campaignOrder.sort((a, b) => b.date - a.date);

    // Build the previousCampaigns array for the frontend
    const previousCampaigns = campaignOrder.map(({ campaignKey }) => campaignMap[campaignKey]);

    // If you have logic to fill in real stats (firstMsg, responded, etc.), do it here.
    // Otherwise, they will be 0 for now.

    // The rest of the data for the current/previous campaign cards
    const allTimestampsSorted = campaignOrder.map((c) => c.date.toISOString());
    const currentTimestamp = allTimestampsSorted[0] || null;
    const previousTimestamp = allTimestampsSorted[1] || null;
    const getNamesForTimestamp = (ts) => {
      const found = campaignOrder.find((c) => c.date.toISOString() === ts);
      return found
        ? campaignMap[found.campaignKey].name
        : null;
    };

    return res.status(200).json({
      count: previousCampaigns.reduce((acc, c) => acc + c.stats.total, 0),
      contacts: allContacts,
      previousCampaigns,
      previous: previousTimestamp ? contactsByCampaign[Object.keys(campaignMap).find(key => campaignMap[key].date === previousTimestamp)].length : 0,
      current: currentTimestamp ? contactsByCampaign[Object.keys(campaignMap).find(key => campaignMap[key].date === currentTimestamp)].length : 0,
      currentBoosterCampaignName: getNamesForTimestamp(currentTimestamp),
      previousBoosterCampaignName: getNamesForTimestamp(previousTimestamp),
      currentCampaignTimestamp: currentTimestamp,
      previousCampaignTimestamp: previousTimestamp,
      totalCampaigns: previousCampaigns.length
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
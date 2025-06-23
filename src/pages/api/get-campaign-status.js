export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const API_TOKEN = process.env.GHL_API_TOKEN;
  if (!API_TOKEN) {
    return res.status(500).json({ error: "Missing API token" });
  }

  // Helper: extract full MM/DD/YYYY HH:MM:SS from a string like "...; Date: 06/23/2025 17:13:08"
  function extractCampaignDateTime(str) {
    if (!str) return null;
    const match = str.match(/Date:\s*(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}:\d{2}))?/);
    if (!match) return null;
    const [, datePart, timePart] = match;
    const [month, day, year] = datePart.split('/');
    let isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    if (timePart) {
      isoString += 'T' + timePart;
    }
    return new Date(isoString);
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
    const locationId = contacts[0]?.locationId; // Use first contact's locationId if available
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

    // Build up arrays of all booster fields per contact, including full datetime
    const boosterContacts = contacts
      .map((contact) => {
        const boosterFields = (contact.customField || []).filter(
          (field) => field.id === boosterFieldId && !!field.value
        );
        let allDates = [];
        let allDateTimes = [];
        boosterFields.forEach(field => {
          // Extract full datetime
          const dt = extractCampaignDateTime(field.value);
          if (dt) allDateTimes.push(dt);
          // For compatibility, keep only date for isoBoosterDates
          const regex = /(\d{1,2}\/\d{1,2}\/\d{4})/g;
          const matches = (field.value.match(regex) || []);
          matches.forEach((dateStr) => {
            const parts = dateStr.split("/");
            if (parts.length === 3) {
              const date = new Date(`${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`);
              if (date instanceof Date && !isNaN(date.getTime())) {
                allDates.push(date);
              }
            }
          });
        });
        const isoDates = allDates.map(d => d.toISOString().slice(0, 10));
        return {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          boosterFields: boosterFields.map((field) => ({
            id: field.id,
            value: field.value,
          })),
          boosterCampaignName,
          boosterDates: allDates,
          boosterDateTimes: allDateTimes,
          isoBoosterDates: isoDates
        };
      })
      .filter((c) => c.boosterDates.length > 0);

    // Build a flat array of all campaign events: {campaignName, campaignDate: JS Date, rawValue}
    let allCampaignEvents = [];
    boosterContacts.forEach(contact => {
      (contact.boosterFields || []).forEach(field => {
        const dt = extractCampaignDateTime(field.value);
        if (dt) {
          allCampaignEvents.push({
            campaignName: contact.boosterCampaignName || "",
            campaignDate: dt,
            rawValue: field.value,
            contactId: contact.id,
          });
        }
      });
    });
    // Only keep events with campaignDate and campaignName
    allCampaignEvents = allCampaignEvents.filter(ev => ev.campaignDate && ev.campaignName);

    // Sort all events by date descending
    allCampaignEvents.sort((a, b) => b.campaignDate - a.campaignDate);

    // Group by campaignName + campaignDate ISO string to get unique launches
    let uniqueCampaigns = [];
    let seen = {};
    allCampaignEvents.forEach(ev => {
      const key = `${ev.campaignName}|${ev.campaignDate.toISOString()}`;
      if (!seen[key]) {
        uniqueCampaigns.push(ev);
        seen[key] = true;
      }
    });

    // Get unique launches for the current campaign name
    const launchesForCurrentName = uniqueCampaigns.filter(ev => ev.campaignName === boosterCampaignName);

    // If more than one launch for the same day, sort by date+time
    // The most recent is "current", the one before is "previous"
    let currentCampaignTimestamp = null;
    let previousCampaignTimestamp = null;
    if (launchesForCurrentName.length > 0) {
      currentCampaignTimestamp = launchesForCurrentName[0].campaignDate.toISOString();
      if (launchesForCurrentName[1]) {
        previousCampaignTimestamp = launchesForCurrentName[1].campaignDate.toISOString();
      }
    }

    // For legacy fields: still provide previous/current counts, but now you can distinguish by full timestamp if needed in frontend

    let allBoosterDates = [];
    boosterContacts.forEach(c => allBoosterDates = allBoosterDates.concat(c.boosterDates));
    if (allBoosterDates.length === 0) {
      return res.status(200).json({
        count: 0,
        contacts: [],
        previous: 0,
        current: 0
      });
    }
    const minDate = new Date(Math.min(...allBoosterDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allBoosterDates.map(d => d.getTime())));
    const minDateIso = minDate.toISOString().slice(0, 10);
    const maxDateIso = maxDate.toISOString().slice(0, 10);

    let previous = 0;
    let current = 0;
    boosterContacts.forEach(c => {
      if (c.isoBoosterDates.includes(minDateIso)) previous++;
      if (c.isoBoosterDates.includes(maxDateIso)) current++;
    });

    return res.status(200).json({
      count: boosterContacts.length,
      contacts: boosterContacts.map(
        ({ boosterDates, boosterDateTimes, isoBoosterDates, ...rest }) => rest
      ),
      previous,
      current,
      currentBoosterCampaignName: boosterCampaignName,
      currentCampaignTimestamp,
      previousCampaignTimestamp
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
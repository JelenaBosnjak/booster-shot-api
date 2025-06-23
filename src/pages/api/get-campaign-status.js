export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const API_TOKEN = process.env.GHL_API_TOKEN;
  if (!API_TOKEN) {
    return res.status(500).json({ error: "Missing API token" });
  }

  // Helper: extract all MM/DD/YYYY dates from a string
  function extractBoosterDates(str) {
    const regex = /(\d{1,2}\/\d{1,2}\/\d{4})/g;
    const matches = (str.match(regex) || []);
    return matches
      .map((dateStr) => {
        const parts = dateStr.split("/");
        if (parts.length !== 3) return null;
        return new Date(`${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`);
      })
      .filter((date) => date instanceof Date && !isNaN(date.getTime()));
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

    // --- NEW: Fetch custom value for Booster Campaign Name (location-wide) ---
    // You may want to get locationId from query or from one of the contacts.
    // If your app is single-location, you can hardcode it or pass it as a query param.
    // For multi-location, adapt as needed.
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

    // --- Build up arrays of all booster dates per contact ---
    const boosterContacts = contacts
      .map((contact) => {
        const boosterFields = (contact.customField || []).filter(
          (field) => field.id === boosterFieldId && !!field.value
        );
        let allDates = [];
        boosterFields.forEach(field => {
          allDates = allDates.concat(extractBoosterDates(field.value));
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
          isoBoosterDates: isoDates
        };
      })
      .filter((c) => c.boosterDates.length > 0);

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

    // The most common campaign name among latest booster contacts (they all have the same, now from custom value)
    let currentBoosterCampaignName = boosterCampaignName;

    return res.status(200).json({
      count: boosterContacts.length,
      contacts: boosterContacts.map(
        ({ boosterDates, isoBoosterDates, ...rest }) => rest
      ),
      previous,
      current,
      currentBoosterCampaignName
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
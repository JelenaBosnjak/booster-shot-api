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
    // Match MM/DD/YYYY (with or without leading/trailing spaces and dashes)
    const regex = /(\d{1,2}\/\d{1,2}\/\d{4})/g;
    const matches = (str.match(regex) || []);
    // Convert to Date objects, filter valid
    return matches
      .map((dateStr) => {
        // Convert MM/DD/YYYY to YYYY-MM-DD for Date constructor
        const parts = dateStr.split("/");
        if (parts.length !== 3) return null;
        // Use Date.UTC to avoid timezone issues
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
    // Always look for "Booster History Data" (case-insensitive)
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

    // Build up arrays of all booster dates per contact
    const boosterContacts = contacts
      .map((contact) => {
        const boosterFields = (contact.customField || []).filter(
          (field) => field.id === boosterFieldId && !!field.value
        );
        // There might be more than one value, but usually only one per contact
        let allDates = [];
        boosterFields.forEach(field => {
          allDates = allDates.concat(extractBoosterDates(field.value));
        });
        // Convert to ISO string for easy comparison
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
          boosterDates: allDates, // Array of JS Date
          isoBoosterDates: isoDates // Array of "YYYY-MM-DD"
        };
      })
      .filter((c) => c.boosterDates.length > 0);

    // Now, find the overall earliest/latest booster shot date among all contacts
    let allBoosterDates = [];
    boosterContacts.forEach(c => allBoosterDates = allBoosterDates.concat(c.boosterDates));
    if (allBoosterDates.length === 0) {
      // No booster dates at all
      return res.status(200).json({
        count: 0,
        contacts: [],
        previous: 0,
        current: 0
      });
    }
    // Get min and max date as ISO string (YYYY-MM-DD)
    const minDate = new Date(Math.min(...allBoosterDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allBoosterDates.map(d => d.getTime())));
    const minDateIso = minDate.toISOString().slice(0, 10);
    const maxDateIso = maxDate.toISOString().slice(0, 10);

    // Now, for each contact, if their earliest booster date is minDate, count as previous
    // If their latest booster date is maxDate, count as current
    let previous = 0;
    let current = 0;
    boosterContacts.forEach(c => {
      if (c.isoBoosterDates.includes(minDateIso)) previous++;
      if (c.isoBoosterDates.includes(maxDateIso)) current++;
    });

    // Return contacts as before, but without the extra fields
    return res.status(200).json({
      count: boosterContacts.length,
      contacts: boosterContacts.map(
        ({ boosterDates, isoBoosterDates, ...rest }) => rest
      ),
      previous,
      current,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
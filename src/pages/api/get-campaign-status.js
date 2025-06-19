export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const API_TOKEN = process.env.GHL_API_TOKEN;
  if (!API_TOKEN) {
    return res.status(500).json({ error: "Missing API token" });
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

    // 3. List all contacts that have the "Booster History Data" custom field
    const boosterContacts = contacts.filter((contact) =>
      (contact.customField || []).some(
        (field) => field.id === boosterFieldId && !!field.value
      )
    );

    // 4. For debug: return the number and details (id, name, phone, field value)
    const result = boosterContacts.map((contact) => ({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      boosterFields: (contact.customField || [])
        .filter((field) => field.id === boosterFieldId && !!field.value)
        .map((field) => ({ id: field.id, value: field.value })),
    }));

    // For demo: previous/current are always 0, but can be changed if needed
    return res.status(200).json({ count: result.length, contacts: result, previous: 0, current: 0 });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message || "Internal Server Error" });
  }
}
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_TOKEN = process.env.GHL_API_TOKEN;
  const { locationId } = req.query;

  if (!API_TOKEN) {
    return res.status(500).json({ error: 'Missing API token' });
  }

  // Use your actual custom field key for import history
  const IMPORT_DATE_FIELD_KEY = 'import_history';

  async function fetchAllContactsByLocation() {
    let allContacts = [];
    let nextPageToken = null;
    let nextPageId = null;

    do {
      const params = new URLSearchParams();
      params.append('limit', 100);
      if (locationId) params.append('locationId', locationId);
      if (nextPageToken) params.append('startAfter', nextPageToken);
      if (nextPageId) params.append('startAfterId', nextPageId);

      const ghlUrl = `https://rest.gohighlevel.com/v1/contacts?${params.toString()}`;
      const resp = await fetch(ghlUrl, {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!resp.ok) {
        let error;
        try {
          error = await resp.json();
        } catch {
          error = { message: 'Unknown API error' };
        }
        throw new Error(error.message || 'API Error');
      }

      const data = await resp.json();
      const contacts = data.contacts || [];
      allContacts.push(...contacts);

      nextPageToken = data.meta?.startAfter || null;
      nextPageId = data.meta?.startAfterId || null;
    } while (nextPageToken && nextPageId);

    return allContacts;
  }

  try {
    // 1. Fetch all contacts for the location
    const contacts = await fetchAllContactsByLocation();

    // 2. Determine all unique import dates from the custom field
    const importDates = contacts
      .map(c => c.customField && c.customField[IMPORT_DATE_FIELD_KEY])
      .filter(Boolean);

    if (importDates.length === 0) {
      return res.status(200).json({
        contacts: [],
        total: 0,
        latestImportDate: null,
        message: 'No imported contacts with an import date field found.'
      });
    }

    // 3. Find the latest date (ISO string or string compare is fine if format is ISO)
    const latestImportDate = importDates.sort().reverse()[0];

    // 4. Filter contacts with that latest import date
    const latestContacts = contacts.filter(
      c => c.customField && c.customField[IMPORT_DATE_FIELD_KEY] === latestImportDate
    );

    return res.status(200).json({
      contacts: latestContacts,
      total: latestContacts.length,
      latestImportDate
    });
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
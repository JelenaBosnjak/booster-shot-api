export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_TOKEN = process.env.GHL_API_TOKEN;
  const { locationId, limit = 20, startAfter, startAfterId, latestImport } = req.query;

  if (!API_TOKEN) {
    return res.status(500).json({ error: 'Missing API token' });
  }

  const IMPORT_DATE_FIELD_KEY = 'import_history';

  // Helper: Get import date from a contact (works for both object and array style)
  function getImportDate(contact) {
    // Array style (most common)
    if (Array.isArray(contact.customFields)) {
      const found = contact.customFields.find(f => f.key === IMPORT_DATE_FIELD_KEY);
      return found && found.value;
    }
    // Object style (rare)
    if (contact.customField && typeof contact.customField === 'object') {
      return contact.customField[IMPORT_DATE_FIELD_KEY];
    }
    return null;
  }

  // Helper: fetch all contacts for latest import functionality
  async function fetchAllContactsByLocation() {
    let allContacts = [];
    let nextPageToken = null;
    let nextPageId = null;
    let page = 1;

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
        console.error('GHL API Error:', error);
        throw new Error(error.message || 'API Error');
      }

      const data = await resp.json();
      const contacts = data.contacts || [];
      allContacts.push(...contacts);

      // Debug: log the first contact and page info
      if (contacts.length && page === 1) {
        console.log("=== Debug: Sample contact object (page 1) ===");
        console.log(JSON.stringify(contacts[0], null, 2));
        if (contacts[0].customFields) {
          console.log("=== Debug: customFields ===");
          console.log(JSON.stringify(contacts[0].customFields, null, 2));
        }
        if (contacts[0].customField) {
          console.log("=== Debug: customField ===");
          console.log(JSON.stringify(contacts[0].customField, null, 2));
        }
      }

      nextPageToken = data.meta?.startAfter || null;
      nextPageId = data.meta?.startAfterId || null;
      page += 1;
    } while (nextPageToken && nextPageId);

    // Debug: total contacts fetched
    console.log(`Fetched total ${allContacts.length} contacts.`);
    return allContacts;
  }

  try {
    // SPECIAL MODE: Only return latest imported contacts if requested
    if (latestImport === "true") {
      const contacts = await fetchAllContactsByLocation();

      // Find all non-empty import dates
      const importDates = contacts
        .map(getImportDate)
        .filter(Boolean);

      // Debug: show all found import dates
      console.log("=== Debug: Found import dates ===");
      console.log(importDates);

      if (importDates.length === 0) {
        console.log("No imported contacts with an import date field found.");
        return res.status(200).json({
          contacts: [],
          pagination: { total: 0, hasMore: false, nextPageUrl: null },
          latestImportDate: null,
          message: 'No imported contacts with an import date field found.'
        });
      }

      // Sort dates as strings (ISO works fine lexicographically)
      const latestImportDate = importDates.sort().reverse()[0];
      const latestContacts = contacts.filter(
        c => getImportDate(c) === latestImportDate
      );

      // Debug: output for latest import date and contact count
      console.log(`=== Debug: Latest import date found: ${latestImportDate}`);
      console.log(`=== Debug: Number of contacts with latest import date: ${latestContacts.length}`);

      return res.status(200).json({
        contacts: latestContacts,
        pagination: { total: latestContacts.length, hasMore: false, nextPageUrl: null },
        latestImportDate
      });
    }

    // DEFAULT MODE: Paginated contacts for pop-up
    const params = new URLSearchParams();
    params.append('limit', limit);
    if (locationId) params.append('locationId', locationId);
    if (startAfter) params.append('startAfter', startAfter);
    if (startAfterId) params.append('startAfterId', startAfterId);

    const ghlUrl = `https://rest.gohighlevel.com/v1/contacts?${params.toString()}`;

    const response = await fetch(ghlUrl, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let error;
      try {
        error = await response.json();
      } catch {
        error = { message: 'Unknown API error' };
      }
      console.error('GHL API Error:', error);
      return res.status(response.status).json({ error: error.message || 'API Error' });
    }

    const data = await response.json();
    const meta = data.meta || {};

    // Debug: log number of contacts returned in paginated mode
    console.log(`=== Debug: Contacts returned in paginated request: ${data.contacts ? data.contacts.length : 0}`);

    // Pagination logic
    const hasMore = !!(meta.startAfter && meta.startAfterId);
    const nextPageUrl = hasMore
      ? `/api/get-contacts?locationId=${locationId || ''}&limit=${limit}&startAfter=${encodeURIComponent(meta.startAfter)}&startAfterId=${encodeURIComponent(meta.startAfterId)}`
      : null;

    return res.status(200).json({
      contacts: data.contacts || [],
      pagination: {
        nextPageUrl,
        total: meta.total || 0,
        hasMore,
        startAfter: meta.startAfter || null,
        startAfterId: meta.startAfterId || null
      }
    });
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
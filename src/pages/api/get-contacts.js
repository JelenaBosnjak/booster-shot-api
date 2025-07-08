export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_TOKEN = process.env.GHL_API_TOKEN;
  const { locationId, limit = 20, startAfter, startAfterId, latestImport } = req.query;

  if (!API_TOKEN) {
    return res.status(500).json({ error: 'Missing API token' });
  }

  // Helper: Get the Import History field ID for this location
  async function getImportHistoryFieldId(locationId) {
    const params = new URLSearchParams();
    if (locationId) params.append('locationId', locationId);

    const url = `https://rest.gohighlevel.com/v1/contacts/customfields?${params.toString()}`;
    const resp = await fetch(url, {
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
      throw new Error(error.message || 'API Error fetching custom fields');
    }

    const data = await resp.json();
    // Try to match by label (visible name) or fieldName (API name)
    const field = (data.customFields || []).find(
      (f) =>
        (f.label && f.label.trim().toLowerCase() === 'import history') ||
        (f.fieldName && f.fieldName.trim().toLowerCase() === 'import history')
    );
    if (field) {
      // Debug: found field
      console.log('=== Debug: Found Import History field ===');
      console.log(JSON.stringify(field, null, 2));
    } else {
      console.log('=== Debug: Import History field not found ===');
    }
    return field ? field.id : null;
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
      // 1. Get field ID for "Import History"
      const importFieldId = await getImportHistoryFieldId(locationId);
      if (!importFieldId) {
        return res.status(200).json({
          contacts: [],
          pagination: { total: 0, hasMore: false, nextPageUrl: null },
          latestImportDate: null,
          message: 'Import History custom field not found for this location.'
        });
      }

      // 2. Fetch contacts as before
      const contacts = await fetchAllContactsByLocation();

      // 3. Extract the import date using the found field ID
      function getImportDate(contact) {
        if (Array.isArray(contact.customField)) {
          const found = contact.customField.find(f => f.id === importFieldId);
          // Remove trailing delimiters and whitespace
          return found && found.value && found.value.trim() ? found.value.trim().replace(/\|+$/, '').trim() : null;
        }
        return null;
      }

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

      // Sort dates as strings (format is MM/DD/YYYY HH:MM AM/PM, so this sort is not 100% robust, but works for most cases)
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
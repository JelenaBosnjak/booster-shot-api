export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_TOKEN = process.env.GHL_API_TOKEN;
  const { locationId, limit = 20, startAfter, startAfterId, latestImport } = req.query;

  if (!API_TOKEN) {
    return res.status(500).json({ error: 'Missing API token' });
  }

  // Use your actual custom field key for import history
  const IMPORT_DATE_FIELD_KEY = 'import_history';

  // Helper to fetch all contacts for "latest import" mode
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
    // SPECIAL MODE: Only return latest imported contacts if requested
    if (latestImport === "true") {
      const contacts = await fetchAllContactsByLocation();
      const importDates = contacts
        .map(c => c.customField && c.customField[IMPORT_DATE_FIELD_KEY])
        .filter(Boolean);

      if (importDates.length === 0) {
        return res.status(200).json({
          contacts: [],
          pagination: { total: 0, hasMore: false, nextPageUrl: null },
          latestImportDate: null,
          message: 'No imported contacts with an import date field found.'
        });
      }

      const latestImportDate = importDates.sort().reverse()[0];
      const latestContacts = contacts.filter(
        c => c.customField && c.customField[IMPORT_DATE_FIELD_KEY] === latestImportDate
      );

      return res.status(200).json({
        contacts: latestContacts,
        pagination: { total: latestContacts.length, hasMore: false, nextPageUrl: null },
        latestImportDate
      });
    }

    // DEFAULT MODE: Paginated, all contacts
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
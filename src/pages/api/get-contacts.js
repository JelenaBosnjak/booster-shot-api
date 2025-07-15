export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_TOKEN = process.env.GHL_API_TOKEN;
  const { locationId, limit = 20, startAfter, startAfterId, latestImport, search, tag } = req.query;

  if (!API_TOKEN) {
    return res.status(500).json({ error: 'Missing API token' });
  }

  // Helper: Get the Import History field ID for this account (not location-specific)
  async function getImportHistoryFieldId() {
    const url = `https://rest.gohighlevel.com/v1/custom-fields/`;
    console.log('Fetching custom fields:', url);

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) {
      let text = await resp.text();
      console.error('GHL custom fields fetch error:', text);
      throw new Error('API Error fetching custom fields: ' + text);
    }

    const data = await resp.json();
    // Try to match by .name (case-insensitive)
    const field = (data.customFields || []).find(
      (f) => f.name && f.name.trim().toLowerCase() === 'import history'
    );
    if (field) {
      console.log('=== Debug: Found Import History field ===');
      console.log(JSON.stringify(field, null, 2));
    } else {
      console.log('=== Debug: Import History field not found ===');
    }
    return field ? field.id : null;
  }

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

  // Helper for backend search (case-insensitive, for name/email/phone/tag)
  function contactMatchesSearch(contact, searchTerm, tag) {
    if (!searchTerm && !tag) return true;
    let match = true;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      match =
        (contact.firstName && contact.firstName.toLowerCase().includes(term)) ||
        (contact.lastName && contact.lastName.toLowerCase().includes(term)) ||
        (contact.email && contact.email.toLowerCase().includes(term)) ||
        (contact.phone && contact.phone.toLowerCase().includes(term));
    }
    if (tag) {
      if (!Array.isArray(contact.tags) || !contact.tags.includes(tag)) return false;
    }
    return match;
  }

  try {
    if (latestImport === "true") {
      // Get field ID for "Import History"
      const importFieldId = await getImportHistoryFieldId();
      if (!importFieldId) {
        return res.status(200).json({
          contacts: [],
          pagination: { total: 0, hasMore: false, nextPageUrl: null },
          latestImportDate: null,
          message: 'Import History custom field not found for this account.'
        });
      }

      const contacts = await fetchAllContactsByLocation();

      function getImportDate(contact) {
        if (Array.isArray(contact.customField)) {
          const found = contact.customField.find(f => f.id === importFieldId);
          return found && found.value && found.value.trim() ? found.value.trim().replace(/\|+$/, '').trim() : null;
        }
        return null;
      }

      const importDates = contacts
        .map(getImportDate)
        .filter(Boolean);

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

      const latestImportDate = importDates.sort().reverse()[0];
      const latestContacts = contacts.filter(
        c => getImportDate(c) === latestImportDate
      );

      console.log(`=== Debug: Latest import date found: ${latestImportDate}`);
      console.log(`=== Debug: Number of contacts with latest import date: ${latestContacts.length}`);

      return res.status(200).json({
        contacts: latestContacts,
        pagination: { total: latestContacts.length, hasMore: false, nextPageUrl: null },
        latestImportDate
      });
    }

    // PAGINATED AND SEARCH MODE
    // If search or tag filter is present, fetch all contacts and filter in-memory (API does not support server-side search).
    if (search || tag) {
      const allContacts = await fetchAllContactsByLocation();
      let filteredContacts = allContacts.filter(c => contactMatchesSearch(c, search, tag));
      const total = filteredContacts.length;

      // Paginate filtered results in-memory
      const pageLimit = parseInt(limit, 10) || 20;
      const page = Math.max(
        1,
        req.query.page ? parseInt(req.query.page, 10) : 1
      );
      const offset = (page - 1) * pageLimit;
      const paginatedContacts = filteredContacts.slice(offset, offset + pageLimit);

      // Create a nextPageUrl if there are more results
      const hasMore = offset + pageLimit < total;
      const nextPageUrl = hasMore
        ? `/api/get-contacts?locationId=${encodeURIComponent(locationId)}&limit=${pageLimit}&search=${encodeURIComponent(search || "")}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}&page=${page + 1}`
        : null;

      return res.status(200).json({
        contacts: paginatedContacts,
        pagination: {
          nextPageUrl,
          total,
          hasMore,
          page,
        }
      });
    }

    // DEFAULT MODE: Paginated contacts (no search/tag)
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

    console.log(`=== Debug: Contacts returned in paginated request: ${data.contacts ? data.contacts.length : 0}`);

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
    console.error('Handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
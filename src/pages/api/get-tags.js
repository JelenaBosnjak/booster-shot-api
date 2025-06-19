const API_TOKEN = process.env.GHL_API_TOKEN || process.env.GHL_API_KEY;
const GHL_API_CONTACTS_URL = "https://rest.gohighlevel.com/v1/contacts";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { locationId } = req.query;
  const limit = 100; // reasonable batch size per request

  if (!API_TOKEN) {
    return res.status(500).json({ error: 'Missing API token' });
  }
  if (!locationId) {
    return res.status(400).json({ error: 'Missing locationId' });
  }

  try {
    let allTags = new Set();
    let startAfter = null;
    let startAfterId = null;
    let more = true;
    let attempts = 0;
    const MAX_ATTEMPTS = 20; // Safety: up to 2000 contacts

    while (more && attempts < MAX_ATTEMPTS) {
      const params = new URLSearchParams();
      params.append('limit', limit);
      params.append('locationId', locationId);
      if (startAfter) params.append('startAfter', startAfter);
      if (startAfterId) params.append('startAfterId', startAfterId);

      const ghlUrl = `${GHL_API_CONTACTS_URL}?${params.toString()}`;
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
      const contacts = Array.isArray(data.contacts) ? data.contacts : [];
      contacts.forEach(contact => {
        if (Array.isArray(contact.tags)) {
          contact.tags.forEach(tag => allTags.add(tag));
        }
      });

      const meta = data.meta || {};
      startAfter = meta.startAfter || null;
      startAfterId = meta.startAfterId || null;
      more = !!(startAfter && startAfterId);
      attempts++;
    }

    return res.status(200).json({ tags: Array.from(allTags) });
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
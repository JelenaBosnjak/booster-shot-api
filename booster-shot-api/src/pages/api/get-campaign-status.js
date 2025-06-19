export default async function handler(req, res) {
  if (req.method !== 'GET') {
    console.error('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_TOKEN = process.env.GHL_API_TOKEN; // match your get-contacts naming!
  if (!API_TOKEN) {
    console.error('Missing API token');
    return res.status(500).json({ error: 'Missing API token' });
  }

  // Helper date string
  function getDateString(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  }

  try {
    // You can add query params if you want to filter by location/limit etc.
    const ghlUrl = `https://rest.gohighlevel.com/v1/contacts?limit=100`; // can paginate later

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
      console.error('GHL API Error:', error, 'Status:', response.status);
      return res.status(response.status).json({ error: error.message || 'API Error' });
    }

    const data = await response.json();
    const contacts = data.contacts || [];
    console.log(`Fetched ${contacts.length} contacts`);

    const today = getDateString(0);
    const yesterday = getDateString(-1);

    let previous = 0, current = 0;

    contacts.forEach(contact => {
      const tags = contact.tags || [];
      if (!tags.includes("booster shot")) return;

      const boosterField = (contact.customField || []).find(
        f => f.id && f.id.toLowerCase().includes("booster")
      );
      const boosterValue = boosterField?.value || "";

      // For debugging, log matches
      if (boosterValue.includes(today)) {
        current++;
        console.log(`Current match: ${contact.id} | ${boosterValue}`);
      }
      if (boosterValue.includes(yesterday)) {
        previous++;
        console.log(`Previous match: ${contact.id} | ${boosterValue}`);
      }
    });

    return res.status(200).json({ previous, current });
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
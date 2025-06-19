// Helper to extract all MM/DD/YYYY (or MM/DD/YYYY HH:MM) dates from a string
function extractDates(text) {
  // Match dates in "M/D/YYYY" or "MM/DD/YYYY" optionally followed by time (e.g., "6/18/2025 14:30")
  return (text.match(/\d{1,2}\/\d{1,2}\/\d{4}(?: \d{1,2}:\d{2})?/g) || []);
}

// Helper to get the most recent date from an array of MM/DD/YYYY[ HH:MM] strings
function getMostRecentDate(dates) {
  if (!dates.length) return null;
  return dates
    .map(d => {
      // Remove time for Date parse if present, since new Date("6/18/2025 14:30") works in modern engines,
      // but we only care about the date part for comparison.
      const [datePart] = d.split(" ");
      return new Date(datePart);
    })
    .sort((a, b) => b - a)[0];
}

function formatDate(d) {
  if (!d) return '';
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_TOKEN = process.env.GHL_API_TOKEN;
  if (!API_TOKEN) {
    console.error('Missing API token');
    return res.status(500).json({ error: 'Missing API token' });
  }

  try {
    const ghlUrl = `https://rest.gohighlevel.com/v1/contacts?limit=100`;
    const response = await fetch(ghlUrl, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let error;
      try { error = await response.json(); } catch { error = { message: 'Unknown API error' }; }
      console.error('GHL API Error:', error, 'Status:', response.status);
      return res.status(response.status).json({ error: error.message || 'API Error' });
    }

    const data = await response.json();
    const contacts = data.contacts || [];
    console.log(`Fetched ${contacts.length} contacts`);

    // DEBUG: List all custom fields for each contact
    contacts.forEach(contact => {
      console.log(`Contact ID: ${contact.id}`);
      (contact.customField || []).forEach(field => {
        console.log(`  Field ID: ${field.id}, Value: ${field.value}`);
      });
    });

    // Find the ID of the "Booster Shot History" field by searching for a value containing "Booster Shot"
    // This is a fallback if field names/IDs are unknown.
    let latestDate = null;

    // 1. Find all most recent booster shot dates from all contacts
    const contactLatestDates = contacts.map(contact => {
      // Try to find the custom field containing "Booster Shot" in its value
      const boosterField = (contact.customField || []).find(
        f => f.value && f.value.includes("Booster Shot")
      );
      const dates = boosterField ? extractDates(boosterField.value) : [];
      const mostRecent = getMostRecentDate(dates);
      if (mostRecent && (!latestDate || mostRecent > latestDate)) {
        latestDate = mostRecent;
      }
      return mostRecent;
    });

    if (!latestDate) {
      // No booster shots found at all
      return res.status(200).json({ previous: 0, current: 0 });
    }

    // 2. Format dates for comparison
    const latestDateStr = formatDate(latestDate);

    // 3. Find previous latest date (the most recent date before the latest)
    const previousDates = contactLatestDates
      .filter(d => d && formatDate(d) !== latestDateStr)
      .map(d => d.getTime());
    const previousLatestTime = previousDates.length ? Math.max(...previousDates) : null;
    const previousLatestDateStr = previousLatestTime ? formatDate(new Date(previousLatestTime)) : null;

    // 4. Count contacts with latest booster on latestDate and previous latest date
    let current = 0, previous = 0;
    contactLatestDates.forEach(d => {
      if (!d) return;
      const dateStr = formatDate(d);
      if (dateStr === latestDateStr) current++;
      else if (previousLatestDateStr && dateStr === previousLatestDateStr) previous++;
    });

    console.log(`Current Campaign Date: ${latestDateStr}, Contacts: ${current}`);
    console.log(`Previous Campaign Date: ${previousLatestDateStr}, Contacts: ${previous}`);

    return res.status(200).json({ previous, current });
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
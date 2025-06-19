import fetch from 'node-fetch';

const GHL_API_URL = "https://rest.gohighlevel.com/v1/contacts/";
const GHL_API_KEY = process.env.GHL_API_KEY; // Set in your .env.local

// Helper for US date MM/DD/YYYY
function getDateString(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export default async function handler(req, res) {
  // Basic error handling
  if (req.method !== 'GET') {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Fetch all contacts (you may need to handle pagination for large accounts)
    const response = await fetch(GHL_API_URL, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      return res.status(500).json({ message: "Failed to fetch contacts from GHL" });
    }

    const data = await response.json();
    const contacts = data.contacts || []; // adapt if GHL returns a different field

    const today = getDateString(0);      // e.g., "6/19/2025"
    const yesterday = getDateString(-1); // e.g., "6/18/2025"

    let previous = 0, current = 0;

    contacts.forEach(contact => {
      // Check for "booster shot" tag
      const tags = contact.tags || [];
      if (!tags.includes("booster shot")) return;

      // Find the custom field for booster_history_data
      const boosterField = (contact.customField || []).find(
        f => f.id && f.id.toLowerCase().includes("booster") // adjust as needed for your field id!
      );
      const boosterValue = boosterField?.value || "";

      if (boosterValue.includes(today)) current++;
      if (boosterValue.includes(yesterday)) previous++;
    });

    return res.status(200).json({ previous, current });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}
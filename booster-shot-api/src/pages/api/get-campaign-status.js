const GHL_API_URL = "https://rest.gohighlevel.com/v1/contacts/";
const GHL_API_KEY = process.env.GHL_API_KEY; // Set this in your .env.local

function getDateString(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
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
    const contacts = data.contacts || [];

    const today = getDateString(0);      // e.g., "6/19/2025"
    const yesterday = getDateString(-1); // e.g., "6/18/2025"

    let previous = 0, current = 0;

    contacts.forEach(contact => {
      const tags = contact.tags || [];
      if (!tags.includes("booster shot")) return;

      // Find the custom field for booster_history_data (adjust if you know the exact ID)
      const boosterField = (contact.customField || []).find(
        f => f.id && f.id.toLowerCase().includes("booster")
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
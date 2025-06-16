export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // You can change this to your desired test phone number
  const TEST_PHONE_NUMBER = "+12345678901"; // <-- replace with your actual test number

  const { message } = req.body;

  const GHL_API_KEY = process.env.GHL_API_KEY || process.env.GHL_API_TOKEN;
  const LOCATION_ID = process.env.GHL_LOCATION_ID; // Optionally set in env

  if (!message) {
    return res.status(400).json({ error: "Missing message" });
  }
  if (!GHL_API_KEY) {
    return res.status(500).json({ error: "Missing GHL API key" });
  }

  try {
    // Send SMS via GoHighLevel API
    const response = await fetch("https://rest.gohighlevel.com/v1/messages/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone: TEST_PHONE_NUMBER, // send to hardcoded test number
        message: message,
        // Optionally, include locationId if required by your GHL account
        locationId: LOCATION_ID
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(500).json({ error: "Failed to send test SMS: " + error });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Unknown error sending test SMS." });
  }
}
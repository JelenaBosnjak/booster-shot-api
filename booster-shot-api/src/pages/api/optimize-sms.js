export default async function handler(req, res) {
  // --- POST HANDLER: Send to webhook only ---
  if (req.method === "POST") {
    // Parse body for Next.js edge or node runtimes
    let message, locationId;
    try {
      // If body is already parsed (Node.js runtime)
      if (req.body && typeof req.body === "object") {
        ({ message, locationId } = req.body);
      } else {
        // If body is a string (Edge runtime)
        ({ message, locationId } = JSON.parse(req.body || "{}"));
      }
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    const WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/QoVl53giULLNf7iUH7LE/webhook-trigger/b4ca2252-b3f8-4eee-991c-cd468b2a3b18";

    if (!message || !locationId) {
      return res.status(400).json({ error: "Missing message or locationId." });
    }

    try {
      const webhookRes = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, locationId }),
      });

      if (!webhookRes.ok) {
        const error = await webhookRes.text();
        return res
          .status(500)
          .json({ error: "Failed to send to webhook: " + error });
      }

      return res.status(200).json({ success: true });
    } catch (e) {
      return res
        .status(500)
        .json({ error: e.message || "Unknown error sending to webhook." });
    }
  }

  // --- GET HANDLER: Not needed for now ---
  res.status(405).json({ error: "Method not allowed" });
}
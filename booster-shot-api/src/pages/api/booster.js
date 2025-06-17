export default function handler(req, res) {
  if (req.method === 'POST') {
    const { contacts, message } = req.body;
    res.status(200).json({ status: 'received', contacts, message });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
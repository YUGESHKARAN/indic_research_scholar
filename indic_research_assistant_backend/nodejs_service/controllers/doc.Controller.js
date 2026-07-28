const Scholar = require('../models/scholarSchema');

// GET /api/docs — the logged-in user's doc history (frontend dashboard)
const getMyDocs = async (req, res) => {
  try {
    console.log("getMyDocs called", req.user)
    const user = await Scholar.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({ docs: user.docs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch documents', details: err.message });
  }
};

// POST /api/internal/docs — called by Flask right after a successful /ingest
const addDocFromFlask = async (req, res) => {
  try {
    const { email, doc_id, title } = req.body;

    if (!email || !doc_id || !title) {
      return res.status(400).json({ error: 'email, doc_id, and title are required' });
    }

    const user = await Scholar.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Assumption: don't auto-create accounts from an ingest call.
      // Flask should surface this to the user as "please register first."
      return res.status(404).json({ error: 'No account found for this email. Register first.' });
    }

    const alreadyExists = user.docs.some((d) => d.doc_id === doc_id);
    if (!alreadyExists) {
      user.docs.push({ doc_id, title });
      await user.save();
    }

    return res.status(200).json({ docs: user.docs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to record document', details: err.message });
  }
};

module.exports = { getMyDocs, addDocFromFlask };
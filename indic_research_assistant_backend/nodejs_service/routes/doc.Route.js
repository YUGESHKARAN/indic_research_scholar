const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const internalAuth = require('../middleware/flaskAuth');
const { getMyDocs, addDocFromFlask } = require('../controllers/doc.Controller');

router.get('/docs', authenticate, getMyDocs);
router.post('/internal/docs', internalAuth, addDocFromFlask);

module.exports = router;
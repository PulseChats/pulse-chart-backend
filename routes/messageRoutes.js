const express = require('express');
const { sendMessage, getMessages, deleteIncognitoMessages } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, sendMessage);
router.get('/:userId', protect, getMessages);
router.post('/viewed', protect, deleteIncognitoMessages);

module.exports = router;

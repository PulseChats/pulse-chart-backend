const express = require('express');
const { sendMessage, getMessages, deleteIncognitoMessages, uploadFile } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', protect, sendMessage);
router.post('/upload', protect, upload.single('file'), uploadFile);
router.get('/:userId', protect, getMessages);
router.post('/viewed', protect, deleteIncognitoMessages);

module.exports = router;

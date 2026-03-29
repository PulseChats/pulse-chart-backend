const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  const { recipient, content, isIncognito } = req.body;

  if (!recipient || !content) {
    return res.status(400).json({ message: 'Invalid data passed' });
  }

  try {
    let translatedContent = content;

    // Fetch sender and recipient to check language preferences
    const senderUser = await User.findById(req.user._id);
    const recipientUser = await User.findById(recipient);

    if (senderUser && recipientUser && senderUser.language !== recipientUser.language) {
      const langMap = {
        'English': 'en',
        'Hindi': 'hi',
        'French': 'fr',
        'Spanish': 'es',
      };
      
      const sourceLang = langMap[senderUser.language] || 'en';
      const targetLang = langMap[recipientUser.language] || 'en';
      
      if (sourceLang !== targetLang) {
        const langPair = `${sourceLang}|${targetLang}`;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(content)}&langpair=${langPair}`;
        
        try {
          const response = await fetch(url);
          const data = await response.json();
          if (data && data.responseData && data.responseData.translatedText) {
            translatedContent = data.responseData.translatedText;
          }
        } catch (apiError) {
          console.error('Translation API Error:', apiError);
          // Fall back to original content if API fails
        }
      }
    }

    const newMessage = {
      sender: req.user._id,
      recipient: recipient,
      content: content,
      isIncognito: isIncognito || false,
    };

    if (translatedContent !== content) {
      newMessage.translatedContent = translatedContent;
    }

    let message = await Message.create(newMessage);

    // Populate sender and recipient info
    message = await message.populate('sender', 'username email');
    message = await message.populate('recipient', 'username email');

    res.json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Fetch all messages for a specific chat/user
// @route   GET /api/messages/:userId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user._id },
      ],
    })
      .populate('sender', 'username email')
      .populate('recipient', 'username email')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete read incognito messages heavily utilizing DB rules
// @route   POST /api/messages/viewed
// @access  Private
const deleteIncognitoMessages = async (req, res) => {
  const { messageIds } = req.body;

  if (!messageIds || messageIds.length === 0) {
    return res.status(400).json({ message: 'No messages provided to delete' });
  }

  try {
    // Only delete messages where the current user is the actual recipient and isIncognito is safely true
    await Message.deleteMany({
      _id: { $in: messageIds },
      recipient: req.user._id,
      isIncognito: true
    });

    res.json({ success: true, message: 'Incognito logs wiped from DB securely' });
  } catch (error) {
    console.error('Delete Incognito Error:', error);
    res.status(500).json({ message: 'Failed to erase secure logs' });
  }
};

module.exports = { sendMessage, getMessages, deleteIncognitoMessages };

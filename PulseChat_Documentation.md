# Pulse Chat: Complete System Architecture & Data Flow Documentation

This document explicitly outlines the end-to-end data flows, architectural decisions, and integration points for the Pulse Chat platform. 

---

## 1. Authentication Flow
The application utilizes a secure, stateless JWT (JSON Web Token) authentication architecture.

**Process:**
1. **User Registration:** 
   - The user selects a username, an email, a secure password, and their **Preferred Language** (English, Hindi, French, or Spanish) from the glassmorphic modal (`RegisterPage.jsx`).
   - The React frontend sends a `POST /api/auth/register` request containing these details.
   - The backend (`authController.js`) validates the input. It checks the MongoDB `User` collection for duplicate emails or usernames and returns highly specific Mongoose `ValidationErrors` if criteria aren't met (e.g., username length).
   - The password is mathematically scrubbed and cryptographically hashed using `bcrypt` before being securely written to the database.
   - Upon success, the server returns the user profile and a freshly signed `JWT`.

2. **Login & Session Management:**
   - The user inputs either their `username` or `email` payload alongside their password into `LoginPage.jsx`.
   - The backend retrieves the hashed string natively and uses `bcrypt.compare` to validate.
   - Upon validation, the React frontend saves the returned `JWT` into persistent local browser storage. This token attaches itself dynamically to the `Authorization: Bearer` headers of all subsequent `axios` calls within `api.js` to protect sensitive routes.

---

## 2. Standard Real-Time Chat Flow
Pulse Chat employs standard REST API fetching combined with multiplexed `socket.io` connections to blend stability with real-time speed.

**Process:**
1. **Initial Hydration:** 
   - Upon successful login into `ChatPage.jsx`, the React `useEffect` hook fires an active `GET /api/auth/users` request to build the interactive sidebar featuring all registered users on the platform.
   - The current user is silently connected to the `Socket.io` Node server via `io(ENDPOINT)`. They join a native socket room explicitly mimicking their `user._id`.

2. **Selecting a Conversation:**
   - Clicking on an active user triggers `GET /api/messages/:id`.
   - The server traverses the `Message` schema for any threads where `$or` bounds the active `sender` and targeted `recipient`. It sorts them ascendingly by time and pushes the historical logs to display inside your chat bubbles.
   - The React client simultaneously emits a `"join chat"` socket binding.

3. **Message Dispatch:**
   - Typing into the main input invokes `sendMessage`.
   - Before hitting the database, the server initiates the **Translation Flow** (see below) if necessary.
   - The finalized message object is saved into MongoDB, fully populated with the target's username/email specs, and returned `(res.json)` to the sender securely.
   - React appends this message locally to the sender's screen and fires a `"new message"` Socket emission to the backend.
   - The Node server routes this socket payload precisely into the recipient's targeted `user._id` room. If the recipient is currently looking at their dashboard, the message appears instantaneously without refreshing!

---

## 3. Dynamic Auto-Translation Flow
To bridge communication gaps seamlessly, the backend intelligently coordinates API processing before storing standard message data.

**Process:**
1. **Inception & Condition Checking:**
   - Inside `sendMessage`, the backend queries the database for the complete profiles of both the `senderUser` and the `recipientUser` to ascertain their respective static `language` parameters fields.
   - If `sender.language !== recipient.language`, the translation sub-process spins up securely.

2. **The MyMemory Pipeline:**
   - The backend calculates standard codes (e.g., `Spanish` -> `es`) and formats a `langPair`.
   - An asynchronous native Node Web Fetch `GET` request executes against `https://api.mymemory.translated.net/get` securely offloading the user's string text to be computed.
   - The resulting JSON object's `responseData.translatedText` is extracted and forcefully appended back onto the primary `newMessage` schema as a `translatedContent` object string.
   
3. **Frontend Rendering:**
   - When the recipient receives the message object (whether via REST hydration or WebSocket delivery), the React mapping algorithm checks `!isSender && m.translatedContent`. 
   - If true, it renders the translated string dominantly in crisp white layout typography while dynamically squeezing the original native string down into an italicized context container placed cleanly underneath structural lines.

---

## 4. Incognito Mode (Ghost Flow)
The Ghost interaction relies on precise synchronized client-memory storage coupled with immediate backend garbage deletion parameters.

**Process:**
1. **UI Execution:**
   - The user dynamically clicks the `Ghost` toggle icon to override the state variable `incognitoMode`.
   - CSS grid layouts dynamically deploy absolute-positioned dark layouts bridging completely over the old dashboard, shifting borders natively red, and changing input fields logic to flag outgoing requests firmly with `isIncognito: true`.

2. **Database Routing:**
   - The `sendMessage` controller receives the secure `isIncognito: true` flag inside `req.body`, processing the new payload and actively saving it to MongoDB while maintaining exactly the behavior of standard API distribution.
   
3. **Self-Destruction Triggers:**
   - Messages are kept isolated locally inside the dark `m.isIncognito === true` map filter exclusively on the frontend display loop.
   - When a recipient interacts organically with the dashboard—for example, if a WebSocket natively fires a brand new payload into their window during a chat, OR if they load into an active thread initially fetching the payloads—the frontend scans the array explicitly for `unread` instances referencing their personal `user._id`.
   - If identified, the frontend immediately spins off an invisible, silent background command: `POST /api/messages/viewed`. 
   - The Express controller catches this explicit payload and triggers `Message.deleteMany()` directly targeting the received IDs to surgically strip the objects entirely out of the standard MongoDB cluster structure.
   - **Result:** The database contains zero traces. The messages linger solely on the user's active RAM browser cache dynamically until they eventually close or shift their `ChatPage.jsx` component layout!

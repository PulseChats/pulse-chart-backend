// @desc    Ask AI a question using Gemini API
// @route   POST /api/ai/ask
// @access  Private
const askAI = async (req, res) => {
    const { question, history } = req.body;

    if (!question) {
        return res.status(400).json({ message: 'Please provide a question' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ message: 'Gemini API key not configured on server' });
    }

    // Try multiple models in order of preference
    const models = [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
    ];

    try {
        // Build conversation contents for Gemini
        const contents = [];

        // Add conversation history if provided
        if (history && Array.isArray(history)) {
            history.forEach(msg => {
                contents.push({
                    role: msg.role === 'ai' ? 'model' : 'user',
                    parts: [{ text: msg.text }]
                });
            });
        }

        // Add the current question
        contents.push({
            role: 'user',
            parts: [{ text: question }]
        });

        const requestBody = {
            contents,
            systemInstruction: {
                parts: [{
                    text: "You are Pulse AI, a helpful assistant built into PulseChat — a multilingual real-time chat platform. Be friendly, concise, and helpful. You can help users with questions about the app, general knowledge, coding, writing, translations, and more. Use markdown formatting when helpful. Keep responses clear and to-the-point."
                }]
            },
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            }
        };

        let lastError = null;

        for (const model of models) {
            try {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "openrouter/auto",
                        messages: [
                            {
                                role: "user",
                                content: question
                            }
                        ]
                    })
                });

                const data = await response.json();

                const answer = data.choices?.[0]?.message?.content;

                if (answer) {
                    return res.json({ answer });
                }

                // If no answer, try next model
                console.log(`No answer from ${model}, trying next...`);
                continue;

            } catch (fetchErr) {
                console.error(`Fetch error with ${model}:`, fetchErr.message);
                lastError = fetchErr;
                continue;
            }
        }

        // All models failed
        if (lastError) {
            const errorMsg = lastError.message || 'All AI models returned errors';

            if (errorMsg.includes('exceeded') || errorMsg.includes('quota') || lastError.code === 429) {
                return res.status(429).json({
                    message: 'AI rate limit reached. Please wait a minute and try again.',
                    retryAfter: 60
                });
            }

            return res.status(500).json({ message: errorMsg });
        }

        return res.status(500).json({ message: 'Could not generate a response from any AI model.' });

    } catch (error) {
        console.error('AI Controller Error:', error);
        res.status(500).json({ message: 'Failed to get AI response' });
    }
};

module.exports = { askAI };

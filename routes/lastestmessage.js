const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const User = require('../models/User'); // Assuming this is your user model

router.get('/thread/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findOne({ phone: userId }); // or any unique identifier

        if (!user || !user.openaiThreadId) {
            return res.status(404).send({ error: 'Thread not found' });
        }

        const threadId = user.openaiThreadId;
        const messagesResponse = await openai.beta.threads.messages.list(threadId);
        const messages = messagesResponse.data;

        // Filter for messages sent by the assistant and select the first one (latest message)
        const assistantMessages = messages.filter(msg => msg.role === 'assistant');
        const latestAssistantMessage = assistantMessages.length > 0 ? assistantMessages[0].content[0].text.value : "No messages from assistant found.";

        res.send({ latestMessage: latestAssistantMessage });
    } catch (error) {
        console.error(`Error in getting thread: ${error}`);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});



module.exports = router;

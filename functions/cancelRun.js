const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function cancelRun(threadId, runId) {
    try {
        const response = await openai.beta.threads.runs.cancel(threadId, runId);
        console.log('Run cancelled:', response);
        return response;
    } catch (error) {
        console.error('Error cancelling run:', error);
        throw error;
    }
}

module.exports = cancelRun;

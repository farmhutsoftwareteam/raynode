const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const yahooFinance = require('yahoo-finance2').default;
const User = require('../models/User');

require('dotenv').config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getStockPrice(symbol) {
    try {
        const quote = await yahooFinance.quote(symbol);
        return { 
            symbol: symbol, 
            price: quote.regularMarketPrice, 
            currency: quote.currency 
        };
    } catch (error) {
        console.error(`Error fetching stock price for ${symbol}: ${error}`);
        throw error;
    }
}
async function calculateLoanInstallment({ loanAmount, tenureMonths }) {
    const interestRate = 0.10; // Fixed annual interest rate of 10%
    const monthlyRate = interestRate / 12; // Convert annual rate to monthly rate
    const installment = loanAmount * monthlyRate / (1 - (Math.pow(1/(1 + monthlyRate), tenureMonths)));

    return {
        loanAmount: loanAmount,
        tenureMonths: tenureMonths,
        monthlyInstallment: installment.toFixed(2) // Rounding to 2 decimal places for readability
    };
}

async function getStoredThreadId(userId) {
    try {
        const user = await User.findOne({ phone: userId }); // or use any unique identifier
        return user ? user.openaiThreadId : null;
    } catch (error) {
        console.error(`Error fetching user's thread ID: ${error}`);
        throw error;
    }
}

async function storeThreadId(userId, threadId) {
    try {
        await User.findOneAndUpdate(
            { phone: userId }, // or use any unique identifier
            { openaiThreadId: threadId },
            { new: true }
        );
    } catch (error) {
        console.error(`Error storing user's thread ID: ${error}`);
        throw error;
    }
}

const tools = [
    {
        "type": "function",
        "function": {
            "name": "getStockPrice",
            "description": "Get the current stock price of a company using its stock symbol",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol (e.g., 'AAPL' for Apple)"
                    }
                },
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculateLoanInstallment",
            "description": "Calculate monthly loan installment",
            "parameters": {
                "type": "object",
                "properties": {
                    "loanAmount": {
                        "type": "number",
                        "description": "The total loan amount"
                    },
                    "tenureMonths": {
                        "type": "number",
                        "description": "Loan tenure in months"
                    }
                },
                "required": ["loanAmount", "tenureMonths"]
            }
        }
    }
];

async function main(userQuery, userId) {
    try {

        let threadId = await getStoredThreadId(userId);
        console.log('threadId', threadId)
        // If no existing thread, create a new one
        if (!threadId) {
            const thread = await openai.beta.threads.create();
            threadId = thread.id;
            console.log('new thread created')
            // Store the new thread ID for future reference
            await storeThreadId(userId, threadId);
        }

        // Create the assistant
        const assistant = await openai.beta.assistants.create({
            name: "Raysun Capital Assistant",
            instructions: "You are a financial assistant. Provide accurate and professional advice on stock prices, loan calculations, and general financial queries. Always ask for clarification if the user's request is incomplete or unclear.",
            tools: tools,
            model: "gpt-4-1106-preview",
        });

        
        // Create a message in the thread
        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: userQuery
        });

        // Create a run with custom instructions
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: assistant.id,
            instructions: "Please address the user as Munyaradzi Makosa",
        });

        let finalMessages = [];
        let statusResult;
        do {
            statusResult = await checkStatusAndPrintMessages(threadId, run.id);
            if (statusResult.status === "completed") {
                finalMessages = statusResult.messages;
            } else if (statusResult.status === "requires_action") {
                // Handle any required actions after 'requires_action'
                // Logic for handling actions goes here
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else if (statusResult.status === "in_progress") {
                // Wait and recheck status
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        } while (statusResult.status !== "completed");

        return finalMessages;
    } catch (error) {
        console.error(`Error in main: ${error}`);
        throw error;
    }
}


async function checkStatusAndPrintMessages(threadId, runId) {
    try {
        const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);

        if (runStatus.status === "completed") {
            const messages = await openai.beta.threads.messages.list(threadId);
            return {
                status: "completed",
                messages: messages.data.map(msg => ({
                    role: msg.role,
                    content: msg.content[0].text.value
                }))
            };
        } else if (runStatus.status === 'requires_action') {
            const toolsOutput = await performRequiredActions(runStatus.required_action.submit_tool_outputs.tool_calls);
            await submitToolOutputs(threadId, runId, toolsOutput);
            return { status: "requires_action" };
        } else {
            console.log("Run is in progress, waiting for completion.");
            return { status: "in_progress" };
        }
    } catch (error) {
        console.error(`Error in checkStatusAndPrintMessages: ${error}`);
        throw error;
    }
}

// Function to perform required actions based on the run status
async function performRequiredActions(requiredActions) {
    let toolsOutput = [];

    for (const action of requiredActions) {
        const funcName = action.function.name;
        const functionArguments = JSON.parse(action.function.arguments);

        if (funcName === "getStockPrice") {
            try {
                const output = await getStockPrice(functionArguments.symbol);
                toolsOutput.push({
                    tool_call_id: action.id,
                    output: JSON.stringify(output)
                });
            } catch (error) {
                console.error(`Error in getStockPrice: ${error}`);
            }
        } else if (funcName === "calculateLoanInstallment") {
            try {
                const output = await calculateLoanInstallment(functionArguments);
                toolsOutput.push({
                    tool_call_id: action.id,
                    output: JSON.stringify(output)
                });
            } catch (error) {
                console.error(`Error in calculateLoanInstallment: ${error}`);
            }
        } else {
            console.error(`Unknown function name: ${funcName}`);
        }
    }

    return toolsOutput;
}


// Function to submit tool outputs
async function submitToolOutputs(threadId, runId, toolsOutput) {
    if (toolsOutput.length > 0) {
        try {
            await openai.beta.threads.runs.submitToolOutputs(threadId, runId, { tool_outputs: toolsOutput });
        } catch (error) {
            console.error(`Error submitting tool outputs: ${error}`);
            throw error;
        }
    }
}

router.post('/', async (req, res) => {
    const userQuery = req.body.query;
    const userId = req.body.userId;

    if (!userQuery || !userId) {
        return res.status(400).send({ error: 'No query provided' });
    }

    try {
        let response = [];
        let messages;
        do {
            messages = await main(userQuery, userId);
            response = response.concat(messages);
        } while (messages.length === 0); // Continue until messages are returned

        res.send({ response });
    } catch (error) {
        // ... error handling
    }
});


module.exports = router;
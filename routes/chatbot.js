const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const yahooFinance = require('yahoo-finance2').default;
const User = require('../models/User');
const applyForCivilServantLoan = require('../functions/civilservantloan');

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
    },
    {
        "type": "function",
        "function": {
            "name": "applyForCivilServantLoan",
            "description": "Apply for a civil servant loan and generate a PDF",
            "parameters": {
                "type": "object",
                "properties": {
                    "fullName": { "type": "string", "description": "Applicant's full name" },
                    "dob": { "type": "string", "description": "Date of birth in YYYY-MM-DD format" },
                    "idNumber": { "type": "string", "description": "Identification number" },
                    "nationality": { "type": "string", "description": "Nationality of the applicant" },
                    "gender": { "type": "string", "description": "Gender of the applicant" },
                    "position": { "type": "string", "description": "Position or job title of the applicant" },
                    "grossIncome": { "type": "string", "description": "Gross income of the applicant"},
                    "netIncome": { "type": "string", "description": "Net income of the applicant"},
                    "maritalStatus": { "type": "string", "description": "Marital status of the applicant" },
                    "phoneNumber": { "type": "string", "description": "Phone number of the applicant" },
                    "email": { "type": "string", "description": "Email address of the applicant" },
                    "ecNumber": { "type": "string", "description": "Employment Code number" },
                    "addressStatus": { "type": "string", "description": "Housing status of the applicant (e.g., Owner, Renter)" },
                    "address": { "type": "string", "description": "Home address of the applicant" },
                    "timeAtAddress": { "type": "string", "description": "Duration of stay at the current address" },
                    "dependants": { "type": "string", "description": "Number of dependants" },
                    "employer": { "type": "string", "description": "Name of the employer" },
                    "employerAddress": { "type": "string", "description": "Address of the employer" },
                    "employerContactNumber": { "type": "string", "description": "Contact number of the employer" },
                    "employerEmail": { "type": "string", "description": "Email address of the employer" },
                    "periodWithEmployer": { "type": "string", "description": "Duration of employment with the current employer" },
                    "nextOfKin": { "type": "string", "description": "Name of the next of kin" },
                    "nextOfKinAddress": { "type": "string", "description": "Address of the next of kin" },
                    "nextOfKinPhone": { "type": "string", "description": "Phone number of the next of kin" },
                    "relationship": { "type": "string", "description": "Applicant's relationship to the next of kin" },
                    "bankName": { "type": "string", "description": "Name of the applicant's bank" },
                    "accountNumber": { "type": "string", "description": "Bank account number of the applicant" },
                    "branchName": { "type": "string", "description": "Branch name of the bank" },
                    "loanAmount": { "type": "number", "description": "Requested loan amount" },
                    "loanTenure": { "type": "number", "description": "Loan tenure in months" },
                },
                "required": [
                    "fullName", "dob", "idNumber", "nationality", "gender", 
                    "maritalStatus", "phoneNumber", "email", "ecNumber", "addressStatus", 
                    "address", "timeAtAddress", "dependants", "employer", "employerAddress", 
                    "employerContactNumber", "periodWithEmployer", "nextOfKin", 
                    "nextOfKinAddress", "nextOfKinPhone", "relationship", "bankName", 
                    "accountNumber", "branchName", "loanAmount", "loanTenure"
                ]
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

async function processUserQuery(userQuery, userId) {
    try {
        let threadId = await getStoredThreadId(userId);
        if (!threadId) {
            const thread = await openai.beta.threads.create();
            threadId = thread.id;
            await storeThreadId(userId, threadId);
        }

        const assistant = await openai.beta.assistants.create({
            name: "Raysun Capital Assistant",
            instructions: `
              You are Ray, a highly capable fintech assistant created by Raysun Capital. 
              You specialize in providing financial services including loan applications, 
              stock price inquiries, exchange rate information, and other general financial 
              queries. 
          
              When users apply for loans, check stock prices, or inquire about exchange rates, 
              you should engage interactively, requesting any additional information needed 
              to fulfill their requests efficiently. For loan applications, ensure that all 
              required fields are completed by prompting users for any missing information.
          
              Be attentive to user queries and provide precise, professional financial advice 
              or information. If a user's request is unclear or incomplete, kindly ask for 
              clarification to ensure you provide the most accurate and helpful response. 
              Your goal is to facilitate a seamless and informative user experience, showcasing 
              the range of fintech solutions offered by Raysun Capital.
            `,
            tools: tools,
            model: "gpt-4-1106-preview",
          });
          
        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: userQuery
        });

        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: assistant.id,
            instructions: "Please address the user as Munyaradzi Makosa",
        });

        let statusResult;
        do {
            statusResult = await checkStatusAndPrintMessages(threadId, run.id);
            if (["requires_action", "in_progress"].includes(statusResult.status)) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        } while (statusResult.status !== "completed");

        // Optionally handle final messages here
    } catch (error) {
        console.error(`Error in processUserQuery: ${error}`);
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

async function performRequiredActions(requiredActions, req) {
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
        } else if (funcName === "applyForCivilServantLoan") {
            try {
                const { loan, pdfUrl } = await applyForCivilServantLoan(functionArguments, req);
                toolsOutput.push({
                    tool_call_id: action.id,
                    output: pdfUrl // Returning only the PDF URL
                });
            } catch (error) {
                console.error(`Error in applyForCivilServantLoan: ${error}`);
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

    res.send({ message: "Message received, processing..." });

    processUserQuery(userQuery, userId).catch(error => {
        console.error(`Error processing query in background: ${error}`);
    });
});


module.exports = router;
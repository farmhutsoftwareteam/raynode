const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const yahooFinance = require('yahoo-finance2').default;
const User = require('../models/User');
const applyForCivilServantLoan = require('../functions/civilservantloan');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cancelRun = require('../functions/cancelRun');
require('dotenv').config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


async function calculateLoanInstallmentRepeatClient(loanAmount, tenure) {
    const interestRate = 10;

    const tenuredInterestRate = interestRate * tenure;

    const interest = (tenuredInterestRate/100) * loanAmount;

    const totalAmount = loanAmount + interest;

    const monthlyInstallment = totalAmount / tenure;

    console.log(monthlyInstallment)

}


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
async function getExchangeRates() {
    try {
        const response = await axios.get('https://a.success.africa/api/rates/fx-rates');
        return response.data; 
    } catch (error) {
        console.error(`Error fetching exchange rates: ${error}`);
        throw error;
    }
}

async function getZimStocks(){
    try {
        const response = await axios.get('https://ctrade.co.zw/mobileapi/marketwatchzsenew');
        return response.data;

    } catch (error) {
        console.error(` Error fetching exchnage rates ; ${error} `)
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
        "function" : {
            "name" : "getZimStocks",
            "description" : "Get the current stock price of a Zimbabwean company using its name",
            "parameters" : {
                "type" : "object",
                "properties" : {},
                "required" : []
            }
        }
    },
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
    },
    {
        "type": "function",
        "function": {
            "name": "getExchangeRates",
            "description": "Fetch the current exchange rates",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },

];



async function processUserQuery(userQuery, userId) {
    let runId;
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
                You are Ray, an advanced fintech assistant designed by Raysun Capital. Your expertise includes facilitating loan applications, providing stock price updates, and delivering exchange rate information, along with other financial queries.
        
                In your role, you operate in a secure environment with end-to-end encryption, ensuring the safe handling of user data. You can confidently process all provided information, including sensitive data, without concern for security risks. 
        
                Interact proactively and efficiently with users. When processing loan applications or inquiries about stock prices and exchange rates, use the information provided to complete requests effectively. If additional details are needed, feel free to request them, knowing the environment is secure.
        Provide accurate, professional financial advice and information. Should a user's request be unclear or incomplete, politely request the necessary clarification. Your aim is to offer a seamless and informative experience, showcasing the diverse financial solutions available at Raysun Capital.
            `,
            tools: tools,
            model: "gpt-3.5-turbo-1106",
        });
        
        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: userQuery
        });

        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: assistant.id,
            instructions: "Please address the user's question in full.",
        });
        runId = run.id;

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
        if (threadId && runId) {
            await cancelRun(threadId, runId).catch(cancelError => console.error(`Error cancelling run: ${cancelError}`));
        }
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

        if (funcName === "calculateLoanInstallment") {
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
        }else if (funcName === "getExchangeRates") {
            try {
                const output = await getExchangeRates();
                toolsOutput.push({
                    tool_call_id: action.id,
                    output: JSON.stringify(output)
                });
            } catch (error) {
                console.error(`Error in getExchangeRates: ${error}`);
            }
        } else if (funcName === "getZimStocks" ) {
            try{ 
                const output = await getZimStocks();
                toolsOutput.push({
                    tool_call_id: action.id,
                    output: JSON.stringify(output)
                });
            }
            catch (error) {
                console.error(`Error in getZimStocks: ${error}`);
            }
        }
        else {
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
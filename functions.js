const OpenAI = require("openai");
const yahooFinance = require('yahoo-finance2').default;
require("dotenv").config();

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


async function main() {
    try {
        // Create the assistant
        const assistant = await openai.beta.assistants.create({
            name: "Raysun Capital Assistant",
            instructions: "You are a financial assistant. Provide accurate and professional advice on stock prices, loan calculations, and general financial queries. Always ask for clarification if the user's request is incomplete or unclear.",
            tools: tools,
            model: "gpt-4-1106-preview",
        });

        // Create a thread
        const thread = await openai.beta.threads.create();

        // Create a message in the thread
        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: "what is the stock price for tesla",
        });

        // Create a run with custom instructions
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistant.id,
            instructions: "Please address the user as Munyaradzi Makosa",
        });

        // Check status and print messages
        const intervalId = setInterval(async () => {
            await checkStatusAndPrintMessages(thread.id, run.id, intervalId);
        }, 10000);

    } catch (error) {
        console.error(error);
    }
}

async function checkStatusAndPrintMessages(threadId, runId, intervalId) {
    let runStatus;
    try {
        runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    } catch (error) {
        console.error(`Error retrieving run status: ${error}`);
        return;
    }

    if (runStatus.status === "completed") {
        let messages;
        try {
            messages = await openai.beta.threads.messages.list(threadId);
        } catch (error) {
            console.error(`Error listing messages: ${error}`);
            return;
        }

        messages.data.forEach((msg) => {
            const role = msg.role;
            const content = msg.content[0].text.value;
            console.log(`${role.charAt(0).toUpperCase() + role.slice(1)}: ${content}`);
        });

        console.log("Run is completed.");
        clearInterval(intervalId);
    } else if (runStatus.status === 'requires_action') {
        console.log("Requires action");
    
        const requiredActions = runStatus.required_action.submit_tool_outputs.tool_calls;

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
                    console.error(`Error in tool function: ${error}`);
                }
            } else if (funcName === "calculateLoanInstallment") {
                try {
                    const output = await calculateLoanInstallment(functionArguments);
                    toolsOutput.push({
                        tool_call_id: action.id,
                        output: JSON.stringify(output)
                    });
                } catch (error) {
                    // Missing parameters, respond with a prompt for more information
                const missingParamsMessage = `To calculate your loan installment, I need to know both the loan amount and the tenure in months. Please provide this information.`;
                toolsOutput.push({
                    tool_call_id: action.id,
                    output: JSON.stringify({ message: missingParamsMessage })
                });
                    console.error(`Error in tool function: ${error}`);
                }
            } else {
                console.log(`Function ${funcName} not found`);
            }
        }

        // Submit the tool outputs to Assistant API
        try {
            await openai.beta.threads.runs.submitToolOutputs(
                threadId,
                runId,
                { tool_outputs: toolsOutput }
            );
        } catch (error) {
            console.error(`Error submitting tool outputs: ${error}`);
        }
    } else {
        console.log("Run is not completed yet.");
    }
}


main();

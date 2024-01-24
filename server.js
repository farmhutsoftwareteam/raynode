require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const {log} = require("mercedlogger");
const { v4: uuidv4 } = require('uuid'); 
const cors = require("cors");
const UserRouter = require("./controllers/user");
const applyRoute = require("./routes/apply");
 const invoiceRoutes = require('./routes/invoice');
const userInfoRouter = require('./routes/userInfo');
const withdrawRouter = require('./routes/withdraw');
const { OpenAI} = require("openai")
const mixpanel = require('mixpanel');
const mixpanelToken = 'c08415fd158425a0180c1036e50af0e0';
const mixpanelClient = mixpanel.init(mixpanelToken);
const LoanApplication = require('./controllers/LoanApplication');
const loanRoutes = require('./controllers/PersonalLoans');
const axios = require('axios')
const chatRouter = require('./routes/chatbot')
const latestMessage = require('./routes/lastestmessage')
const cron = require('node-cron');
const fs = require('fs')
const uploadCsvRoute = require('./routes/getLoanData');




const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});



const swaggerFile = require('./swagger_output.json') //documentation
const swaggerUi = require('swagger-ui-express') //ui for api

const app = express();
app.use(express.static('public'))
//global middlewares
app.use(cors());
app.use(morgan('tiny'));
app.use(express.json());
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerFile))

app.get("/", (req, res) => {
    res.send("Raysun Capital");
});
app.use("/user", UserRouter) // send all "/user" requests to UserRouter for routing
// Endpoint to calculate installments based on principal loan amount
app.get('/calculate-installments/:principal/:duration', (req, res) => {
  const principal = parseFloat(req.params.principal);
  const duration = parseInt(req.params.duration);

  if (isNaN(principal) || isNaN(duration) || principal <= 0 || duration <= 0) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  const installments = [];
  const interestRate = 0.15; // Assuming a fixed interest rate of 15%

  for (let i = 1; i <= duration; i++) {
    const installment = principal * (1 + interestRate) / duration;
    installments.push(installment.toFixed(2));
  }

  res.json({ principal, duration, installments });
});

// Endpoint to determine principal based on monthly payment amount
app.get('/calculate-principal/:monthlyPayment/:duration', (req, res) => {
  const monthlyPayment = parseFloat(req.params.monthlyPayment);
  const duration = parseInt(req.params.duration);

  if (isNaN(monthlyPayment) || isNaN(duration) || monthlyPayment <= 0 || duration <= 0) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  const interestRate = 0.15; // Assuming a fixed interest rate of 15%
  const principal = (monthlyPayment * duration) / (1 + interestRate);

  res.json({ monthlyPayment, duration, principal: principal.toFixed(2) });
});
app.use('/invoice', invoiceRoutes);
app.use('/user-info', userInfoRouter);
app.use('/withdraw', withdrawRouter);
// Use loan routes
app.use('/api', loanRoutes);
app.use('/', uploadCsvRoute);

app.use("/loan", LoanApplication) // send all "/loan" requests to LoanApplication for routing

// Define an empty object to store conversation histories
const userConversations = {};
app.post('/api/testai', async (req, res) => {
  const prompt = req.body.prompt;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      prompt: prompt,
      temperature: 1,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    // Process and store the response
    const responseContent = response.data.choices[0].text;
    // Here, you can save the 'responseContent' to your database or perform any other required action

    res.send({ 'response' : responseContent }); // Send the response back to the client
  } catch (error) {
    console.error('Error generating AI response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/assistant', async (req, res) => {
  const { prompt } = req.body;
  const {userId } = req.body

  // Check and initialize user conversation history
  if (!userConversations[userId]) {
    userConversations[userId] = [{
      role: "system",
      content: "You are a helpful assistant that will assist users to apply for loans, and also give them financial advice. Raysun is loacated at 20 Ray Amm in Eastlea, the website is www.raysuncapital.com.To apply for a loan at Raysun a person is supposed to message the Raysun bot on whatsapp, and click on new application, they will answer the questions and then they will receive a call from the office to get their loan processed within a day. You are also to alert the user of your capabilities as soon as they greet you, which range from the ability to help a user understand the financial landscape and rules around civil servant loans in zimbabwe. If a user asks what unformation is to be put on the form you can give them this Personal Details:Name, date of birth, gender, phone number, ID number, nationality, marital status, email, and residential status.Accommodation Details:Address, details about the landlord, and duration of stay at the current residence.Employment Information:Current employer, employer address, contact number, employment number (Ec Number), position, employment status, duration with the employer, and income details.Next of Kin: Name, address, contact details, and relationship.Business Operations (If Applicable):Name of business, area and type of operation, and duration of operation.Financial Requirements:Loan amount, tenure, source of payment, and bank details.Details of Guarantor:Name, ID number, address, and contact number of the guarantor."
    }];
  }

  // Add user message to conversation history
  userConversations[userId].push({ role: "user", content: prompt });

  // Track user message in Mixpanel
  mixpanelClient.track('User Message', { distinct_id: userId, message: prompt });

  try {
    console.log('Sending request to OpenAI:', userConversations[userId]); // Log the conversation history being sent

    const gptResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      messages: userConversations[userId]
    });

    console.log('gptResponse:', gptResponse); // Log full response from OpenAI

    if (gptResponse.choices && gptResponse.choices.length > 0 && gptResponse.choices[0].message) {
      const assistantReply = gptResponse.choices[0].message.content;

      // Add assistant reply to conversation history and track in Mixpanel
      userConversations[userId].push({ role: "assistant", content: assistantReply });
      mixpanelClient.track('Assistant Reply', { distinct_id: userId, message: assistantReply });

      res.send({ 'bot': assistantReply });
    } else {
      console.log('No valid response in gptResponse:', gptResponse); // Log if response structure is unexpected
      res.status(500).send({ 'error': 'No valid response from OpenAI API' });
    }
  } catch (error) {
    console.error('Error during API call:', error); // Log the error details
    res.status(500).send({ 'error': 'Error processing request', details: error });
  }
});

app.use('/chat', chatRouter);
app.use('/', latestMessage);
app.use('/apply', applyRoute);

// Function to fetch data from the API
async function fetchData() {
  try {
      const response = await axios.get('https://a.success.africa/api/rates/fx-rates');
      // Process and store the response as needed
  } catch (error) {
      console.error('Error fetching data:', error);
  }
}
// Schedule the task to run every day at 8 AM (adjust the time as needed)
cron.schedule('0 12 * * *', async () => {
  try {
      const response = await axios.get('https://a.success.africa/api/rates/fx-rates');
      fs.writeFileSync('fxRates.json', JSON.stringify(response.data));
  } catch (error) {
      console.error('Error fetching and writing FX rates:', error);
  }
}, {
  scheduled: true,
  timezone: "CAT"
});


















// Define the function to save the assistant's response







app.listen(8080, () => {
    log.green(`Server is listening on port 8080`);
});




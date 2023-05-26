require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const {log} = require("mercedlogger");
const cors = require("cors");
const UserRouter = require("./controllers/user");
const { PORT=3000 } = process.env;
const invoiceRoutes = require('./routes/invoice');
const userInfoRouter = require('./routes/userInfo');
const withdrawRouter = require('./routes/withdraw');
const { Configuration, OpenAIApi} = require("openai")
const mixpanel = require('mixpanel');
const mixpanelToken = 'c08415fd158425a0180c1036e50af0e0';
const mixpanelClient = mixpanel.init(mixpanelToken);

const loanRoutes = require('./controllers/PersonalLoans');




const configuration = new Configuration({
    apiKey: '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'
})
const openai = new OpenAIApi(configuration);

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




// Define an empty object to store conversation histories
const userConversations = {};

app.post('/api/assistant', async (req, res) => {
  const { userId, prompt } = req.body;

   // Check if the user's conversation history exists, otherwise initialize it as an empty array
   if (!userConversations[userId]) {
    // Pre-fill conversation history with a system message
    userConversations[userId] = [
      {
        "role": "system",
        "content": "you are ray a chatbot developed by raysun capital, you help people to be able to apply loans using this chatbot, you also give financial advice to the users, you are friendly"
      }
    ];
  }
console.log(userConversations)
  
  
  // Add the user's message to their conversation history
  userConversations[userId].push({
    "role": "user",
    "content": prompt
  });
   // Track user message event in Mixpanel
   mixpanelClient.track('User Message', {
    distinct_id: userId, // Assuming userId is available in the request body
    message: prompt
  });
  console.log('Request body:', req.body);
  const gptResponse = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    max_tokens : 2048,

    messages: userConversations[userId] // Use the user's conversation history
  });
  
  console.log('gptResponse: ', gptResponse); // Log the entire response
  console.log('gptResponse.data.choices[0]: ', gptResponse.data.choices[0]); // Log the first choice

  // Check if choices and message exist in the response
  if (gptResponse && gptResponse.data && gptResponse.data.choices && gptResponse.data.choices[0] && gptResponse.data.choices[0].message) {
    const assistantReply = gptResponse.data.choices[0].message.content;
  
    // Add the assistant's reply to the user's conversation history
    userConversations[userId].push({
      "role": "assistant",
      "content": assistantReply
    });
// Track assistant reply event in Mixpanel
mixpanelClient.track('Assistant Reply', {
  distinct_id: userId, // Assuming userId is available in the request body
  message: assistantReply
});
    res.send({ 'botresponse': assistantReply });
  } else {
    res.status(500).send({ 'error': 'Unexpected response from OpenAI API' });
  }
});






app.listen(PORT, () => {
    log.green(`Server is listening on port ${PORT}`);
}
);





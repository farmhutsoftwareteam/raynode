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
app.use(morgan("tiny"));
app.use(express.json());
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerFile))

app.get("/", (req, res) => {
    res.send("Raysun Capital");
});
app.use("/user", UserRouter) // send all "/user" requests to UserRouter for routing
app.use('/invoice', invoiceRoutes);
app.use('/user-info', userInfoRouter);
app.use('/withdraw', withdrawRouter);
// Use loan routes
app.use('/api', loanRoutes);


// Initialize an empty conversation history
let conversationHistory = [
  {
    "role": "system",
    "content": "You are a helpful assistant."
  }
];

app.post('/api/assistant', async (req, res) => {
  const prompt = req.body.prompt;
  
  // Add the user's message to the conversation history
  conversationHistory.push({
    "role": "user",
    "content": prompt
  });

  const gptResponse = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: conversationHistory
  });
  
  console.log('gptResponse: ', gptResponse); // Log the entire response
  console.log('gptResponse.data.choices[0]: ', gptResponse.data.choices[0]); // Log the first choice

  // Check if choices and message exists in the response
  if (gptResponse && gptResponse.data && gptResponse.data.choices && gptResponse.data.choices[0] && gptResponse.data.choices[0].message) {
    const assistantReply = gptResponse.data.choices[0].message.content;
  
    // Add the assistant's reply to the conversation history
    conversationHistory.push({
      "role": "assistant",
      "content": assistantReply
    });

    res.send({ 'message': assistantReply });
  } else {
    res.status(500).send({ 'error': 'Unexpected response from OpenAI API' });
  }
});






app.listen(PORT, () => {
    log.green(`Server is listening on port ${PORT}`);
}
);





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


const configuration = new Configuration({
    apiKey: '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'
})
const openai = new OpenAIApi(configuration);

const swaggerFile = require('./swagger_output.json') //documentation
const swaggerUi = require('swagger-ui-express') //ui for api

const app = express();
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
app.post("/question", async (req, res) => {
    const prompt = req.body.prompt;
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      temperature: 0,
      max_tokens: 60,
      top_p: 1,
      frequency_penalty: 0.5,
      presence_penalty: 0,
    });
  
    res.send(response.choices[0].text);
  });
app.listen(PORT, () => {
    log.green(`Server is listening on port ${PORT}`);
}
);





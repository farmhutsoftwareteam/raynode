require("dotenv").config() // load .env variables

const {Schema, model} = require("../db/connection") // import Schema & model


// Define the schema for the response
const responseSchema = new Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
  },
  prompt : {
    type: String,
    required: true,
    },

  message: {
    type: String,
    default: null,
    }
});

// Create the Response model
const   ResponseSchema = model('ResponseSchema', responseSchema);

module.exports = ResponseSchema;

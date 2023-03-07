const mongoose = require('mongoose');
require ('dotenv').config();
const {Schema, model} = require("../db/connection") // import Schema & model


const tripSchema = new mongoose.Schema({
  tripName: {
    type: String,
    required: true,
    unique: true
  },
  route: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Trip = mongoose.model('Trip', tripSchema);

module.exports = Trip;

require("dotenv").config() // load .env variables
const {Schema, model} = require("../db/connection") // import Schema & model

const TransactionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  type: {
    type: String,
    required: true,
    enum: ["deposit", "withdrawal"]
  },
  status: {
    type: String,
    required: true,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected']
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  }
});

const Transaction = model("Transaction", TransactionSchema);

module.exports = Transaction;


const express = require('express');
require("dotenv").config(); // load .env variables
const nodemailer = require("nodemailer");
const User = require('../models/User');

const router = express.Router();
const { withdraw } = require('../controllers/withdraw');
const Transaction = require('../models/transactions');

router.post('/withdraw', withdraw);
router.get("/transaction", async (req, res) => {
    try {
      const transactions = await Transaction.find();
      res.json(transactions);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  

module.exports = router;

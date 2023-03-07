require("dotenv").config(); // load .env variables

const Transaction = require('../models/transactions');


const User = require('../models/User');
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
    host: 'smtp.titan.email',
    port: 587,
    secure: false,
    auth: {
      user: 'github@kwingy.com',
      pass: 'GitHub2022.'
    },
    tls: {
      ciphers: 'SSLv3'
    }
  });
  const sendWithdrawalRequestEmail = async (user, amount) => {
    const mailOptions = {
        from: "github@kwingy.com",
        to: "munya@kwingy.com, brian.munyawarara@raysuncapital.com, munya@farmhutafrica.com",
        subject: "Withdrawal Request",
        text: `A user ${user.username} with email ${user.email} has requested to withdraw ${amount}.`
    };
    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log(`Email sent: ${info.response}`);
        }
    });
  };

const withdraw = async (req, res) => {
    const { userId, amount } = req.body;

    //validate request
    if (!userId || !amount) {
        return res.status(400).json({ error: "Invalid request" });
    }

   

    //retrieve user's current balance
    const user = await User.findById(userId);
    const { balance } = user.wallet;
    //verify that user has enough funds to process withdrawal
    if (amount > balance) {
        return res.status(400).json({ error: "Insufficient funds" });
    }

    //create new transaction
    const transaction = new Transaction({
        userId: userId,
        amount: amount,
        type: "withdrawal",
        status: 'pending'
    });
    //update user's balance
    user.wallet.balance -= amount;
    //save user and transaction to db
    await user.save();
    await transaction.save();

    // Send email to admin for approval


    sendWithdrawalRequestEmail(user, amount);


    //send response
    return res.json({ message: "Withdrawal request sent successfully" });


};

module.exports = { withdraw }






require("dotenv").config(); // load .env variables
const { Router } = require("express"); // import router from express
const User = require("../models/User"); // import user model
const bcrypt = require("bcryptjs"); // import bcrypt to hash passwords
const jwt = require("jsonwebtoken"); // import jwt to sign tokens
const nodemailer = require('nodemailer');
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


const router = Router(); // create router to create route bundle

//DESTRUCTURE ENV VARIABLES WITH DEFAULTS
const { SECRET = "secret" } = process.env;

router.post("/signup", async (req, res) => {
  try {
    // hash the password
    req.body.password = await bcrypt.hash(req.body.password, 10);

    // Collect email from the request
    const email = req.body.email;

    // create a new user
    const user = await User.create({...req.body, email});

   

    //send email notification to admin

  
  let mailOptions = {
      from: 'github@kwingy.com',
      to: 'munya@kwingy.com, brian.munyawarara@raysuncapital.com, munya@farmhutafrica.com ',
      subject: 'New user signup RaysunCapital',
      text: `A new user has signed up to Raysun Capital. Their email is ${email}.`
  };
  transporter.sendMail(mailOptions, function(error, info){
      if (error) {
          console.log(error);
      } else {
          console.log('Email sent: ' + info.response);
      }
  });

    // sign token and send it in response
    const token = await jwt.sign({ username: user.username, email: user.email }, SECRET);
    const userId = user._id;
    res.json({ user, token, userId });
  } catch (error) {
    res.status(400).json({ error });
  }
});


//login to verify user

router.post("/login", async (req, res) => {
  try {
    // check if the user exists
    const user = await User.findOne({ username: req.body.username });
    if (user) {
      //check if password matches
      const result = await bcrypt.compare(req.body.password, user.password);
      if (result) {
        // sign token and send it in response
        const token = await jwt.sign({ id: user._id, username: user.username }, SECRET);
        const userResponse = {...user.toObject(), token};
        res.json(userResponse);
      } else {
        res.status(400).json({ error: "password doesn't match" });
      }
    } else {
      res.status(400).json({ error: "User doesn't exist" });
    }
  } catch (error) {
    res.status(400).json({ error });
  }
});

router.get("/wallet/balance", async (req, res) => {
  try {
    // Verify the token and get the user id
    const { userId } = req.decoded;
    // Find the wallet associated with the user
    const wallet = await Wallet.findOne({ userId });
    // Return the balance
    res.json({ balance: wallet.balance });
  } catch (error) {
    res.status(400).json({ error });
  }
});


module.exports = router
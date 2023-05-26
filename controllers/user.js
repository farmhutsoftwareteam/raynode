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
const mixpanel = require('mixpanel');
const mixpanelToken = 'c08415fd158425a0180c1036e50af0e0';
const mixpanelClient = mixpanel.init(mixpanelToken);

//DESTRUCTURE ENV VARIABLES WITH DEFAULTS
const { SECRET = "secret" } = process.env;

router.post("/signup", async (req, res) => {
  try {
    // check if username or phone already exists
    const existingUser = await User.findOne({ $or: [{username: req.body.username}, {phone: req.body.phone}] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or phone already exists.' });
    }

    // create a new user
    const user = await User.create(req.body);

    // sign token and send it in response
    const token = await jwt.sign({ id: user._id, username: user.username, phone: user.phone }, SECRET);
    const userId = user._id;

    mixpanelClient.track('Signup', {
      distinct_id: userId,
      username: user.username,
      phone: user.phone,
      signupDate: new Date().toISOString()

    });
    res.json({ user, token, userId });
  } catch (error) {
    res.status(400).json({ error });
  }
});







//login to verify user

router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ $or: [{ username: req.body.username }, { phone: req.body.phone }] });

    if (!user) {
      res.status(400).json({ error: "User doesn't exist" });
      return;
    }

    const token = await jwt.sign({ id: user._id, username: user.username, phone: user.phone }, SECRET);
    // Exclude the password from the response
    user.password = undefined;
    const userResponse = {...user.toObject(), token};
    mixpanelClient.track('Login', {
      distinct_id: user._id,
      username: user.username,
      phone: user.phone
    });
    res.json(userResponse);

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

router.get("/users", async (req, res) => {
  try {
    // Fetch all users from the database
    const users = await User.find();

    // Return the list of users
    res.json(users);
  } catch (error) {
    // If there was an error, return it
    res.status(500).json({ error });
  }
});


module.exports = router
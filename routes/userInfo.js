require("dotenv").config(); // load .env variables
const express = require("express");
const router = express.Router();
const User = require("../models/User"); // import user model
const bcrypt = require("bcryptjs"); // import bcrypt to hash passwords
const jwt = require("jsonwebtoken"); // import jwt to sign tokens


const { ObjectId } = require('mongodb');

router.get('/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    res.status(400).json({ message: 'Invalid id' });
    return;
  }
  try {
    const user = await User.findById(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



module.exports = router;

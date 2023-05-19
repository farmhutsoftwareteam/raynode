const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');
const User = require("../models/User");

//DESTRUCTURE ENV VARIABLES WITH DEFAULTS
const { SECRET = "secret" } = process.env;

module.exports = async function(req, res, next) {
    const token = req.header("Authorization");

    if (!token) {
        return res.status(401).json({ message: "No token, authorization denied." });
    }

    try {
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ message: "Token is not valid." });
    }
};

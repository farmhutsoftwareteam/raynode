const express = require('express');
const router = express.Router();
const applyForCivilServantLoan = require('../functions/civilservantloan');

router.post('/', async (req, res) => {
    try {
        // Extract loan data from request body
        const loanData = req.body;

        // You might need to add additional data to loanData here
        // For example, if req contains user-related information
        // loanData.userId = req.user.id;

        // Call the function to apply for a civil servant loan
        const result = await applyForCivilServantLoan(loanData, req);

        // Send back the result
        res.status(201).json(result);
    } catch (error) {
        // Handle errors
        console.error(error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

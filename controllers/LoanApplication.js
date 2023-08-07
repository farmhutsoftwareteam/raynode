const express = require('express');
const router = express.Router();
const LoanApplication = require('../models/LoanApplication'); // Adjust the path accordingly

// Create
router.post('/create', (req, res) => {
    const newLoanApplication = new LoanApplication(req.body);
    newLoanApplication.save()
        .then((savedDetails) => {
            res.json(savedDetails);
        })
        .catch((error) => {
            res.status(500).json({ error: 'Error saving personal details' });
        });
});

// Read all
router.get('/read', (req, res) => {
    LoanApplication.find()
        .then((allDetails) => {
            res.json(allDetails);
        })
        .catch((error) => {
            res.status(500).json({ error: 'Error fetching personal details' });
        });
});

// Read by ID
router.get('/read/:id', (req, res) => {
    const id = req.params.id;
    LoanApplication.findById(id)
        .then((details) => {
            if (!details) {
                return res.status(404).json({ error: 'Personal details not found' });
            }
            res.json(details);
        })
        .catch((error) => {
            res.status(500).json({ error: 'Error fetching personal details' });
        });
});

// Update
router.put('/update/:id', (req, res) => {
    const id = req.params.id;
    LoanApplication.findByIdAndUpdate(id, req.body, { new: true })
        .then((updatedDetails) => {
            if (!updatedDetails) {
                return res.status(404).json({ error: 'Personal details not found' });
            }
            res.json(updatedDetails);
        })
        .catch((error) => {
            res.status(500).json({ error: 'Error updating personal details' });
        });
});

// Delete
router.delete('/delete/:id', (req, res) => {
    const id = req.params.id;
    LoanApplication.findByIdAndDelete(id)
        .then((deletedDetails) => {
            if (!deletedDetails) {
                return res.status(404).json({ error: 'Personal details not found' });
            }
            res.json({ message: 'Personal details deleted' });
        })
        .catch((error) => {
            res.status(500).json({ error: 'Error deleting personal details' });
        });
});

module.exports = router;

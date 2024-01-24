const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const type = file.fieldname === 'loanCsv' ? 'loans' : 'customers';
    const dest = `uploads/${type}`;
    fs.mkdirSync(dest, { recursive: true }); // Ensure directory exists
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const date = new Date().toISOString().split('T')[0]; // Format as 'YYYY-MM-DD'
    const uniqueSuffix = `${date}-${Date.now()}-${file.originalname}`;
    cb(null, uniqueSuffix);
  }
});

const upload = multer({ storage: storage });

// Route to handle CSV upload
router.post('/upload-csv', upload.fields([
  { name: 'loanCsv', maxCount: 1 },
  { name: 'customersCsv', maxCount: 1 }
]), (req, res) => {
  try {
    // You can access the files using req.files['loanCsv'] or req.files['customersCsv']
    res.status(200).send('Files uploaded successfully');
  } catch (error) {
    res.status(500).send(`Error uploading files: ${error.message}`);
  }
});

module.exports = router;
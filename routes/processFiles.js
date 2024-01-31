const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const router = express.Router();

router.get('/upload-csv', (req, res) => {
  const loanUrl = req.query.loan;
  const customerUrl = req.query.customer;

  if (!loanUrl && !customerUrl) {
    return res.status(400).send('No URLs provided.');
  }

  const currentDate = new Date().toISOString().split('T')[0]; // Format as 'YYYY-MM-DD'

  if (loanUrl) {
    const loanFilename = `Loan-${currentDate}.csv`;
    downloadFile(loanUrl, path.join('Loans', loanFilename));
  }

  if (customerUrl) {
    const customerFilename = `Customer-${currentDate}.csv`;
    downloadFile(customerUrl, path.join('Customers', customerFilename));
  }

  res.status(200).send('Files are being downloaded.');
});

function downloadFile(fileUrl, filepath) {
  const parsedUrl = url.parse(fileUrl);
  const dir = path.join(__dirname, '../public', path.dirname(filepath));

  // Ensure the directory exists
  fs.mkdirSync(dir, { recursive: true });

  const fullFilePath = path.join(dir, path.basename(filepath));
  const fileStream = fs.createWriteStream(fullFilePath);

  https.get(parsedUrl.href, function(response) {
    response.pipe(fileStream);

    fileStream.on('finish', function() {
      fileStream.close();
      console.log('Downloaded file and saved to', fullFilePath);
    });
  }).on('error', function(err) {
    fs.unlink(fullFilePath, (unlinkErr) => {
      if (unlinkErr) console.error('Error removing incomplete file:', unlinkErr.message);
    });
    console.error('Error downloading file:', err.message);
  });
}

module.exports = router;
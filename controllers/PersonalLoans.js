const express = require('express');
const { CivilServantLoan, NonCivilServantLoan, GovernmentPensionerLoan } = require("../models/LoanModels");
const router = express.Router();
const axios = require('axios');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const authenticateUser = require("../middleware/auth");
function generateLoanPDF(loan, fullName) {
    // Create a new PDF document
    const doc = new PDFDocument();
  
    // Set the output file path
    const filePath = `public/${fullName.replace(/\s+/g, '_').toLowerCase()}_loan_application.pdf`;

  
    // Pipe the PDF document to a writable stream (file)
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
  
    // Add loan details to the PDF document
    doc.fontSize(12).text('Loan Application Details', { align: 'center' }).moveDown();
    doc.fontSize(10).text(`Loan Type: ${loan.constructor.modelName}`).moveDown();
  
    // Add loan fields and values to the PDF document
    for (const [key, value] of Object.entries(loan._doc)) {
      doc.fontSize(10).text(`${key}: ${value}`).moveDown();
    }
  
    // Finalize the PDF document
    doc.end();
    const newpath = `${fullName.replace(/\s+/g, '_').toLowerCase()}_loan_application.pdf`;
  
    return newpath;
  }
  

  router.post("/loan/civil-servant", async (req, res) => {
    try {
      const loan = await CivilServantLoan.create(req.body);
  
      const fullName = req.body.fullName;
      const pdfFilePath = await generateLoanPDF(loan, fullName);
      
  
      // Get the base URL of your application
      const baseUrl = req.protocol + '://' + req.get('host');
  
      // Construct the PDF URL
      const pdfUrl = `${baseUrl}/${pdfFilePath}`;

      const pdfUrlObject = { pdfUrl };
  
      // Return the loan data along with the PDF URL
      await sendWebhookData(loan, pdfUrlObject);
      console.log(loan ,pdfUrlObject)
      res.status(201).json({ loan, pdfUrl });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  

router.post("/loan/non-civil-servant", async (req, res) => {
  try {
    const loan = await NonCivilServantLoan.create(req.body);
    await sendWebhookData(loan);
    res.status(201).json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint to create a Government Pensioner Loan Application
router.post("/loan/government-pensioner",  async (req, res) => {
  try {
    const loan = await GovernmentPensionerLoan.create(req.body);

    await sendWebhookData(loan);
    res.status(201).json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Function to send loan information to webhook
// Function to send loan information to webhook
// Function to send loan information to webhook
async function sendWebhookData(loan, pdfUrl) {
  const webhookUrl = 'https://flows.messagebird.com/flows/c8016044-89b0-4b85-9262-8830a0b46554/invoke';

  try {
    // Extract loan type and document
    const loanType = loan.constructor.modelName;
    const loanDocument = loan._doc;

    // Create the simplified message
    let formattedMessage = `New loan application received:\n\nLoan Type: ${loanType}\n\n`;

    // Format the loan details
    for (const [key, value] of Object.entries(loanDocument)) {
      formattedMessage += `${key}: ${value}\n`;
    }

    // Make HTTP POST request to the webhook URL with the message and pdfUrl as the payload
    await axios.post(webhookUrl, { loanmessage: formattedMessage, pdfUrl });

    console.log('Loan information sent to webhook successfully');
  } catch (error) {
    console.error('Error sending loan information to webhook:', error);
  }
}

  

module.exports = router;

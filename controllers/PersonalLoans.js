const express = require('express');
const { CivilServantLoan, NonCivilServantLoan, GovernmentPensionerLoan } = require("../models/LoanModels");
const router = express.Router();
const axios = require('axios');
const path = require('path')

const { PDFDocument, rgb } = require("pdf-lib");
const PDFLib = require('pdf-lib');


const fs = require('fs');
const nodemailer = require('nodemailer');
const authenticateUser = require("../middleware/auth");
const mixpanel = require('mixpanel');
const mixpanelToken = 'c08415fd158425a0180c1036e50af0e0';
const mixpanelClient = mixpanel.init(mixpanelToken);
const generateLoanPDF = async (loan, fullName) => {
  const pdfTemplatePath = path.join(__dirname, '../public/pdfTemplates/raysunloan.pdf');
  const outputPath = path.join(__dirname, '../public/generatedPDFs', `${loan._id}.pdf`);

  // Load the PDF template
  const pdfTemplate = await PDFLib.PDFDocument.load(fs.readFileSync(pdfTemplatePath));

  // Get the form fields in the PDF
  const formFields = pdfTemplate.getForm().getFields();

  // Fill the form fields with loan data
  formFields.forEach((field) => {
    const fieldName = field.getName();

    // Check if the field name matches the loan data property
    if (fieldName === 'Date') {
      field.setText(new Date().toLocaleDateString());
    } else if (fieldName === 'fullName') {
      field.setText(fullName);
    } else if (fieldName === 'idNumber') {
      field.setText(loan.idNumber);
    } else if (fieldName === 'phoneNumber') {
      field.setText(loan.phoneNumber);
    } else if (fieldName === 'email') {
      field.setText(loan.email);
    } else if (fieldName === 'ecNumber') {
      field.setText(loan.ecNumber);
    } else if (fieldName === 'loanType') {
      field.setText('Civil Servant Loan');
    } else if (fieldName === 'loanTenure') {
      field.setText(loan.loanTenure.toString());
    }
    // Add more conditions for other fields if needed
  });

  // Save the filled PDF to the output path
  const pdfBytes = await pdfTemplate.save();
  fs.writeFileSync(outputPath, pdfBytes);

  return outputPath;
};




// Configure the transporter for sending emails
const transporter = nodemailer.createTransport({
  host: 'smtp.elasticemail.com',
  port: 2525,
  secure: false,
  auth: {
    user: 'ray@raysuncapital.com',
    pass: 'C623EEFECACB8B8BBB11FEAE1927262519AF',
  },
});




// Function to send loan information to webhook and email
async function sendWebhookAndEmail(loan, pdfUrl) {
  const webhookUrl = 'https://flows.messagebird.com/flows/c8016044-89b0-4b85-9262-8830a0b46554/invoke';
  const recipientEmails = ['munya@farmhutafrica.com', 'mitchelle@raysuncapital.com', 'panashegotora@raysuncapital.com' , 'brianmunyawarara@raysuncapital.com'];

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

    // Send loan information to webhook
    await axios.post(webhookUrl, { loanmessage: formattedMessage, pdfUrl });

    console.log('Loan information sent to webhook successfully');

    // Send email notification
    await transporter.sendMail({
      from: 'ray@raysuncapital.com',
      to: recipientEmails.join(', '), // Convert the array to a comma-separated string
      
      subject: 'New Loan Application Received',
      text: formattedMessage,
      attachments: [
        {
          filename: 'loan_application.pdf',
          path: pdfUrl,
        },
      ],
    });

    console.log('Email notification sent successfully');
  } catch (error) {
    console.error('Error sending loan information and email:', error);
  }
}

router.post("/loan/civil-servant", async (req, res) => {
  try {
    const loan = await CivilServantLoan.create(req.body);

    const fullName = req.body.fullName;
    
    // Generate the loan PDF
    const pdfFilePath = await generateLoanPDF(loan, fullName);

   

    // Construct the PDF URL
    const baseUrl = req.protocol + '://' + req.get('host');
const pdfUrl = `${baseUrl}/generatedPDFs/${loan._id}.pdf`;



    // Get the loan amount from the created loan object
    const loanAmount = loan.loanAmount;

    // Track loan application event in Mixpanel
    mixpanelClient.track('Loan Application', {
      distinct_id: req.body.userId, // Assuming userId is available in the request body
      loanType: 'civil-servant',
      loanAmount: loanAmount,
      pdfUrl: pdfUrl,
    });

    // Send loan information to webhook and email
    await sendWebhookAndEmail(loan, pdfUrl);

    // Send the PDF URL in the response
    res.status(201).json({ loan, pdfUrl });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


router.post("/loan/non-civil-servant", async (req, res) => {
  try {
    const loan = await NonCivilServantLoan.create(req.body);
    await sendWebhookAndEmail(loan);
    mixpanel.track('Loan Application', {
      userId: loan.userId,
      loanId: loan._id,
      loanType: 'Non-Civil Servant Loan',
      loanAmount: loan.loanAmount,
    });
    res.status(201).json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/loan/government-pensioner", async (req, res) => {
  try {
    const loan = await GovernmentPensionerLoan.create(req.body);
    await sendWebhookAndEmail(loan);

    mixpanel.track('Loan Application' , {
      userId : loan.userId,
      loanId: loan._id,
      loanType: 'Government Pensioner Loan',
      loanAmount: loan.loanAmount,
    })
    res.status(201).json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/loan/:type", async (req, res) => {
  const loanType = req.params.type;

  try {
    let loans;

    // Check the loan type and retrieve the corresponding loan applications
    switch (loanType) {
      case "civil-servant":
        loans = await CivilServantLoan.find();
        break;
      case "non-civil-servant":
        loans = await NonCivilServantLoan.find();
        break;
      case "government-pensioner":
        loans = await GovernmentPensionerLoan.find();
        break;
      default:
        return res.status(404).json({ error: "Invalid loan type" });
    }

    res.status(200).json(loans);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router.put("/loan/:id/approve", async (req, res) => {
  try {
    const loanId = req.params.id;
    const loanType = req.body.loanType; // Assuming the loan type is provided in the request body

    let LoanModel;
    switch (loanType) {
      case 'civil-servant':
        LoanModel = CivilServantLoan;
        break;
      case 'non-civil-servant':
        LoanModel = NonCivilServantLoan;
        break;
      case 'government-pensioner':
        LoanModel = GovernmentPensionerLoan;
        break;
      default:
        return res.status(400).json({ error: 'Invalid loan type' });
    }

    const loan = await LoanModel.findById(loanId).populate('userId');

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Perform loan approval logic here
    loan.status = 'approved';
    loan.approvedAmount = req.body.approvedAmount; // Set the approved amount

    // Calculate return data
    const interestRate = 0.15; // 15% interest rate
    const tenureInMonths = loan.loanTenure; // Assuming loanTenure is in months

    console.log('Approved Amount:', loan.approvedAmount);
    console.log('Loan Tenure:', tenureInMonths);

    const totalAmountToReturn = loan.approvedAmount + (loan.approvedAmount * interestRate);
    const monthlyInstallment = totalAmountToReturn / tenureInMonths;

    console.log('Total Amount to Return:', totalAmountToReturn);
    console.log('Monthly Installment:', monthlyInstallment);

    if (isNaN(totalAmountToReturn) || isNaN(monthlyInstallment)) {
      return res.status(400).json({ error: 'Invalid calculation result' });
    }

    loan.returnTenure = tenureInMonths;
    loan.totalAmountToReturn = totalAmountToReturn;
    loan.monthlyInstallment = monthlyInstallment;
    await loan.save();

    // Update user's wallet balance
    const user = loan.userId;
    user.walletBalance = user.walletBalance || 0 ;
    user.walletBalance += loan.approvedAmount;
    await user.save();

    // Send email notification
    const emailSubject = 'Loan Approved';
    const emailMessage = `
      Congratulations! Your loan has been approved.

      Approved Amount: ${loan.approvedAmount}
      Loan Tenure: ${loan.loanTenure} months
      Total Amount to Return: ${totalAmountToReturn}
      Monthly Installments: ${monthlyInstallment}

      Your wallet has been topped up with the approved amount.
      You can collect the funds at our offices in Eastlea or Harare CBD.

      Thank you for choosing our services.
    `;

    await transporter.sendMail({
      from: 'ray@raysuncapital.com',
      to: 'munya@farmhutafrica.com',
      subject: emailSubject,
      text: emailMessage,
    });

    res.json({
      loan,
      returnTenure: tenureInMonths,
      totalAmountToReturn,
      monthlyInstallment,
      walletBalance: user.walletBalance,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});





router.put("/loan/:id/deny", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Perform loan denial logic here
    loan.status = 'denied';

    await loan.save();

    res.json({ loan });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


module.exports = router;

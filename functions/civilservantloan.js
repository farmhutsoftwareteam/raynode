// Required imports
const mixpanel = require('mixpanel');
const mixpanelToken = 'c08415fd158425a0180c1036e50af0e0';
const mixpanelClient = mixpanel.init(mixpanelToken);
const generateLoanPDF = async (loan) => {
  const pdfTemplatePath = path.join(__dirname, '../public/pdfTemplates/RaysunUpdated1.pdf');
  const outputPath = path.join(__dirname, '../public/generatedPDFs', `${loan._id}.pdf`);

  // Load the PDF template
  const pdfTemplate = await PDFLib.PDFDocument.load(fs.readFileSync(pdfTemplatePath));

  // Get the form fields in the PDF
  const formFields = pdfTemplate.getForm().getFields();

  // Fill the form fields with loan data
  formFields.forEach((field) => {
    const fieldName = field.getName();
    const fieldValue = loan[fieldName]; // Assuming field names match the loan property names
    if (fieldName === 'dob') {
      field.setText(fieldValue); // Use the converted dob string
    } else if (fieldValue !== undefined) {
      field.setText(fieldValue.toString());
    };

    if (fieldValue !== undefined) {
      field.setText(fieldValue.toString());
    }
  });

  // Save the filled PDF to the output path
  const pdfBytes = await pdfTemplate.save();
  fs.writeFileSync(outputPath, pdfBytes);

  return outputPath;
};
const {CivilServantLoan} = require('../models/LoanModels');
const path = require('path');
const PDFLib = require('pdf-lib');
const fs = require('fs');


// Function to send loan information to webhook and email
async function sendWebhookAndEmail(loan, pdfUrl) {
    const webhookUrl = 'https://flows.messagebird.com/flows/c8016044-89b0-4b85-9262-8830a0b46554/invoke';
    const recipientEmails = ['nyarie@raysuncapital.com', 'munya@farmhutafrica.com', 'lisa@raysuncapital.com', 'panashegotora@raysuncapital.com' , 'brianmunyawarara@raysuncapital.com','sean@raysuncapital.com',  'mmunya7@gmail.com'];
  
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

// Function to apply for a Civil Servant Loan
async function applyForCivilServantLoan(loanData, req) {
  try {
    // Create the loan record
    const loan = await CivilServantLoan.create(loanData);

    // Generate the loan PDF
    const pdfFilePath = await generateLoanPDF(loan);

    // Construct the PDF URL
    const baseUrl = req.protocol + '://' + req.get('host');
    const pdfUrl = `${baseUrl}/generatedPDFs/${loan._id}.pdf`;

    // Track loan application event in Mixpanel
    mixpanelClient.track('Loan Application', {
      distinct_id: loanData.userId, // Assuming you have userId in loanData
      loanType: 'civil-servant',
      loanAmount: loan.loanAmount,
      pdfUrl: pdfUrl,
    });

    // Send loan information to webhook and email
    await sendWebhookAndEmail(loan, pdfUrl);

    // Return the created loan record and PDF URL
    return { loan, pdfUrl };
  } catch (error) {
    throw new Error(`Error processing civil servant loan: ${error.message}`);
  }
}

module.exports = applyForCivilServantLoan;

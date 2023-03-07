const Invoice = require("../models/Invoice");



//configuring the email
const nodemailer = require("nodemailer");
const User = require("../models/User");
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

  //sending the email
  const sendDiscountEmail = (invoice) =>  {
    const mailOptions = {
        from: "github@kwingy.com",
        to: "munya@farmhutafrica.com , brian.munyawarara@raysuncapital.com",
        subject: `Discount Request on Invoice # ${invoice.invoiceNumber}`,
        text: `A user ${invoice.user} with email ${invoice.user.email} has requested a discount on invoice #${invoice.invoiceNumber} Please review Invpice details and atke appropriate action. Invoice Amount is ${invoice.invoiceamount} .`

  }
  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
        console.log(error);
    } else {
        console.log(`Email sent: ${info.response}`);
    }
});
}


exports.createInvoice = (req, res) => {
  const { client, date, dueDate, description, user ,route, fuelcost, tollscost, maintenancecost , discount , invoiceamount} = req.body;

  User.findOne({ _id: user})
    if(!user) {
      return res.status(404).json({ message: "User not found" });
    }
  const newInvoice = new Invoice({ client, date, dueDate, description, user ,route ,fuelcost , tollscost ,maintenancecost ,discount ,invoiceamount });

  if(!newInvoice.invoiceNumber) {
    newInvoice.invoiceNumber = Date.now();
  }
  
  newInvoice
    .save()
    .then(invoice => {
      if (invoice.discount) {
          sendDiscountEmail(invoice);
      }
      res.json(invoice)
  })
    .catch(err => res.status(400).json({ message: "Unable to create invoice", error: err }));
};

exports.updateInvoice = (req, res) => {
  const { client, date, dueDate, description, user ,route ,fuelcost ,tollscost ,maintenancecost } = req.body;
  Invoice.findOneAndUpdate({ _id: req.params.id }, { client, date, dueDate, description, user ,route ,fuelcost, tollscost ,maintenancecost }, { new: true })
    .then(invoice => {
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }
        res.json(invoice);
    })
    .catch(err => res.status(400).json({ message: "Unable to update invoice", error: err }));
};
exports.getInvoicesByUser = (req, res) => {
  User.findById(req.params.userId)
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      Invoice.find({ user: user._id })
        .then(invoices => {
          res.json({ invoices });
        })
        .catch(err => res.status(400).json({ message: 'Unable to fetch invoices', error: err }));
    })
    .catch(err => res.status(400).json({ message: 'Unable to fetch user', error: err }));
};


exports.getInvoiceCount = ( req, res) => {

  User.findById(req.params.userId)
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      Invoice.countDocuments({ user: user._id })
        .then(invoiceCount => {
          res.json({ invoiceCount });
        })
        .catch(err => res.status(400).json({ message: 'Unable to fetch invoices count', error: err }));
    })
    .catch(err => res.status(400).json({ message: 'Unable to fetch user', error: err }));
};

exports.getInvoiceTotalsByUser = async (userId) => {
  try {
    const invoices = await Invoice.find({ user: userId });
    let totalInvoiceAmount = 0;
    let totalTollsCost = 0;
    let totalMaintenanceCost = 0;
    let totalFuelCost = 0;
    invoices.forEach((invoice) => {
      totalInvoiceAmount += parseFloat(invoice.invoiceamount.replace("$", ""));
      totalTollsCost += parseFloat(invoice.tollscost.replace("$", ""));
      totalMaintenanceCost += parseFloat(invoice.maintenancecost.replace("$", ""));
      totalFuelCost += parseFloat(invoice.fuelcost.replace("$", ""));
    });
    const totalCosts = totalTollsCost + totalMaintenanceCost + totalFuelCost;
    const profit = totalInvoiceAmount - totalCosts;
    return {
      totalInvoiceAmount,
      totalTollsCost,
      totalMaintenanceCost,
      totalFuelCost,
      profit
    };
  } catch (error) {
    throw new Error(`Error getting invoice totals by user: ${error.message}`);
  }
};

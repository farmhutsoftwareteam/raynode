const { Schema, model } = require("mongoose");

const InvoiceSchema = new Schema({
    invoiceNumber: { type: Number, required: true },
  client: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    companybank: { type: String },
    accnumber: { type: String},
    branch: { type: String}
  },
  date: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  description: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  route: { type: String, required: true},
  fuelcost: { type: String, required: true},
  tollscost: { type: String , required: true },
  maintenancecost: {type: String , required: true },
  discount: { type: Boolean ,default: false, required: true},
  invoiceamount: { type: String ,required : true}


});

const Invoice = model("Invoice", InvoiceSchema);

module.exports = Invoice;

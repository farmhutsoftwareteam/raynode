const {Schema, model} = require("../db/connection");
require("dotenv").config()

const CivilServantLoanSchema = new Schema({
  ecNumber: { type: String, required: true },
  fullName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  idNumber: { type: String, required: true },
  loanAmount: { type: Number, required: true },
  loanTenure: { type: Number, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  approvedAmount: { type: Number },
   // New fields for return data
   returnTenure: { type: Number },
   totalAmountToReturn: { type: Number },
   monthlyInstallment: { type: Number },
});

const NonCivilServantLoanSchema = new Schema({
  noncivilServantEmployer: { type: String, required: true },
  fullName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  idNumber: { type: String, required: true },
  loanAmount: { type: Number, required: true },
  loanTenure: { type: Number, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  approvedAmount: { type: Number },
   // New fields for return data
   returnTenure: { type: Number },
   totalAmountToReturn: { type: Number },
   monthlyInstallment: { type: Number },
});

const GovernmentPensionerLoanSchema = new Schema({
  fullName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  idNumber: { type: String, required: true },
  loanAmount: { type: Number, required: true },
  loanTenure: { type: Number, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  approvedAmount: { type: Number },
   // New fields for return data
   returnTenure: { type: Number },
   totalAmountToReturn: { type: Number },
   monthlyInstallment: { type: Number },
});

module.exports = {
  CivilServantLoan: model("CivilServantLoan", CivilServantLoanSchema),
  NonCivilServantLoan: model("NonCivilServantLoan", NonCivilServantLoanSchema),
  GovernmentPensionerLoan: model("GovernmentPensionerLoan", GovernmentPensionerLoanSchema),
};


module.exports = {
  CivilServantLoan: model("CivilServantLoan", CivilServantLoanSchema),
  NonCivilServantLoan: model("NonCivilServantLoan", NonCivilServantLoanSchema),
  GovernmentPensionerLoan: model("GovernmentPensionerLoan", GovernmentPensionerLoanSchema)
}

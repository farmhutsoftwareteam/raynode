const {Schema, model} = require("../db/connection");
require("dotenv").config()

const CivilServantLoanSchema = new Schema({
  ecNumber: {type: String, required: true},
  fullName: {type: String, required: true},
  phoneNumber: {type: String, required: true},
  email: {type: String, required: true},
  idNumber: {type: String, required: true},
  loanAmount: {type: Number, required: true},
  loanTenure: {type: Number, required: true},
  userId: { type: Schema.Types.ObjectId, ref: "User" }, // new field to associate with User
});

const NonCivilServantLoanSchema = new Schema({
  noncivilServantEmployer: {type: String, required: true},
  fullName: {type: String, required: true},
  phoneNumber: {type: String, required: true},
  email: {type: String, required: true},
  idNumber: {type: String, required: true},
  loanAmount: {type: Number, required: true},
  loanTenure: {type: Number, required: true},
  userId: { type: Schema.Types.ObjectId, ref: "User" }, // new field to associate with User
});

const GovernmentPensionerLoanSchema = new Schema({
  fullName: {type: String, required: true},
  phoneNumber: {type: String, required: true},
  email: {type: String, required: true},
  idNumber: {type: String, required: true},
  loanAmount: {type: Number, required: true},
  loanTenure: {type: Number, required: true},
  userId: { type: Schema.Types.ObjectId, ref: "User" }, // new field to associate with User
});

module.exports = {
  CivilServantLoan: model("CivilServantLoan", CivilServantLoanSchema),
  NonCivilServantLoan: model("NonCivilServantLoan", NonCivilServantLoanSchema),
  GovernmentPensionerLoan: model("GovernmentPensionerLoan", GovernmentPensionerLoanSchema)
}

const mongoose = require('mongoose');

const loanApplicantSchema = new mongoose.Schema({
    Id: { type: Number, required: true },
    ECNumber: { type: Number, required: true },
    MobileNumber: { type: String },
    Title: { type: String },
    FirstName: { type: String, required: true },
    LastName: { type: String, required: true },
    Bank: { type: String },
    Branch: { type: String },
    BankAccount: { type: String },
    DOB: { type: Date },
    NationalID: { type: String },
    MaritalStatus: { type: String },
    PhysicalAddress: { type: String },
    PhysicalLocation: { type: String },
    CustomerArea: { type: String },
    WorkAddress: { type: String },
    WorkLocation: { type: String },
    WorkPhoneNumber: { type: String },
    Occupation: { type: String },
    Gender: { type: String },
    Sector: { type: String },
    SubSector: { type: String },
    BranchCode: { type: String },
    AStatus: { type: String },
    AReason: { type: String },
    CreatedBy: { type: String },
    CreatedDate: { type: Date },
    CreatedByIp: { type: String },
    RecordDeleted: { type: Boolean },
    CompanyCode: { type: String },
    ImagePath: { type: String },
    BusinessSpecialization: { type: String },
    IsCustomer: { type: Boolean },
    IsGuarantor: { type: Boolean },
    IsReferal: { type: Boolean },
});

const LoanApplicant = mongoose.model('LoanApplicant', loanApplicantSchema);

module.exports = LoanApplicant;

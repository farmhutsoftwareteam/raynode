require("dotenv").config() // load .env variables
const {Schema, model} = require("../db/connection") // import Schema & model

// User Schema
const UserSchema = new Schema({
  email: {type: String, required: false, default: 'munya@zimyellow.com'}, // remove 'unique: true' if you want to allow non-unique emails
  phone: { type: String, unique: true, required: true}, // 'unique: true' will enforce uniqueness
  type: { type: String, required: true }, // User type (admin, personal, trucker, company)
  username: {type: String, unique: true, required: true}, // 'unique: true' will enforce uniqueness
  password: {type: String, required: false},
  wallet: {
      balance: {
        type: Number,
        required: true,
        default: 0
      },
      transactions: [
        {
          type: Schema.Types.ObjectId,
          ref: "Transaction"
        }
      ]
    }
});

UserSchema.pre('save', function(next) {
    if (!this.wallet) {
      this.wallet = {
        balance: 0,
        transactions: []
      };
    }
    next();
  });
  



// User model
const User = model("User", UserSchema)

module.exports = User
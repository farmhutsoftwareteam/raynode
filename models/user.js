require("dotenv").config() // load .env variables
const {Schema, model} = require("../db/connection") // import Schema & model

// User Schema
const UserSchema = new Schema({
    email: {type: String, unique: true, required: true},
    username: {type: String, unique: true, required: true},
    password: {type: String, required: true},
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
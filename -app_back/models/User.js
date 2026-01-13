const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String, // hashed
  firstName: String,
  lastName: String,
  avatar: String,
  isAdmin: { type: Boolean, default: false },
});

module.exports = mongoose.model("User", userSchema);

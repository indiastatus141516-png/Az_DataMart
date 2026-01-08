const mongoose = require("mongoose");

const revokedTokenSchema = new mongoose.Schema({
  hash: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index: document expires at `expiresAt`
  },
});

module.exports = mongoose.model("RevokedToken", revokedTokenSchema);

const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  shopName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Bcrypt hash yahan aayega
  pricing: {
    bwSingle: { type: Number, default: 2 },
    bwDouble: { type: Number, default: 1.5 },
    colorSingle: { type: Number, default: 10 },
    colorDouble: { type: Number, default: 8 }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Shop', shopSchema);
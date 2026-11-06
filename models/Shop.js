const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  shopName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  pricing: {
    // 1. Base Rates (A4)
    bwSingle: { type: Number, default: 2 },
    bwDouble: { type: Number, default: 3 },
    colorSingle: { type: Number, default: 10 },
    colorDouble: { type: Number, default: 18 },

    // 2. Other Paper Sizes (Flat overrides per page)
    sizePrices: {
      A3: { bw: { type: Number, default: 4 }, color: { type: Number, default: 20 } },
      A5: { bw: { type: Number, default: 1 }, color: { type: Number, default: 5 } },
      Legal: { bw: { type: Number, default: 2 }, color: { type: Number, default: 10 } },
      Letter: { bw: { type: Number, default: 2 }, color: { type: Number, default: 10 } }
    },

    // 3. Bulk Discounts
    bulkDiscounts: [{
      minCopies: Number,
      maxCopies: Number,
      discountPercent: Number
    }],

    // 4. Extra / Handling Charges
    handlingFee: {
      type: { type: String, enum: ['Flat', 'Percentage', 'None'], default: 'Percentage' },
      value: { type: Number, default: 2 }
    }
  },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Shop', shopSchema);
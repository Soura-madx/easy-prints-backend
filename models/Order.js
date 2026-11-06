const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  customerName: { type: String, required: true },
  
  files: [{
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    settings: {
      pages: { type: Number, required: true },
      copies: { type: Number, default: 1 },
      color: { type: String, default: 'B&W' },        // 'B&W' or 'Color'
      paperSize: { type: String, default: 'A4' },     // 'A4', 'A3', 'A5', etc.
      sides: { type: String, default: 'single' },     // 'single' or 'both'
      orientation: { type: String, default: 'portrait' }, // 'portrait' or 'landscape'
      scale: { type: String, default: 'fit' }         // 'fit' or 'actual'
    }
  }], 
  
  payment: {
    baseAmount: { type: Number, required: true },
    gatewayFee: { type: Number, required: true },
    finalPaidAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Paid' }
  },
  
  status: { type: String, enum: ['Pending', 'Printing', 'Completed'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
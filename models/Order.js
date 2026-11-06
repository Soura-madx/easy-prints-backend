const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  customerName: { type: String, required: true },
  tokenNumber: { type: String, required: true }, // NAYA: Token Number
  
  files: [{
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    settings: {
      pages: { type: Number, required: true },
      copies: { type: Number, default: 1 },
      color: { type: String, default: 'B&W' },
      paperSize: { type: String, default: 'A4' },
      sides: { type: String, default: 'single' },
      orientation: { type: String, default: 'portrait' },
      scale: { type: String, default: 'fit' }
    }
  }], 
  
  payment: {
    baseAmount: { type: Number, required: true },
    gatewayFee: { type: Number, required: true },
    finalPaidAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Paid' }
  },
  
  status: { type: String, enum: ['Pending', 'Printing', 'Completed'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date } // NAYA: Track karne ke liye kab complete hua
});

module.exports = mongoose.model('Order', orderSchema);
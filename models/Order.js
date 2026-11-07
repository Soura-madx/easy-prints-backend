const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  customerName: { type: String, default: 'Walk-in Customer' },
  tokenNumber: { type: String },
  files: [{
    fileUrl: String,
    fileName: String,
    settings: {
      pages: Number,
      copies: Number,
      color: String,
      paperSize: String,
      sides: String,
      orientation: String,
      scale: String
    }
  }],
  // YEH PAYMENT OBJECT MATCH HONA ZAROORI HAI
  payment: {
    baseAmount: { type: Number },
    gatewayFee: { type: Number, default: 0 },
    finalPaidAmount: { type: Number, required: true },
    paymentStatus: { type: String, default: 'Pending' },
    paymentMethod: { type: String, default: 'Cash' }
  },
  status: { type: String, enum: ['Pending', 'Processing', 'Completed', 'Cancelled'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

module.exports = mongoose.model('Order', orderSchema);
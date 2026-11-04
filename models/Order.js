const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  shopId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Shop', 
    required: true 
  },
  customerName: { type: String, required: true },
  
  // Ab sab kuch files array ke andar aayega
  files: [{
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    settings: {
      pages: { type: Number, required: true },
      copies: { type: Number, default: 1 },
      isColor: { type: Boolean, default: false },
      isDoubleSided: { type: Boolean, default: false }
    }
  }], 
  
  // NOTE: Root level se purana 'fileName' aur 'settings' object hata diya gaya hai
  
  payment: {
    baseAmount: { type: Number, required: true },
    gatewayFee: { type: Number, required: true },
    finalPaidAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Paid' }
  },
  
  status: { 
    type: String, 
    enum: ['Pending', 'Printing', 'Completed'], 
    default: 'Pending' 
  },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
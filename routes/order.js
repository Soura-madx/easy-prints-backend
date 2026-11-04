const express = require('express');
const Shop = require('../models/Shop');
const Order = require('../models/Order');
const router = express.Router();



// Naya order create karne ki API
router.post('/create', async (req, res) => {
  try {
    // ❌ Purana: const { shopId, customerName, files, fileName, settings, payment } = req.body;
    
    // ✅ Naya: fileName aur settings ab 'files' array ke andar objects me hain
    const { shopId, customerName, files, payment } = req.body;

    // 1. Order ko Database me save karna
    const newOrder = new Order({
      shopId,
      customerName,
      files, // Yahan poora array (jisme fileUrl, fileName, aur settings hain) save hoga
      payment
    });

    const savedOrder = await newOrder.save();

    // 2. REAL-TIME FLASH LOGIC (Socket.io)
    // index.js me set kiya gaya 'io' instance yahan fetch karein
    const io = req.app.get('io');
    
    // Sirf us specific dukaan ke "room" me naya order bhejenge
    io.to(shopId).emit('NEW_PRINT_ORDER', savedOrder);

    res.status(201).json({ 
      success: true, 
      message: 'Order placed successfully!',
      order: savedOrder 
    });

  } catch (error) {
    console.error('Order Creation Error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});


// GET: Kisi specific dukaan ke saare 'Pending' orders fetch karna
router.get('/:shopId/pending', async (req, res) => {
  try {
    const { shopId } = req.params;
    
    // Sirf wo orders layenge jo abhi pending hain aur naye pehle aayenge
    const pendingOrders = await Order.find({ 
      shopId: shopId, 
      status: 'Pending' 
    }).sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      orders: pendingOrders 
    });
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// PUT: Print command execute hone ke baad order ka status update karna
router.put('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body; // e.g., 'Completed' ya 'Printing'

    // Order find karke naya status set karna
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId, 
      { status: status },
      { returnDocument: 'after' } // Return updated document
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ 
      success: true, 
      message: `Order marked as ${status}`,
      order: updatedOrder 
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.post('/calculate-price', async (req, res) => {
  const { shopId, pages, isColor, isDoubleSided } = req.body;
  const shop = await Shop.findById(shopId);

  // Shop ki custom pricing nikalna
  let perPageCost = isColor ? shop.pricing.colorSingle : shop.pricing.bwSingle;
  if (isDoubleSided) {
    perPageCost = isColor ? shop.pricing.colorDouble : shop.pricing.bwDouble;
  }

  // Exact 2% calculation
  const baseAmount = pages * perPageCost;
  const gatewayFee = baseAmount * 0.02;
  const finalAmountToPay = baseAmount + gatewayFee;

  res.json({
    baseAmount: baseAmount.toFixed(2),
    gatewayFee: gatewayFee.toFixed(2), // Customer ko transparency dikhane ke liye
    finalAmountToPay: finalAmountToPay.toFixed(2)
  });
});

module.exports = router;
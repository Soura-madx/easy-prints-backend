const express = require('express');
const Shop = require('../models/Shop');
const Order = require('../models/Order');
const router = express.Router();

// 1. Create Order API
router.post('/create', async (req, res) => {
  try {
    const { shopId, customerName, files, payment } = req.body;
    
    // NAYA: Generate 4-digit unique Token Number
    const tokenNumber = Math.floor(1000 + Math.random() * 9000).toString();

    const newOrder = new Order({
      shopId,
      customerName,
      tokenNumber, // Token number save kar rahe hain
      files,
      payment
    });

    const savedOrder = await newOrder.save();

    const io = req.app.get('io');
    io.to(shopId).emit('NEW_PRINT_ORDER', savedOrder);

    res.status(201).json({ 
      success: true, 
      message: 'Order placed successfully!',
      order: savedOrder 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// 2. Fetch Dashboard Orders API (Pending + Recently Completed)
router.get('/:shopId/dashboard-orders', async (req, res) => {
  try {
    const { shopId } = req.params;
    
    // 10 minute pehle ka time nikalein
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Wo orders layein jo ya toh 'Pending' hain, YA pichle 10 min me 'Completed' hue hain
    const dashboardOrders = await Order.find({ 
      shopId: shopId,
      $or: [
        { status: 'Pending' },
        { status: 'Completed', completedAt: { $gte: tenMinutesAgo } }
      ]
    }).sort({ createdAt: -1 });

    res.json({ success: true, orders: dashboardOrders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// 3. Update Status API
router.put('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const updateData = { status: status };
    if (status === 'Completed') {
      updateData.completedAt = new Date(); // Complete hone ka time record karein
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId, 
      updateData,
      { returnDocument: 'after' } 
    );

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});




router.post('/calculate-price', async (req, res) => {
  try {
    const { shopId, pages, copies, color, sides, paperSize } = req.body;
    const shop = await Shop.findById(shopId);

    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    // 1. Dukandaar ki Shop settings se base rate nikalna
    let perPageCost = color === 'Color' ? shop.pricing.colorSingle : shop.pricing.bwSingle;
    if (sides === 'both') {
      perPageCost = color === 'Color' ? shop.pricing.colorDouble : shop.pricing.bwDouble;
    }

    // 2. Paper Size ke hisaab se rate adjust karna
    if (paperSize === 'A3') {
      perPageCost *= 2; // A3 page A4 ka double hota hai
    } else if (paperSize === 'A5') {
      perPageCost *= 0.5; // A5 page A4 ka aadha hota hai
    }

    // 3. Exact Calculation: (Rate × Pages × Copies)
    const totalCopies = copies || 1;
    const baseAmount = pages * perPageCost * totalCopies;
    const gatewayFee = baseAmount * 0.02; // 2% handling fee
    const finalAmountToPay = baseAmount + gatewayFee;

    res.json({
      baseAmount: baseAmount.toFixed(2),
      gatewayFee: gatewayFee.toFixed(2),
      finalAmountToPay: finalAmountToPay.toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate price' });
  }
});

module.exports = router;
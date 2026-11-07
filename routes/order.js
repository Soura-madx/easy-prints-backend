const express = require('express');
const Shop = require('../models/Shop');
const Order = require('../models/Order');
const router = express.Router();


// 1. Create Order API
router.post('/create', async (req, res) => {
  try {
    const { shopId, customerName, files, payment } = req.body;
    
    // Generate 4-digit unique Token Number
    const tokenNumber = Math.floor(1000 + Math.random() * 9000).toString();

    const newOrder = new Order({
      shopId,
      customerName,
      tokenNumber, 
      files,
      payment
    });

    const savedOrder = await newOrder.save();

    // NAYA: Socket.io safety check
    const io = req.app.get('io');
    if (io) {
      io.to(shopId).emit('NEW_PRINT_ORDER', savedOrder);
    } else {
      console.warn("Socket.io object not found on app.");
    }

    res.status(201).json({ 
      success: true, 
      message: 'Order placed successfully!',
      order: savedOrder 
    });
  } catch (error) {
    // NAYA: Asli error terminal me print karega
    console.error("Database Save Error: ", error);
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
      
      // NAYA LOGIC: Jab order complete (print) ho jaye, toh uska payment bhi "Paid" maan lenge (Kyunki cash counter par le liya gaya hoga)
      updateData['payment.paymentStatus'] = 'Paid';
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


// CALCULATE PRICE (PURE BASE AMOUNT - NO FEES AT ALL)
router.post('/calculate-price', async (req, res) => {
  try {
    const { shopId, pages, copies, color, sides, paperSize } = req.body;
    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    let perPageCost = 0;
    const isColor = color === 'Color';
    const isDouble = sides === 'both';
    const shopPricing = shop.pricing;

    if (paperSize !== 'A4' && shopPricing.sizePrices && shopPricing.sizePrices[paperSize]) {
      perPageCost = isColor ? shopPricing.sizePrices[paperSize].color : shopPricing.sizePrices[paperSize].bw;
      if (isDouble) {
        const doubleSideRatio = isColor ? (shopPricing.colorDouble / shopPricing.colorSingle) : (shopPricing.bwDouble / shopPricing.bwSingle);
        perPageCost = perPageCost * doubleSideRatio;
      }
    } else {
      perPageCost = isColor ? shopPricing.colorSingle : shopPricing.bwSingle;
      if (isDouble) perPageCost = isColor ? shopPricing.colorDouble : shopPricing.bwDouble;
    }
    
    if (perPageCost === 0) {
      if (paperSize === 'A3') perPageCost *= 2;
      if (paperSize === 'A5') perPageCost *= 0.5;
    }

    let baseAmount = pages * perPageCost * (copies || 1);

    // Bulk Discounts
    if (shopPricing.bulkDiscounts && shopPricing.bulkDiscounts.length > 0) {
      const applicableTier = shopPricing.bulkDiscounts.find(t => (copies || 1) >= t.minCopies && (copies || 1) <= t.maxCopies);
      if (applicableTier) baseAmount -= (baseAmount * applicableTier.discountPercent) / 100;
    }

    // Koi Handling Fee add nahi hogi. Base Amount hi Final Amount banega.
    res.json({
      baseAmount: baseAmount.toFixed(2),
      gatewayFee: "0.00", 
      finalAmountToPay: baseAmount.toFixed(2) // Same as base amount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate price' });
  }
});



module.exports = router;
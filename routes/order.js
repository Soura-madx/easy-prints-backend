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

    let perPageCost = 0;
    const isColor = color === 'Color';
    const isDouble = sides === 'both';
    const shopPricing = shop.pricing;

    // STEP 1 & 2: Base Rate & Size Overrides
    if (paperSize !== 'A4' && shopPricing.sizePrices && shopPricing.sizePrices[paperSize]) {
      // Agar override mila toh use karo
      perPageCost = isColor ? shopPricing.sizePrices[paperSize].color : shopPricing.sizePrices[paperSize].bw;
      
      // Double side ke liye base A4 ka ratio use karke price set karein (e.g. A4 me double side 1.5x hai, toh A3 me bhi 1.5x hoga)
      if (isDouble) {
        const doubleSideRatio = isColor ? (shopPricing.colorDouble / shopPricing.colorSingle) : (shopPricing.bwDouble / shopPricing.bwSingle);
        perPageCost = perPageCost * doubleSideRatio;
      }
    } else {
      // Base A4 Price
      perPageCost = isColor ? shopPricing.colorSingle : shopPricing.bwSingle;
      if (isDouble) {
        perPageCost = isColor ? shopPricing.colorDouble : shopPricing.bwDouble;
      }
    }

    // Fallback if overrides are missing (Just in case)
    if (perPageCost === 0) {
      if (paperSize === 'A3') perPageCost *= 2;
      if (paperSize === 'A5') perPageCost *= 0.5;
    }

    const totalCopies = copies || 1;
    let baseAmount = pages * perPageCost * totalCopies;

    // STEP 3: Bulk Discount Logic
    let discount = 0;
    if (shopPricing.bulkDiscounts && shopPricing.bulkDiscounts.length > 0) {
      // Dekho ki copies kis tier me aati hain
      const applicableTier = shopPricing.bulkDiscounts.find(
        tier => totalCopies >= tier.minCopies && totalCopies <= tier.maxCopies
      );
      if (applicableTier) {
        discount = (baseAmount * applicableTier.discountPercent) / 100;
      }
    }
    
    const discountedBaseAmount = baseAmount - discount;

    // STEP 4: Extra / Handling Charges
    let handlingFeeAmt = 0;
    if (shopPricing.handlingFee.type === 'Flat') {
      handlingFeeAmt = shopPricing.handlingFee.value;
    } else if (shopPricing.handlingFee.type === 'Percentage') {
      handlingFeeAmt = (discountedBaseAmount * shopPricing.handlingFee.value) / 100;
    }

    const finalAmountToPay = discountedBaseAmount + handlingFeeAmt;

    res.json({
      baseAmount: baseAmount.toFixed(2),
      discountAmount: discount.toFixed(2), // Just for debugging, we won't show it to customer
      handlingFee: handlingFeeAmt.toFixed(2),
      finalAmountToPay: finalAmountToPay.toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate price' });
  }
});



module.exports = router;
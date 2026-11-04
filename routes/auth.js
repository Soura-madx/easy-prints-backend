const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Shop = require('../models/Shop');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { shopName, email, password, pricing } = req.body;

    // 1. Check karein ki email pehle se exist toh nahi karta
    const existingShop = await Shop.findOne({ email });
    if (existingShop) {
      return res.status(400).json({ error: 'Shop with this email already exists!' });
    }

    // 2. Password ko secure (Hash) karna
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Database me naya Shop create karna
    const newShop = new Shop({
      shopName,
      email,
      password: hashedPassword,
      // Agar frontend se pricing na aaye, toh Schema wali default (2 Rs) lag jayegi
      pricing: pricing || undefined 
    });

    const savedShop = await newShop.save();

    res.status(201).json({ 
      success: true, 
      message: 'Shop registered successfully! 🎉',
      shopId: savedShop._id 
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const shop = await Shop.findOne({ email });
    if (!shop) return res.status(400).json({ error: 'Shop not found' });

    const isMatch = await bcrypt.compare(password, shop.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    // JWT token generate karna
    const token = jwt.sign({ shopId: shop._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token,shopId: shop._id, shopName: shop.shopName, pricing: shop.pricing });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const router = express.Router();

// Cloudinary Setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer Storage Configuration (Temporary local storage)
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Cloudinary par file upload karna (resource_type: 'raw' PDF aur Docx ke liye zaroori hai)
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'raw',
      folder: 'easy_prints_documents' 
    });

    // Upload ke baad local server se file delete karna
    fs.unlinkSync(req.file.path);

    // Frontend ko Cloudinary ka secure URL return karna
    res.json({
      success: true,
      fileUrl: result.secure_url,
      fileName: req.file.originalname
    });

  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

module.exports = router;
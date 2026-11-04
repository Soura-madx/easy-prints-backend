const cron = require('node-cron');
const cloudinary = require('cloudinary').v2;
const Order = require('../models/Order');

// Cloudinary delete helper function
const deleteFileFromCloudinary = async (fileUrl) => {
  try {
    if (!fileUrl) return;

    // URL se public_id nikalna (e.g., 'easy_prints_documents/filename')
    const urlParts = fileUrl.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    // Upload aur version (v1234...) ke baad ka hissa public_id hota hai
    const publicIdWithExtension = urlParts.slice(uploadIndex + 2).join('/');
    
    // Extension (.pdf, .png) hatana (agar URL me ho)
    const publicId = publicIdWithExtension.split('.')[0]; 

    // URL me check karna ki file 'raw' hai ya 'image'
    const resourceType = fileUrl.includes('/raw/') ? 'raw' : 'image';

    // Cloudinary se delete command
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });

    console.log(`🗑️ Cloudinary Deletion Status for ${publicId}:`, result.result); // 'ok' aana chahiye
    return result;
  } catch (error) {
    console.error('❌ Error deleting from Cloudinary:', error);
  }
};

cron.schedule('*/10 * * * *', async () => {
  try {
    console.log('🔄 Running 10-min Cron Job for Auto-Deletion...');

    // 10 minute purana time nikalna
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Wo orders dhundho jo 'Completed' hain aur 10 min se purane hain
    const oldOrders = await Order.find({
      status: 'Completed', 
      createdAt: { $lt: tenMinutesAgo }
    });

    for (const order of oldOrders) {
      // 1. Pehle Cloudinary se file udao (Storage bachegi)
      
      // NAYA LOGIC: Multiple files array par loop chalana
      if (order.files && order.files.length > 0) {
        for (const fileItem of order.files) {
          await deleteFileFromCloudinary(fileItem.fileUrl);
        }
      } else if (order.fileUrl) {
        // FALLBACK: Agar database me koi purana single-file wala order bacha ho
        await deleteFileFromCloudinary(order.fileUrl);
      }

      // 2. Phir MongoDB se order delete karo
      await Order.findByIdAndDelete(order._id);
      
      console.log(`✅ Order ${order._id} completely removed from DB & Cloudinary`);
    }

  } catch (error) {
    console.error('❌ Cron Job Error:', error);
  }
});
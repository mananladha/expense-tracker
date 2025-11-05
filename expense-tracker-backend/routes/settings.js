/**
 * User Settings Router
 * Handles fetching and updating user-specific settings.
 */
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const auth = require('../middleware/auth');

// --- Helper for consistent field mapping ---
// This ensures that the fields returned by both GET and PUT are consistent
const mapUserFieldsToSettings = (user) => ({
  name: user.name,
  email: user.reportEmail || '',       // Primary Report Email (frontend: 'email')
  email2: user.reportEmail2 || '',     // Secondary Report Email (frontend: 'email2')
  phone: user.reportMobile || '',      // Report Mobile Number (frontend: 'phone')
  paymentModes: user.customModes || [] // Custom Payment Modes (frontend: 'paymentModes')
});

// ===========================================
// GET /api/settings - Get user settings
// ===========================================
router.get('/', auth, async (req, res) => {
  try {
    // Select all fields except 'password' for security
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Use the helper function to map and send the response
    res.json(mapUserFieldsToSettings(user));
  } catch (error) {
    console.error('Error fetching settings:', error.message); // Log the specific message
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// ===========================================
// PUT /api/settings - Update user settings
// ===========================================
router.put('/', auth, async (req, res) => {
  // Destructure the expected frontend fields
  const { name, email, email2, phone, paymentModes } = req.body;

  try {
    // Find and lock the user document for update
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // --- Update fields based on presence in request body ---
    // Update name
    if (name !== undefined) user.name = name;
    
    // Update report emails (mapping frontend fields to model fields)
    if (email !== undefined) user.reportEmail = email;       // Maps 'email' to 'reportEmail'
    if (email2 !== undefined) user.reportEmail2 = email2;     // Maps 'email2' to 'reportEmail2'
    
    // Update mobile number
    if (phone !== undefined) user.reportMobile = phone;       // Maps 'phone' to 'reportMobile'
    
    // --- Update Custom Payment Modes (Validation and Cleaning) ---
    if (paymentModes !== undefined) {
      if (!Array.isArray(paymentModes)) {
        return res.status(400).json({ message: 'Payment modes must be an array' });
      }

      if (paymentModes.length > 5) {
        return res.status(400).json({ message: 'Maximum 5 custom payment modes allowed' });
      }
      
      // Clean up the input: trim strings, extract 'name' if objects are sent, and filter out empty values.
      const cleanedModes = paymentModes
        .map(mode => {
          // Handles both simple string array and array of objects with a 'name' field
          if (typeof mode === 'object' && mode !== null && mode.name) {
            return String(mode.name).trim();
          }
          return String(mode).trim();
        })
        .filter(mode => mode.length > 0); // Ensure no empty strings are saved

      user.customModes = cleanedModes; // Save to the 'customModes' model field
    }

    await user.save();

    // Use the helper function to ensure a consistent, clean response
    res.json({ 
        message: 'Settings updated successfully',
        settings: { /* ... mapped user fields ... */ } // <-- Notice 'settings' key
    });

  } catch (error) {
    console.error('Error updating settings:', error.message); // Log the specific message

    // Optional: Add specific handling for Mongoose validation errors
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }

    res.status(500).json({ message: 'Error updating settings' });
  }
});

module.exports = router;
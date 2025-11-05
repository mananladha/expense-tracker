const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// GET all transactions for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
});

// POST new transaction
router.post('/', auth, async (req, res) => {
  try {
    const { type, amount, mode, modeName, item, date } = req.body;

    // Validation
    if (!type || !amount || !mode || !modeName || !item || !date) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const transaction = new Transaction({
      user: req.user.id,
      type,
      amount,
      mode,
      modeName,
      item,
      date
    });

    const savedTransaction = await transaction.save();
    res.status(201).json(savedTransaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Error creating transaction', error: error.message });
  }
});

// DELETE transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transaction deleted successfully', transaction });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: 'Error deleting transaction', error: error.message });
  }
});

// GET transactions by date range
router.get('/filter', auth, async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    let query = { user: req.user.id };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    const transactions = await Transaction.find(query).sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error('Error filtering transactions:', error);
    res.status(500).json({ message: 'Error filtering transactions', error: error.message });
  }
});

module.exports = router;
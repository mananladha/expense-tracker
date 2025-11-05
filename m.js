const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize the app
const app = express();
const PORT = process.env.PORT || 3000; // Changed from 5000 to 3000

// --- Database Connection ---
const MONGO_URI = 'mongodb+srv://mananladha_db_user:azV8GjVk0bBTr6na@expense.owqxgkl.mongodb.net/?appName=Expense';

// --- Middleware ---

app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:5501', 'http://127.0.0.1:5501'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'], 
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.path}`);
  next();
});

// --- API Routes ---
app.use('/api/transactions', require('./routes/transactions'));

// Simple base route (for testing)
app.get('/', (req, res) => {
  res.send('Expense Tracker API is running!');
});

// --- Connect to MongoDB and Start Server ---
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully.');
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') }); 

// ... rest of your logging and server code ...
console.log('--- Environment Variables after dotenv load ---');
console.log(process.env); 
console.log('---------------------------------------------');
console.log('EMAIL_USER Check:', process.env.EMAIL_USER ? 'Found' : 'MISSING');
console.log('EMAIL_PASSWORD Check:', process.env.EMAIL_PASSWORD ? 'Found' : 'MISSING');
console.log('---------------------------------------------');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 

const app = express();
const PORT = process.env.PORT || 3000; 
//
// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mananladha_db_user:mDzTZmLGAqTWaMLR@expense.owqxgkl.mongodb.net/?appName=Expense';

// --- Middleware ---
// Request logger
app.use((req, res, next) => {
  console.log(`➡️ Request Received: ${req.method} ${req.originalUrl}`);
  if (req.originalUrl.startsWith('/api/transactions')) {
    console.log('   🚦 Request is for /api/transactions path.');
  }
  if (req.originalUrl.startsWith('/api/reports')) {
    console.log('   📊 Request is for /api/reports path.');
  }
  next();
});
 
// ⭐️ FIXED CORS CONFIGURATION ⭐️
const allowedOrigins = [
    // Local development origins
    'http://localhost:5500', 
    'http://127.0.0.1:5500', 
    'http://localhost:5501', 
    'http://127.0.0.1:5501',
    
    // Live GitHub Pages Subdomain
    'https://expense-tracker.mananladha.in', 
    
    // Render's public URL (to allow the service itself to access its own API if needed)
    process.env.RENDER_EXTERNAL_URL 
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow the origin if it's in our allowed list
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
            console.error('CORS Blocked:', msg);
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Enable JSON parsing
app.use(express.json());

// --- API Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/reports', require('./routes/reports')); // New reports route
app.use('/api/settings', require('./routes/settings'));

// Simple base route
app.get('/', (req, res) => {
    res.send('Expense Tracker API is running!');
});

// --- Connect to DB and Start Server ---
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected successfully.');
        
        // Start automatic report scheduler
        try {
            const { startScheduler } = require('./services/scheduler');
            startScheduler();
            console.log('⏰ Report scheduler started successfully');
        } catch (error) {
            console.warn('⚠️ Scheduler not started (check if services/scheduler.js exists):', error.message);
        }
        
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
            console.log(`📊 Reports API available at http://localhost:${PORT}/api/reports`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });
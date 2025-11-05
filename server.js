const path = require('path'); // Import the 'path' module (built-in to Node.js)
require('dotenv').config({ path: path.resolve(__dirname, '.env') }); // Explicitly point to .env in the current directory

// ... rest of your logging and server code ...
//✅ CHANGE THE LOGGING TO THIS:
console.log('--- Environment Variables after dotenv load ---');
console.log(process.env); // Print the whole object
console.log('---------------------------------------------');
console.log('EMAIL_USER Check:', process.env.EMAIL_USER ? 'Found' : 'MISSING'); // Keep this check too
console.log('EMAIL_PASSWORD Check:', process.env.EMAIL_PASSWORD ? 'Found' : 'MISSING');
console.log('---------------------------------------------');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3000; 

// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mananladha_db_user:iT3Vk0IVEfDjeRVn@expense.owqxgkl.mongodb.net/?appName=Expense';

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
 
// Enable CORS
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:5501', 'http://127.0.0.1:5501'],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS','PUT'],
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
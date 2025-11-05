const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Helper for basic email format validation
const emailValidator = {
    validator: function(v) {
        // Allow empty string/null, otherwise validate format
        if (v === '' || v === null) return true; 
        // Simple regex for email format
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g.test(v);
    },
    message: props => `${props.value} is not a valid email address format.`
};

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },

    // ⭐️ ENHANCED: Report Email 1 (with format validation) ⭐️
    reportEmail: {
        type: String,
        trim: true,
        default: '',
        validate: emailValidator 
    },
    // ⭐️ ENHANCED: Report Email 2 (with format validation) ⭐️
    reportEmail2: {
        type: String,
        trim: true,
        default: '',
        validate: emailValidator
    },
    // Report Mobile Number
    reportMobile: {
        type: String,
        trim: true,
        default: ''
    },
    // ⭐️ ENHANCED: Custom Payment Modes (with array length and string length validation) ⭐️
    customModes: {
        type: [String], // Array of Strings
        default: ['ICICI', 'BOB'],
        validate: [
            {
                // Validator 1: Checks array size
                validator: (arr) => arr.length <= 5,
                message: 'Custom payment modes cannot exceed 5 items.'
            },
            {
                // Validator 2: Checks max string length for each mode name
                validator: (arr) => arr.every(mode => mode.length <= 50),
                message: 'Each custom payment mode name cannot exceed 50 characters.'
            }
        ]
    }
}, {
    timestamps: true,
});

// This is a "pre-save hook"
// It automatically hashes the password *before* it saves a new user
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Check if the model already exists before compiling it 
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
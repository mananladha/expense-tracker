const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_super_secret_key_12345'; // ⭐️ Must be the SAME secret as in auth.js

module.exports = function (req, res, next) {
    // 1. Get token from header
    const token = req.header('authorization');

    // 2. Check if no token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // 3. Check if token is valid
    try {
        // It's in the format "Bearer <token>"
        const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);
        
        // 4. Add user from payload to the request object
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
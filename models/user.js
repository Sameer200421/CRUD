const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    isVerified: {
        type: Boolean,
        default: false, // Indicates whether the user has completed OTP verification
    },
    otp: {
        code: { type: String }, // Stores the OTP code
        expiresAt: { type: Date }, // Expiry time for the OTP
    },
}, { timestamps: true });

// Pre-save middleware to hash passwords
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to validate password
userSchema.methods.isValidPassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
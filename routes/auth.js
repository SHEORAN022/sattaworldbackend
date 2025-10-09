// require('dotenv').config();
// const express = require('express');
// const jwt = require('jsonwebtoken');
// const sgMail = require('@sendgrid/mail');
// const User = require('../models/User');
// const Transaction = require('../models/Transaction');

// const router = express.Router();

// // ------------------- OTP Stores -------------------
// const otpStore = {};      // Registration OTPs
// const otpLoginStore = {}; // Login OTPs

// // ------------------- SendGrid Config -------------------
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// // ------------------- Helper: Generate Username -------------------
// const generateRandomUsername = async () => {
//   const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
//   let username, exists = true;

//   while (exists) {
//     username = 'user_' + Array.from({ length: 6 }, () =>
//       chars[Math.floor(Math.random() * chars.length)]
//     ).join('');
//     exists = await User.exists({ username });
//   }
//   return username;
// };

// // ------------------- Helper: Send Email -------------------
// const sendEmail = async (to, subject, text) => {
//   try {
//     const msg = {
//       to,
//       from: process.env.EMAIL_FROM, // Verified sender
//       subject,
//       text,
//     };
//     await sgMail.send(msg);
//     console.log(`📧 Email sent to ${to}`);
//     return true;
//   } catch (err) {
//     console.error('❌ EMAIL ERROR:', err.response?.body || err.message);
//     throw new Error('Email sending failed');
//   }
// };

// // ------------------- TEST ROUTE -------------------
// router.get('/test-email', async (req, res) => {
//   try {
//     await sendEmail(process.env.EMAIL_FROM, '✅ Test Email', 'This is a test email from your server.');
//     res.send('✅ Test email sent successfully! Check your inbox.');
//   } catch (err) {
//     res.status(500).send('❌ Failed to send email: ' + err.message);
//   }
// });

// // ------------------- Register: Request OTP -------------------
// router.post('/register/request-otp', async (req, res) => {
//   try {
//     const { email } = req.body;
//     if (!email) return res.status(400).json({ message: 'Email is required' });
//     if (await User.exists({ email })) return res.status(400).json({ message: 'User already exists' });

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     otpStore[email] = { otp, expiry: Date.now() + 10 * 60 * 1000 }; // 10 min

//     await sendEmail(email, 'Your OTP for Registration', `Your OTP is ${otp}. Valid for 10 minutes.`);
//     res.status(200).json({ message: 'OTP sent to email' });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: 'Server error', error: e.message });
//   }
// });

// // ------------------- Register: Verify OTP -------------------
// router.post('/register/verify-otp', async (req, res) => {
//   try {
//     const { email, otp, referralCode } = req.body;
//     if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

//     const savedOTP = otpStore[email];
//     if (!savedOTP) return res.status(400).json({ message: 'No OTP found. Request again.' });
//     if (savedOTP.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
//     if (savedOTP.expiry < Date.now()) {
//       delete otpStore[email];
//       return res.status(400).json({ message: 'OTP expired' });
//     }

//     let referredBy = null;
//     if (referralCode) referredBy = await User.findOne({ referralCode }) || null;

//     const username = await generateRandomUsername();
//     const user = new User({ email, username, referredBy: referredBy?._id });
//     await user.save();

//     // Referral bonus logic
//     if (referredBy) {
//       const bonus = Math.floor(referredBy.wallet.totalDeposits * 0.05);
//       if (bonus > 0) {
//         referredBy.wallet.balance += bonus;
//         referredBy.referralEarnings += bonus;
//         await referredBy.save();

//         const referralTxn = new Transaction({
//           user: referredBy._id,
//           type: 'referral',
//           amount: bonus,
//           paymentMethod: 'wallet',
//           description: `5% referral bonus for ${user.username || user.email}`,
//           status: 'completed',
//           processedAt: new Date()
//         });
//         await referralTxn.save();
//       }
//     }

//     const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'Apple', { expiresIn: '7d' });
//     delete otpStore[email];

//     res.status(201).json({
//       message: 'User registered',
//       token,
//       user: {
//         id: user._id,
//         email: user.email,
//         username: user.username,
//         wallet: user.wallet,
//         isAdmin: user.isAdmin
//       }
//     });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: 'Server error', error: e.message });
//   }
// });

// // ------------------- Login: Request OTP -------------------
// router.post('/login/request-otp', async (req, res) => {
//   try {
//     const { email } = req.body;
//     if (!email) return res.status(400).json({ message: 'Email is required' });

//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ message: 'No user found with this email' });

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     otpLoginStore[email] = { otp, expiry: Date.now() + 10 * 60 * 1000 };

//     await sendEmail(email, 'Your OTP for Login', `Your OTP is ${otp}. Valid for 10 minutes.`);
//     res.status(200).json({ message: 'OTP sent to email' });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: 'Server error', error: e.message });
//   }
// });

// // ------------------- Login: Verify OTP -------------------
// router.post('/login/verify-otp', async (req, res) => {
//   try {
//     const { email, otp } = req.body;
//     if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

//     const savedOTP = otpLoginStore[email];
//     if (!savedOTP) return res.status(400).json({ message: 'No OTP found. Request again.' });
//     if (savedOTP.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
//     if (savedOTP.expiry < Date.now()) {
//       delete otpLoginStore[email];
//       return res.status(400).json({ message: 'OTP expired' });
//     }

//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ message: 'No user found' });

//     const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'Apple', { expiresIn: '7d' });
//     delete otpLoginStore[email];

//     res.status(200).json({
//       message: 'Login successful',
//       token,
//       user: {
//         id: user._id,
//         email: user.email,
//         wallet: user.wallet,
//         isAdmin: user.isAdmin
//       }
//     });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: 'Server error', error: e.message });
//   }
// });

// module.exports = router;
const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

// ------------------- OTP Stores -------------------
const otpStore = {};      // Registration OTPs
const otpLoginStore = {}; // Login OTPs

// ------------------- Nodemailer Transport -------------------
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ------------------- Helper: Send OTP Email -------------------
const sendOtpEmail = async (to, subject, otp) => {
  const mailOptions = {
    from: `"No-Reply" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    text: `Your OTP is ${otp}. Valid for 10 minutes.`,
  };
  await transporter.sendMail(mailOptions);
};

// ------------------- Generate Random Username -------------------
const generateRandomUsername = async () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let username, exists = true;
  while (exists) {
    username = 'user_' + Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    exists = await User.exists({ username });
  }
  return username;
};

// ------------------- Test Email Route -------------------
router.get('/test-email', async (req, res) => {
  try {
    await sendOtpEmail(process.env.EMAIL_FROM, 'Test Email', 'This is a test email from your server.');
    res.send('✅ Test email sent successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Failed to send email: ' + err.message);
  }
});

// ------------------- Register: Request OTP -------------------
router.post('/register/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (await User.exists({ email })) return res.status(400).json({ message: 'User already exists' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expiry: Date.now() + 10 * 60 * 1000 }; // 10 min

    await sendOtpEmail(email, 'Your OTP for Registration', otp);
    res.status(200).json({ message: 'OTP sent to email' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// ------------------- Register: Verify OTP -------------------
router.post('/register/verify-otp', async (req, res) => {
  try {
    const { email, otp, referralCode } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

    const savedOTP = otpStore[email];
    if (!savedOTP) return res.status(400).json({ message: 'No OTP found. Request again.' });
    if (savedOTP.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (savedOTP.expiry < Date.now()) {
      delete otpStore[email];
      return res.status(400).json({ message: 'OTP expired' });
    }

    let referredBy = null;
    if (referralCode) referredBy = await User.findOne({ referralCode }) || null;

    const username = await generateRandomUsername();
    const user = new User({ email, username, referredBy: referredBy?._id });
    await user.save();

    // Referral bonus logic
    if (referredBy) {
      const bonus = Math.floor(referredBy.wallet.totalDeposits * 0.05);
      if (bonus > 0) {
        referredBy.wallet.balance += bonus;
        referredBy.referralEarnings += bonus;
        await referredBy.save();

        const referralTxn = new Transaction({
          user: referredBy._id,
          type: 'referral',
          amount: bonus,
          paymentMethod: 'wallet',
          description: `5% referral bonus for ${user.username || user.email}`,
          status: 'completed',
          processedAt: new Date()
        });
        await referralTxn.save();
      }
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'Apple', { expiresIn: '7d' });
    delete otpStore[email];

    res.status(201).json({
      message: 'User registered',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        wallet: user.wallet,
        isAdmin: user.isAdmin
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// ------------------- Login: Request OTP -------------------
router.post('/login/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'No user found with this email' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpLoginStore[email] = { otp, expiry: Date.now() + 10 * 60 * 1000 };

    await sendOtpEmail(email, 'Your OTP for Login', otp);
    res.status(200).json({ message: 'OTP sent to email' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// ------------------- Login: Verify OTP -------------------
router.post('/login/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

    const savedOTP = otpLoginStore[email];
    if (!savedOTP) return res.status(400).json({ message: 'No OTP found. Request again.' });
    if (savedOTP.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (savedOTP.expiry < Date.now()) {
      delete otpLoginStore[email];
      return res.status(400).json({ message: 'OTP expired' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'No user found' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'Apple', { expiresIn: '7d' });
    delete otpLoginStore[email];

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        wallet: user.wallet,
        isAdmin: user.isAdmin
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

module.exports = router;

const Scholar = require("../models/scholarSchema");
const { signToken, cookieOptions , COOKIE_NAME} = require("../config/jwt");
require("dotenv").config();

const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");

// Send OTP via email
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_PROVIDER,
  auth: {
    user: process.env.EMAIL_USER, // Replace with your email
    pass: process.env.EMAIL_PASS, // Replace with your email password
  },
});

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log("register api called", req.body);

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "name, email, and password are required" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    const existing = await Scholar.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists" });
    }

    const user = await Scholar.create({ name, email, password });
    const token = signToken({ id: user._id, email: user.email });

    res.cookie(COOKIE_NAME, token, cookieOptions);
    return res.status(201).json({ user, token });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Registration failed", details: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // console.log("login called", req.body);

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await Scholar.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken({ id: user._id, email: user.email });
    res.cookie(COOKIE_NAME, token, cookieOptions);

    // toJSON transform strips the password automatically
    return res.status(200).json({ user, token });
  } catch (err) {
    console.log("error", err.message);
    return res
      .status(500)
      .json({ error: "Login failed", details: err.message });
  }
};

const logout = (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: 0 });
  return res.status(200).json({ message: "Logged out" });
};

const sendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await Scholar.findOne({ email: { $eq: email } });

    if (!user) {
      return res.status(404).json({ message: "User not found !" });
    }

    // Generate a 6-digit OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // OTP expires in 15 minutes

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_PROVIDER,
      auth: {
        user: process.env.EMAIL_USER, // Replace with your email
        pass: process.env.EMAIL_PASS, // Replace with your email password
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_PROVIDER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is ${otp}. It is valid for 15 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const resetPassword = async (req, res) => {
  const { email, newPassword, otp } = req.body;
  try {
    const user = await Scholar.findOne({ email: { $eq: email } }).select("+otp +otpExpiresAt");;

    if (!user) {
      return res.status(404).json({ message: "user not found !" });
    }

    if (!email || !newPassword || !otp) {
      return res
        .status(401)
        .json({ message: "email, new-password and otp required !" });
    }

    if (user.otp !== otp || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: "invalid or expired otp" });
    }

    user.password = newPassword;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();
    res.status(200).json({ message: "password resseted successfully !" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const me = async (req, res) => {
  const user = await Scholar.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.status(200).json({ user });
};

module.exports = { register, login, logout, sendOTP, resetPassword, me };

// Called after Passport's Google strategy succeeds (req.user is set by done(null, user))
const googleCallback = (req, res) => {
  const user = req.user;
  const token = signToken({ id: user._id, email: user.email });

  // res.cookie(COOKIE_NAME, token, cookieOptions);
  res.redirect(process.env.CLIENT_ORIGIN || "http://localhost:5173");
};

module.exports.googleCallback = googleCallback;

const githubCallback = (user) => {
  return signToken({ id: user._id, email: user.email });
  const token = signToken({ id: user._id, email: user.email });

  // console.log("token", token);

  // res.cookie(COOKIE_NAME, token, cookieOptions);
  // res.redirect(process.env.CLIENT_ORIGIN || "http://localhost:5173");
};

module.exports.githubCallback = githubCallback;

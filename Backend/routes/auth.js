import express from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import nodemailer from "nodemailer";
import User from "../models/User.js";

const router = express.Router();
const pendingUsers = new Map();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });


router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required." });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already in use." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    pendingUsers.set(email, { name, hashedPassword, otp, expiresAt });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"Sahara" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your verification code",
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:30px">
          <h2 style="color:#3B5BFF">Verify your email</h2>
          <p>Hi <strong>${name}</strong>, here is your 6-digit code:</p>
          <div style="font-size:40px;font-weight:bold;letter-spacing:10px;color:#3B5BFF;margin:24px 0">
            ${otp}
          </div>
          <p style="color:#888;font-size:13px">Expires in 10 minutes. Do not share this code.</p>
        </div>
      `,
    });

    console.log(`📧 OTP for ${email}: ${otp}`);
    res.status(200).json({ message: "Verification code sent to your email." });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: err.message });
  }
});


router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required." });

    const pending = pendingUsers.get(email);

    if (!pending)
      return res.status(400).json({ message: "No pending signup found. Please sign up again." });

    if (Date.now() > pending.expiresAt) {
      pendingUsers.delete(email);
      return res.status(400).json({ message: "Code expired. Please sign up again." });
    }

    if (pending.otp !== otp)
      return res.status(400).json({ message: "Incorrect code. Try again." });

    const user = new User({
      name: pending.name,
      email,
      password: pending.hashedPassword,
    });
    await user.save();
    pendingUsers.delete(email);

    console.log(`User saved to MongoDB: ${email}`);
    res.status(201).json({ message: "User registered successfully!", user });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword)
      return res.status(400).json({ success: false, message: "Email and new password are required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User with this email does not exist" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Please fill all fields." });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "User not found." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect password." });

    res.status(200).json({
      message: "Login successful!",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.put("/update-profile/:id", async (req, res) => {
  try {
    const { name, phone, profileImage } = req.body;
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (profileImage !== undefined) user.profileImage = profileImage;
    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, profileImage: user.profileImage },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/upload-profile", upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded" });

    const imageUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ imageUrl, message: "Profile image uploaded successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to upload profile image" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "No account found with this email." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    pendingUsers.set(`reset_${email}`, { otp, expiresAt });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"Sahara" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Code",
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:30px">
          <h2 style="color:#3B5BFF">Reset your password</h2>
          <p>Here is your 6-digit reset code:</p>
          <div style="font-size:40px;font-weight:bold;letter-spacing:10px;color:#3B5BFF;margin:24px 0">
            ${otp}
          </div>
          <p style="color:#888;font-size:13px">Expires in 10 minutes. Do not share this code.</p>
        </div>
      `,
    });

    console.log(`Reset OTP for ${email}: ${otp}`);
    res.status(200).json({ message: "Reset code sent to your email." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: err.message });
  }
});


router.post("/verify-reset-otp", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "All fields are required." });

    const pending = pendingUsers.get(`reset_${email}`);

    if (!pending)
      return res.status(400).json({ message: "No reset request found. Please try again." });

    if (Date.now() > pending.expiresAt) {
      pendingUsers.delete(`reset_${email}`);
      return res.status(400).json({ message: "Code expired. Please try again." });
    }

    if (pending.otp !== otp)
      return res.status(400).json({ message: "Incorrect code. Try again." });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found." });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    pendingUsers.delete(`reset_${email}`);

    console.log(`Password reset for: ${email}`);
    res.status(200).json({ success: true, message: "Password reset successfully." });
  } catch (err) {
    console.error("Verify reset OTP error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
const express = require("express");
const bcrypt = require("bcryptjs");
const path = require("path");
const User = require("../models/User");
const { ensureGuest } = require("../middleware/auth");

const router = express.Router();
const PAGES_DIR = path.join(__dirname, "..", "pages");

router.get("/login", ensureGuest, (req, res) => {
  res.sendFile(path.join(PAGES_DIR, "login.html"));
});

router.get("/register", ensureGuest, (req, res) => {
  res.sendFile(path.join(PAGES_DIR, "register.html"));
});

router.post("/register", ensureGuest, async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword) {
    req.session.message = { type: "error", text: "All fields are required." };
    return res.redirect("/register");
  }

  if (password !== confirmPassword) {
    req.session.message = { type: "error", text: "Passwords do not match." };
    return res.redirect("/register");
  }

  if (password.length < 6) {
    req.session.message = { type: "error", text: "Password must be at least 6 characters." };
    return res.redirect("/register");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    req.session.message = { type: "error", text: "Email already registered." };
    return res.redirect("/register");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email,
    passwordHash,
  });

  req.session.userId = user._id.toString();
  req.session.userName = user.name;
  req.session.message = { type: "success", text: "Welcome! Account created." };

  return res.redirect("/");
});

router.post("/login", ensureGuest, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.session.message = { type: "error", text: "Email and password are required." };
    return res.redirect("/login");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    req.session.message = { type: "error", text: "Invalid credentials." };
    return res.redirect("/login");
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    req.session.message = { type: "error", text: "Invalid credentials." };
    return res.redirect("/login");
  }

  req.session.userId = user._id.toString();
  req.session.userName = user.name;
  req.session.message = { type: "success", text: "Logged in successfully." };

  return res.redirect("/");
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;

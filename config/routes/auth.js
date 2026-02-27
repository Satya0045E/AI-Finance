const express = require("express");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

// In-memory demo database (since MongoDB might not be available)
const demoDatabase = {};

// Initialize with demo user - generate hash at runtime to ensure it's correct
const demoPassword = bcryptjs.hashSync("password", 10);
demoDatabase["demo@example.com"] = {
  id: "demo123",
  name: "Demo User",
  email: "demo@example.com",
  password: demoPassword
};

// Register
router.post("/register", (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log("Register request:", { name, email });

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Please provide name, email and password" });
    }

    // Check if user exists
    if (demoDatabase[email]) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password synchronously for demo
    const hashedPassword = bcryptjs.hashSync(password, 10);

    // Create user
    const userId = "user_" + Date.now();
    demoDatabase[email] = {
      id: userId,
      name,
      email,
      password: hashedPassword,
    };

    console.log("User created:", userId);

    // Create JWT
    const jwtSecret = process.env.JWT_SECRET || "your_jwt_secret_key_change_this_in_production";
    const token = jwt.sign({ userId }, jwtSecret, {
      expiresIn: "7d",
    });

    console.log("Token generated for:", email);

    return res.status(200).json({
      token,
      user: { id: userId, name, email },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Registration failed: " + error.message });
  }
});

// Login
router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt:", email);

    // Validate
    if (!email || !password) {
      return res.status(400).json({ error: "Please provide email and password" });
    }

    // Check user exists
    const user = demoDatabase[email];
    if (!user) {
      console.log("User not found:", email);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Check password
    const isMatch = bcryptjs.compareSync(password, user.password);
    if (!isMatch) {
      console.log("Password mismatch for:", email);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    console.log("Login successful for:", email);

    // Create JWT
    const jwtSecret = process.env.JWT_SECRET || "your_jwt_secret_key_change_this_in_production";
    const token = jwt.sign({ userId: user.id }, jwtSecret, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed: " + error.message });
  }
});

module.exports = router;

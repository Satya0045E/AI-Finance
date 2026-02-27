#!/usr/bin/env node
require("dotenv").config();
const app = require("./config/routes/server");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 AI Finance Platform Started        ║
║  📍 http://localhost:${PORT}           ║
╚════════════════════════════════════════╝
  `);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

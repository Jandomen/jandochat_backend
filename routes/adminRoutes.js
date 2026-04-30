const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authenticateAdmin } = require("../middlewares/adminAuth");

// Access - No auth needed for entry point
router.post("/login", adminController.loginAdmin);

// Dashboard - Total control requires Admin Token
router.get("/metrics", authenticateAdmin, adminController.getAdminMetrics);

// Moderation & Audit
router.get("/search", authenticateAdmin, adminController.searchById);
router.post("/user/:id/suspend", authenticateAdmin, adminController.suspendUser);
router.delete("/user/:id", authenticateAdmin, adminController.deleteUser);
router.get("/reports", authenticateAdmin, adminController.getReports);
router.put("/report/:id", authenticateAdmin, adminController.handleReport);

// Ads & Global Announcements
router.get("/ads", authenticateAdmin, adminController.getAllAds);
router.post("/ads", authenticateAdmin, adminController.createAd);
router.put("/ads/:id", authenticateAdmin, adminController.toggleAdStatus);
router.patch("/ads/:id", authenticateAdmin, adminController.updateAd);
router.delete("/ads/:id", authenticateAdmin, adminController.deleteAd);

// Single Post Audit
router.delete("/posts/:id", authenticateAdmin, adminController.deletePostAdmin);

module.exports = router;

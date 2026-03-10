const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth");
const { getRecentStatuses, createStatus, deleteStatus, vistoPor, getVistas } = require("../controllers/statusController");

router.get("/", authenticate, getRecentStatuses);
router.post("/", authenticate, createStatus);
router.delete("/:id", authenticate, deleteStatus);
router.post("/:id/visto", authenticate, vistoPor);
router.get("/:id/vistas", authenticate, getVistas);

module.exports = router;

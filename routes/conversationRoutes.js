const express = require("express");
const router = express.Router();
const {
  crearConversacion,
  obtenerConversaciones,
  agregarParticipante,
  eliminarConversacion,
  obtenerConversacionPorId
} = require("../controllers/conversationController");
const { authenticate } = require("../middlewares/auth");
const checkSuspension = require("../middlewares/checkSuspension");

router.post("/", authenticate, checkSuspension, crearConversacion);
router.get("/", authenticate, obtenerConversaciones);

router.put("/:id/participantes", authenticate, checkSuspension, agregarParticipante);

router.delete("/:id", authenticate, checkSuspension, eliminarConversacion);
router.get("/:id", authenticate, obtenerConversacionPorId);

module.exports = router;

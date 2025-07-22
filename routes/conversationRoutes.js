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

router.post("/", authenticate, crearConversacion);
router.get("/", authenticate, obtenerConversaciones);

router.put("/:id/participantes", authenticate,  agregarParticipante);

router.delete("/:id", authenticate,  eliminarConversacion);
router.get("/:id", authenticate,  obtenerConversacionPorId);

module.exports = router;

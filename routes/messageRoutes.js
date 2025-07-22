const express = require("express");
const router = express.Router();
const {crearMensaje, obtenerMensajes, editarMensaje, eliminarMensaje } = require("../controllers/messageController");
const {authenticate} = require("../middlewares/auth");


router.post("/create", authenticate,  crearMensaje);
router.get("/conversacion/:id", authenticate,  obtenerMensajes);
router.put("/:id", authenticate,  editarMensaje);
router.delete("/:id", authenticate,  eliminarMensaje );

module.exports = router;

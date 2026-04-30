const express = require("express");
const router = express.Router();
const {crearMensaje, obtenerMensajes, editarMensaje, eliminarMensaje } = require("../controllers/messageController");
const {authenticate} = require("../middlewares/auth");
const checkSuspension = require("../middlewares/checkSuspension");


const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/create", authenticate, checkSuspension, upload.array("media", 5), crearMensaje);
router.get("/conversacion/:id", authenticate,  obtenerMensajes);
router.put("/:id", authenticate, checkSuspension, editarMensaje);
router.delete("/:id", authenticate, checkSuspension, eliminarMensaje );

module.exports = router;

const express = require("express");
const router = express.Router();
const {crearNotificacion, obtenerNotificaciones, marcarComoLeida, eliminarNotificacion, marcarTodasLeidas, eliminarTodas} = require("../controllers/notificationController");
const {authenticate} = require("../middlewares/auth");


router.post("/", authenticate, crearNotificacion );
router.get("/", authenticate, obtenerNotificaciones );
router.put("/:id/leido", authenticate,  marcarComoLeida );
router.delete("/:id", authenticate,  eliminarNotificacion );
router.put("/leidas", authenticate, marcarTodasLeidas);
router.delete("/", authenticate, eliminarTodas);


module.exports = router;

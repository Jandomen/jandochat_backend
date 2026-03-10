const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  getProfile, updateUser, deleteUser, buscarUsuarios, userSearch, getUsers, getUserById,
  uploadPhoto, deletePhoto, uploadCoverPhoto, deleteCoverPhoto, bloquearUsuario, desbloquearUsuario, obtenerUsuariosBloqueados,
  seguirUsuario, dejarDeSeguirUsuario, obtenerSeguidores, obtenerSiguiendo, getUsuariosAleatorios,
  actualizarPerfil
} = require("../controllers/userController");
const { authenticate } = require("../middlewares/auth");

const upload = multer({ dest: "uploads/" });

router.get("/me", authenticate, getProfile);
router.put("/me", authenticate, updateUser);
router.delete("/me", authenticate, deleteUser);

router.get("/", authenticate, buscarUsuarios);
router.get('/buscar', authenticate, userSearch);

router.get("/users", authenticate, getUsers);

router.get("/usuarios/:id", authenticate, getUserById);
router.get("/aleatorios", authenticate, getUsuariosAleatorios);

router.put("/profile", authenticate, actualizarPerfil);


router.put("/me/photo", authenticate, upload.single("fotoPerfil"), uploadPhoto);
router.delete("/me/photo", authenticate, deletePhoto);

router.put("/me/cover", authenticate, upload.single("fotoPortada"), uploadCoverPhoto);
router.delete("/me/cover", authenticate, deleteCoverPhoto);

router.post("/:id/bloquear", authenticate, bloquearUsuario);
router.post("/:id/desbloquear", authenticate, desbloquearUsuario);
router.get("/bloqueados", authenticate, obtenerUsuariosBloqueados);

router.put("/:id/seguir", authenticate, seguirUsuario);
router.put("/:id/dejar-de-seguir", authenticate, dejarDeSeguirUsuario);
router.get("/seguidores", authenticate, obtenerSeguidores);
router.get("/siguiendo", authenticate, obtenerSiguiendo);

module.exports = router;

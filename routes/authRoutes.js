const express = require("express");
const router = express.Router();
const { registrarUsuario, loginUsuario} = require("../controllers/authController");
const validateEmailDomain = require("../middlewares/validateEmailDomain");
const loginLimiter = require("../middlewares/loginLimiter");
const validateRegister = require("../middlewares/validateRegister");

router.post("/registro", validateRegister,  validateEmailDomain, registrarUsuario );
router.post("/login", loginLimiter, loginUsuario );

module.exports = router;

const { body, validationResult } = require("express-validator");

const validateRegister = [
  body("email")
    .isEmail()
    .withMessage("El email no es válido")
    .customSanitizer(value => value.replace(/\s+/g, ''))
    .trim(),  

  body("nombre")
    .trim() 
    .isLength({ min: 3 })
    .withMessage("El nombre de usuario debe tener al menos 3 caracteres")
    .escape(), 

  body("password")
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener al menos 8 caracteres"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = validateRegister;

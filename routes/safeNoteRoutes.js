const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth");
const {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  togglePin,
} = require("../controllers/safeNoteController");

router.use(authenticate);

router.get("/", getNotes);
router.get("/:id", getNote);
router.post("/", createNote);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);
router.patch("/:id/pin", togglePin);

module.exports = router;

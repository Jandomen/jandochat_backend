const SafeNote = require("../models/SafeNote");

exports.getNotes = async (req, res) => {
  try {
    const notes = await SafeNote.find({ usuario: req.user._id })
      .sort({ pinned: -1, updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener notas" });
  }
};

exports.getNote = async (req, res) => {
  try {
    const note = await SafeNote.findOne({ _id: req.params.id, usuario: req.user._id });
    if (!note) return res.status(404).json({ message: "Nota no encontrada" });
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener la nota" });
  }
};

exports.createNote = async (req, res) => {
  try {
    const { titulo, contenido, tipo, campos, tags, pinned } = req.body;
    const note = new SafeNote({
      usuario: req.user._id,
      titulo,
      contenido,
      tipo: tipo || "nota",
      campos: campos || {},
      tags: tags || [],
      pinned: pinned || false,
    });
    await note.save();
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: "Error al crear nota" });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { titulo, contenido, tipo, campos, tags, pinned } = req.body;
    const note = await SafeNote.findOneAndUpdate(
      { _id: req.params.id, usuario: req.user._id },
      { titulo, contenido, tipo, campos, tags, pinned },
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ message: "Nota no encontrada" });
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar nota" });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const note = await SafeNote.findOneAndDelete({ _id: req.params.id, usuario: req.user._id });
    if (!note) return res.status(404).json({ message: "Nota no encontrada" });
    res.json({ message: "Nota eliminada" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar nota" });
  }
};

exports.togglePin = async (req, res) => {
  try {
    const note = await SafeNote.findOne({ _id: req.params.id, usuario: req.user._id });
    if (!note) return res.status(404).json({ message: "Nota no encontrada" });
    note.pinned = !note.pinned;
    await note.save();
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: "Error al cambiar pin" });
  }
};

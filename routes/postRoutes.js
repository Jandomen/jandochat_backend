const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth");
const { createPost, getFeed, reaccionarPost, comentarPost, responderComentario, getPostsByUser, deletePost, editPost, compartirPost, editarComentario, eliminarComentario, getPostById } = require("../controllers/postController");

router.get("/feed", authenticate, getFeed);
router.get("/usuario/:id", authenticate, getPostsByUser);
router.post("/", authenticate, createPost);
router.get("/:id", authenticate, getPostById);
router.put("/:id", authenticate, editPost);
router.delete("/:id", authenticate, deletePost);
router.post("/:id/compartir", authenticate, compartirPost);
router.post("/:id/reaccionar", authenticate, reaccionarPost);
router.post("/:id/comentar", authenticate, comentarPost);
router.put("/:postId/comentario/:comentarioId", authenticate, editarComentario);
router.delete("/:postId/comentario/:comentarioId", authenticate, eliminarComentario);
router.post("/:id/comentario/:comentarioId/responder", authenticate, responderComentario);
router.delete("/todas/mias", authenticate, require("../controllers/postController").deleteAllUserPosts);

module.exports = router;

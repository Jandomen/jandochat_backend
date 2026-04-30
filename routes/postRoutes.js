const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth");
const checkSuspension = require("../middlewares/checkSuspension");
const {
    createPost, getFeed, reaccionarPost, comentarPost, responderComentario,
    getPostsByUser, deletePost, editPost, compartirPost, editarComentario,
    eliminarComentario, getPostById, bookmarkPost, getBookmarkedPosts,
    getVideos, getPhotos, updatePostSettings, incrementVistas, reportPost, getPostsByMention
} = require("../controllers/postController");

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/feed", authenticate, getFeed);
router.get("/videos", authenticate, getVideos);
router.get("/gallery", authenticate, getPhotos);
router.get("/baul", authenticate, getBookmarkedPosts);
router.get("/usuario/:id", authenticate, getPostsByUser);
router.get("/mentions/:id", authenticate, getPostsByMention);
router.post("/", authenticate, checkSuspension, upload.array("media", 10), createPost);
router.get("/:id", authenticate, getPostById);
router.put("/:id", authenticate, checkSuspension, editPost);
router.put("/:id/settings", authenticate, checkSuspension, updatePostSettings);
router.delete("/:id", authenticate, checkSuspension, deletePost);
router.post("/:id/compartir", authenticate, checkSuspension, compartirPost);
router.post("/:id/reaccionar", authenticate, checkSuspension, reaccionarPost);
router.post("/:id/guardar", authenticate, bookmarkPost);
router.post("/:id/comentar", authenticate, checkSuspension, upload.array("media", 5), comentarPost);
router.put("/:postId/comentario/:comentarioId", authenticate, checkSuspension, editarComentario);
router.delete("/:postId/comentario/:comentarioId", authenticate, checkSuspension, eliminarComentario);
router.post("/:id/comentario/:comentarioId/responder", authenticate, checkSuspension, upload.array("media", 5), responderComentario);
router.post("/:id/view", authenticate, incrementVistas);
router.post("/:id/report", authenticate, reportPost);
router.post("/ads/:id/click", authenticate, require("../controllers/adminController").incrementAdClicks);
router.delete("/todas/mias", authenticate, checkSuspension, require("../controllers/postController").deleteAllUserPosts);

module.exports = router;

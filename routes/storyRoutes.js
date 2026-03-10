const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth");
const {
    crearStory,
    getStoriesFeed,
    getMisStories,
    getArchivedStories,
    getStoryById,
    viewStory,
    deleteStory,
    deleteArchivedStory,
    getStoriesByUser,
    deleteAllMyStories,
} = require("../controllers/storyController");

router.post("/", authenticate, crearStory);
router.get("/feed", authenticate, getStoriesFeed);
router.get("/mine", authenticate, getMisStories);
router.get("/archive", authenticate, getArchivedStories);
router.get("/user/:userId", authenticate, getStoriesByUser);
router.get("/:id", authenticate, getStoryById);
router.post("/:id/view", authenticate, viewStory);
router.delete("/:id", authenticate, deleteStory);
router.delete("/archive/:id", authenticate, deleteArchivedStory);
router.delete("/all/mine", authenticate, deleteAllMyStories);

module.exports = router;

const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { authenticate } = require("../middlewares/auth");

const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
            cb(null, true);
        } else {
            cb(new Error("Solo se permiten imágenes y videos"), false);
        }
    }
});

router.post("/", authenticate, upload.array("media", 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ msg: "No se proporcionaron archivos" });
        }

        const { startTime, endTime } = req.body;
        const hasTrim = startTime && endTime && parseFloat(endTime) - parseFloat(startTime) <= 30;
        const trimDuration = hasTrim 
            ? parseFloat(endTime) - parseFloat(startTime) 
            : null;

        const uploadedFiles = await Promise.all(
            req.files.map(async (file) => {
                const tipo = file.mimetype.startsWith("video/") ? "video" : "imagen";
                
                const uploadOptions = {
                    resource_type: tipo === "video" ? "video" : "image",
                    folder: "jandochat/posts"
                };

                const result = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        uploadOptions,
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    uploadStream.end(file.buffer);
                });

                let finalUrl = result.secure_url;

                if (tipo === "video" && hasTrim) {
                    const start = parseFloat(startTime);
                    const end = parseFloat(endTime);
                    finalUrl = `${result.secure_url}#t=${start},${end}`;
                }

                return {
                    url: finalUrl,
                    tipo,
                    duration: trimDuration,
                    publicId: result.public_id,
                    startTime: hasTrim ? parseFloat(startTime) : null,
                    endTime: hasTrim ? parseFloat(endTime) : null
                };
            })
        );

        res.json(uploadedFiles);
    } catch (error) {
        console.error("Error uploading:", error);
        res.status(500).json({ msg: "Error al subir archivos" });
    }
});

module.exports = router;

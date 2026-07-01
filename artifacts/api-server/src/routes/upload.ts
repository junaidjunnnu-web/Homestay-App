import { Router } from "express";
import type express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../middlewares/auth";

// Try to import sharp, but make it optional
let sharp: any;
try {
  sharp = require("sharp");
} catch (e) {
  console.warn("Sharp not available, image compression disabled");
}

const router = Router();

const uploadDir = path.resolve(process.cwd(), "uploads");
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn("Could not create uploads directory:", err);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WebP images are allowed (max 5MB)"));
    }
  },
});

function handleMulterUpload(
  uploadMiddleware: ReturnType<typeof upload.single> | ReturnType<typeof upload.array>,
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        next(err);
        return;
      }
      next();
    });
  };
}

// Single image upload with compression
router.post("/upload", requireAuth, handleMulterUpload(upload.single("file")), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "validation", message: "No file uploaded" });
    return;
  }

  try {
    const filePath = path.join(uploadDir, req.file.filename);

    // Compress image using sharp if available
    if (sharp) {
      try {
        const compressedPath = path.join(uploadDir, `compressed_${req.file.filename}`);
        await sharp(filePath)
          .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(compressedPath);

        // Replace original with compressed
        fs.unlinkSync(filePath);
        fs.renameSync(compressedPath, filePath);
      } catch (compressionError) {
        req.log.warn({ error: compressionError }, "Image compression failed, using original");
      }
    }

    res.json({ 
      url: `/api/uploads/${req.file.filename}`,
      filename: req.file.filename,
      size: fs.statSync(filePath).size,
    });
  } catch (error) {
    req.log.error({ error }, "Upload error");
    // Return original if anything fails
    res.json({ 
      url: `/api/uploads/${req.file.filename}`,
      filename: req.file.filename,
      size: req.file.size,
    });
  }
});

// Multiple images upload
router.post("/upload-multiple", requireAuth, handleMulterUpload(upload.array("files", 10)), async (req, res) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    res.status(400).json({ error: "validation", message: "No files uploaded" });
    return;
  }

  try {
    const processedFiles = await Promise.all(
      (req.files as Express.Multer.File[]).map(async (file) => {
        const filePath = path.join(uploadDir, file.filename);

        // Compress image using sharp if available
        if (sharp) {
          try {
            const compressedPath = path.join(uploadDir, `compressed_${file.filename}`);
            await sharp(filePath)
              .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
              .jpeg({ quality: 80 })
              .toFile(compressedPath);

            fs.unlinkSync(filePath);
            fs.renameSync(compressedPath, filePath);
          } catch (compressionError) {
            req.log.warn({ error: compressionError }, `Image compression failed for ${file.filename}`);
          }
        }

        return {
          url: `/api/uploads/${file.filename}`,
          filename: file.filename,
          size: fs.statSync(filePath).size,
        };
      })
    );

    res.json({ files: processedFiles });
  } catch (error) {
    req.log.error({ error }, "Multiple image upload error");
    res.status(500).json({ error: "internal", message: "Failed to process images" });
  }
});

export default router;

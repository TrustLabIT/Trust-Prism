const express = require("express");
const multer = require("multer");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/assetController");

const router = express.Router();

// Small images go through the server so we can generate a preview + checksum.
// Anything larger uploads DIRECTLY to S3 via the presign/multipart routes below —
// those bytes never touch this server, so 50 GB masters don't lag or exhaust memory.
const smallUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.use(protect);

router.get("/", ctrl.list);
router.get("/counts", ctrl.counts);
router.get("/approvals", ctrl.approvals);
router.get("/expired", ctrl.expired);

// upload — small (server-side preview) path
router.post("/", smallUpload.single("file"), ctrl.create);

// upload — direct-to-S3 (large) path
router.post("/presign", ctrl.presign);
router.post("/presign-part", ctrl.signPart);
router.post("/presign-preview", ctrl.presignPreview);
router.post("/complete", ctrl.completeUpload);
router.post("/abort", ctrl.abortUpload);
router.post("/confirm", ctrl.confirm);

router.get("/:id", ctrl.getOne);
router.get("/:id/url", ctrl.downloadUrl);
router.patch("/:id", ctrl.update);
router.patch("/:id/status", ctrl.updateStatus);
router.delete("/:id", ctrl.remove);

module.exports = router;

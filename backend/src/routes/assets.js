const express = require("express");
const multer = require("multer");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/assetController");

const router = express.Router();

// in-memory upload; images compressed before hitting S3. 30 MB cap on the
// direct route — larger files (video) must use /presign for direct-to-S3 upload.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});
// replacing a file allows a bit more headroom (images/moderate media)
const replaceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.use(protect); // every asset route requires a valid token

router.get("/", ctrl.list);
router.get("/stats", ctrl.stats);
router.get("/analytics", ctrl.analytics);
router.post("/", upload.single("file"), ctrl.uploadImage);
router.post("/presign", ctrl.presign);
router.post("/confirm", ctrl.confirmUpload);
router.get("/:id", ctrl.getOne);
router.get("/:id/url", ctrl.downloadUrl);
router.patch("/:id", ctrl.update);
router.post("/:id/file", replaceUpload.single("file"), ctrl.replaceFile);
router.patch("/:id/status", ctrl.updateStatus);
router.post("/:id/comments", ctrl.addComment);
router.post("/:id/outcomes", ctrl.lodgeOutcome);
router.delete("/:id", ctrl.remove);

module.exports = router;

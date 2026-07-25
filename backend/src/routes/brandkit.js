const express = require("express");
const multer = require("multer");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/brandKitController");
const docs = require("../controllers/brandDocController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });      // logos
const uploadDoc = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });   // brand PDFs

router.use(protect);
router.get("/", ctrl.get);
router.put("/", ctrl.update);
router.post("/logo", upload.single("file"), ctrl.uploadLogo);
router.delete("/logo", ctrl.removeLogo);

// Brand documents (guideline PDFs) — CRUD + pagination
router.get("/docs", docs.list);
router.post("/docs", uploadDoc.single("file"), docs.create);
router.get("/docs/:id/url", docs.url);
router.patch("/docs/:id", docs.rename);
router.delete("/docs/:id", docs.remove);

module.exports = router;

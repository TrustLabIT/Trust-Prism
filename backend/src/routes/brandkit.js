const express = require("express");
const multer = require("multer");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/brandKitController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);
router.get("/", ctrl.get);
router.put("/", ctrl.update);
router.post("/logo", upload.single("file"), ctrl.uploadLogo);
router.delete("/logo", ctrl.removeLogo);

module.exports = router;

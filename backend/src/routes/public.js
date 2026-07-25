const express = require("express");
const ctrl = require("../controllers/publicController");

// No auth — these are the public share portal endpoints
const router = express.Router();
router.get("/share/:token", ctrl.getShare);
router.get("/share/:token/asset/:aid/url", ctrl.downloadShareAsset);

module.exports = router;

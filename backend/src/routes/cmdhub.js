// CMD Approval Hub routes. Guarded by the X-Api-Key shared secret
// (server-to-server from the hub, no session). Mounted at /api/cmdhub.
const express = require("express");
const { cmdHubGuard } = require("../middleware/cmdHub");
const ctrl = require("../controllers/cmdHubController");

const router = express.Router();
router.use(cmdHubGuard); // every route below requires the key

router.get("/pending", ctrl.pending);
router.get("/items/:id", ctrl.show);
router.get("/items/:id/file-url", ctrl.fileUrl);
router.get("/items/:id/zip", ctrl.zipList);
router.get("/items/:id/zip-file", ctrl.zipFile);
router.post("/items/:id/:action", ctrl.act);

module.exports = router;

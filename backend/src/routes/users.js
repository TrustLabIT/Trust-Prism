const express = require("express");
const { protect, requireSuperAdmin } = require("../middleware/auth");
const ctrl = require("../controllers/userController");

const router = express.Router();

// Only Super Admins can manage users
router.use(protect, requireSuperAdmin);
router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.patch("/:id/scope", ctrl.toggleScope);
router.delete("/:id", ctrl.remove);

module.exports = router;

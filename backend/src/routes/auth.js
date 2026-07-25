const express = require("express");
const { login, me, bootstrap } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/login", login);
router.post("/bootstrap", bootstrap);   // one-time: create first Super Admin (self-disables after)
router.get("/me", protect, me);

module.exports = router;

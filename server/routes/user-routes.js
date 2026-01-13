const express = require("express");

const router = express.Router();

const userController = require("../controllers/user-controller");
const auth = require("../middlewares/auth");
const uploadAvatar = require("../middlewares/uploadAvatar");

router.post("/register", userController.register);
router.post("/login", userController.login);
router.get("/me", auth, userController.me);
router.get("/", userController.getAllUsers);
router.put("/:id", auth, uploadAvatar.single("avatar"), userController.updateUserById);


module.exports = router;

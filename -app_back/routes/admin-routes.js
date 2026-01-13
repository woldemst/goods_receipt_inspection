const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin-controller");


router.get("/users/", adminController.getAllUsers);
router.put("/users/:userId", adminController.editUserById);
router.post("/users/", adminController.createUserByAdmin);
router.delete("/users/:userId", adminController.deleteUserByAdmin);

router.get("/reports/", adminController.getAllReports);
router.get("/projects/", adminController.getAllProjects);

module.exports = router;

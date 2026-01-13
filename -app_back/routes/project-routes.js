const express = require("express");

const router = express.Router();

const projectController = require("../controllers/project-controller");

router.post("/create", projectController.createProject);
router.get("/all", projectController.getAllProjects);
router.get("/:id", projectController.getProjectById);

router.put("/update/:id", projectController.updateProjectById);
router.delete("/delete/:id", projectController.deleteProjectById);

router.get("/pdf/:id", projectController.generatePdf);
router.get("/downloadPdf/:id", projectController.downloadPdf);

module.exports = router;

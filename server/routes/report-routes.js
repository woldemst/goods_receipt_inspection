const express = require("express");

const router = express.Router();

const reportController = require("../controllers/report-controller");
const upload = require("../middlewares/upload");

router.post("/", upload.array("images", 10), reportController.createReport);

router.put("/:id", reportController.editReportById);
router.get("/:userEmail", reportController.getReportsByUserEmail);
router.get("/id/:id", reportController.getReportById);

router.put("/update/:id", reportController.updateReporttById);
router.delete("/delete/:id", reportController.deleteReportById);

router.get("/pdf/:id", reportController.generatePdf);
// router.get("/downloadPdf/:id", reportController.downloadPdf);

module.exports = router;

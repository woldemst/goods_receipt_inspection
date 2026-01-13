const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const ejs = require("ejs");
const Project = require("../models/Project");
const Report = require("../models/Report");

const BACKEND_URL = process.env.BACKEND_URL;

exports.createReport = async (req, res) => {
	try {
		let { userEmail, title, description, projectId, damaged } = req.body;

		if (!userEmail || !title || !projectId) {
			return res.status(400).json({ error: "userEmail, title, and projectId are required" });
		}

		// ✅ store relative paths like "/uploads/..."
		const imagePaths = (req.files || []).map((file) => `/uploads/images/reports/${file.filename}`);
		console.log("imagePaths`", imagePaths);

		const report = await Report.create({
			userEmail,
			title,
			projectId,
			description,
			images: imagePaths,
			isDamaged: damaged === "true",
			date: new Date(),
		});

		await Project.findByIdAndUpdate(projectId, { $push: { reports: report._id } });

		if (damaged === "true") {
			await Project.findByIdAndUpdate(projectId, { hasDamagedReports: true });
		}

		res.json(report);
	} catch (err) {
		console.error("Error creating report:", err);
		res.status(500).json({ error: "Report could not be created" });
	}
};

exports.editReportById = async (req, res) => {
	try {
		const { id } = req.params;
		const { title, description } = req.body;
		const updated = await Report.findByIdAndUpdate(id, { title, description }, { new: true });
		if (!updated) return res.status(404).json({ error: "Report nicht gefunden" });
		res.json(updated);
	} catch (err) {
		console.error("Fehler beim Aktualisieren des Reports:", err);
		res.status(500).json({ error: "Update fehlgeschlagen" });
	}
};

exports.getReportById = async (req, res) => {
	console.log("[GET /by-id] Params:", req.params);

	try {
		const report = await Report.findById(req.params.id);
		if (!report) {
			return res.status(404).json({ error: "Report nicht gefunden" });
		}
		res.json(report);
	} catch (err) {
		console.error("[GET /by-id] Error:", err);
		res.status(500).json({ error: "Report kann nicht geladen werden" });
	}
};

exports.getReportsByUserEmail = async (req, res) => {
	try {
		const userEmail = req.params.userEmail?.trim().toLowerCase();
		if (!userEmail) return res.status(400).json({ error: "userEmail erforderlich" });
		const reports = await Report.find({ userEmail }).sort({ date: -1 });
		res.json(reports);
	} catch (err) {
		console.error("Fehler beim Abrufen der Reports:", err);
		res.status(500).json({ error: "Reports konnten nicht geladen werden" });
	}
};

exports.updateReporttById = async (req, res) => {
	try {
		const { id } = req.params;
		const { title, description } = req.body;
		const updated = await Report.findByIdAndUpdate(id, { title, description }, { new: true });
		if (!updated) return res.status(404).json({ error: "Report not found" });
		res.json(updated);
	} catch (err) {
		console.error("Error updating report:", err);
		res.status(500).json({ error: "Failed to update report" });
	}
};

exports.deleteReportById = async (req, res) => {
	try {
		const { id } = req.params;
		const deleted = await Report.findByIdAndDelete(id);
		if (!deleted) return res.status(404).json({ error: "Report not found" });
		res.json({ success: true });
	} catch (err) {
		console.error("Error deleting report:", err);
		res.status(500).json({ error: "Failed to delete report" });
	}
};
exports.generatePdf = async (req, res) => {
	try {
		const { id } = req.params;
		const report = await Report.findById(id);
		if (!report) return res.status(404).json({ error: "Report not found" });

		const templatePath = path.join(__dirname, "../templates/reportPDF.ejs");

		const html = await ejs.renderFile(templatePath, {
			report,
			baseUrl: BACKEND_URL, // <— important
		});

		const pdfDir = path.join(__dirname, "../uploads/pdfs/reports");
		if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

		const pdfPath = path.join(pdfDir, `report_${report._id}.pdf`);

		const browser = await puppeteer.launch({
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
			headless: true,
		});
		const page = await browser.newPage();
		await page.setContent(html, { waitUntil: "networkidle0" });
		await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
		await browser.close();

		res.download(pdfPath);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "could not create PDF" });
	}
};

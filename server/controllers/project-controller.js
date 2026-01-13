const Project = require("../models/Project");
const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const puppeteer = require("puppeteer");

exports.createProject = async (req, res) => {
	try {
		let { title, description, userId, imageUri } = req.body;

		console.log(title, description, userId, imageUri);

		// if (!title || !userId) {
		// 	return res.status(400).json({ error: "All fields are required" });
		// }
		const project = await Project.create({
			userId,
			title,
			description,
			imageUri,
			createdAt: new Date(),
		});
		res.json(project);
	} catch (err) {
		console.error("Error if creating a project:", err);
		res.status(500).json({ error: "Project could not be created" });
	}
};

exports.getAllProjects = async (req, res) => {
	try {
		// Aggregation that joins reports and counts them
		const projects = await Project.aggregate([
			{
				$lookup: {
					from: "reports",
					localField: "_id",
					foreignField: "projectId",
					as: "reports",
				},
			},
			{ $addFields: { reportCount: { $size: "$reports" } } },
			{ $project: { reports: 0 } }, // no need to send full report array
		]);

		res.json(projects);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Server error" });
	}
};

exports.getAllProjectsByUserId = async (req, res) => {
	try {
		const userId = req.params.userEmail?.trim().toLowerCase();
		if (!userId) return res.status(400).json({ error: "need userId" });
		const projects = await Project.find({ userId }).sort({ date: -1 });
		res.json(projects);
	} catch (err) {
		console.error("Error if fetching projects by userId:", err);
		res.status(500).json({ error: "Projects could not be fetched" });
	}
};

exports.getProjectById = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ error: "Project ID is required" });

		// populate reports
		const project = await Project.findById(id).populate("reports");

		if (!project) return res.status(404).json({ error: "Project not found" });

		res.json(project);
	} catch (err) {
		console.error("Error fetching project by ID:", err);
		res.status(500).json({ error: "Failed to fetch project" });
	}
};

exports.updateProjectById = async (req, res) => {
	try {
		const { id } = req.params;
		const { title, description, imageUri } = req.body;
		const updated = await Project.findByIdAndUpdate(id, { title, description, imageUri }, { new: true });
		if (!updated) return res.status(404).json({ error: "Project not found" });
		res.json(updated);
	} catch (err) {
		console.error("Error updating project:", err);
		res.status(500).json({ error: "Failed to update project" });
	}
};

exports.deleteProjectById = async (req, res) => {
	try {
		const { id } = req.params;
		const deleted = await Project.findByIdAndDelete(id);
		if (!deleted) return res.status(404).json({ error: "Project not found" });
		res.json({ success: true });
	} catch (err) {
		console.error("Error deleting project:", err);
		res.status(500).json({ error: "Failed to delete project" });
	}
};

exports.generatePdf = async (req, res) => {
	try {
		const { id } = req.params;
		const project = await Project.findById(id).populate("reports");
		if (!project) return res.status(404).json({ error: "Project not found" });

		const templatePath = path.join(__dirname, "../templates/projectPDF.ejs");

		// Render the EJS template with project data
		const html = await ejs.renderFile(templatePath, { project });

		const pdfDir = path.join(__dirname, "../uploads/pdfs/projects");
		if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

		const pdfPath = path.join(pdfDir, `project_${project._id}.pdf`);

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

// PDF herunterladen (liefert gespeichertes PDF aus Upload-Verzeichnis)
exports.downloadPdf = async (req, res) => {
	const id = req.params.id;

	if (!id) return res.status(400).send("Keine Datei angegeben");

	const file = `project_${id}.pdf`;

	// const pdfPath = path.join("/uploads/pdfs/projects", file);
	const pdfPath = path.join(__dirname, "../uploads/pdfs/projects", file); // just relative path

	console.log("pdfPath", pdfPath);
	// console.log(pdfPath);

	if (!fs.existsSync(pdfPath)) {
		return res.status(404).send("PDF nicht gefunden");
	}
	res.download(pdfPath, file);
};

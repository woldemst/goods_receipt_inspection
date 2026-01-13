const User = require("../models/User");
const Report = require("../models/Report");
const Project = require("../models/Project");
const bcrypt = require("bcrypt");

// users //
exports.getAllUsers = async (req, res) => {
	try {
		const users = await User.find({}, "-password");
		res.json(users);
	} catch (err) {
		console.error("Error loading users:", err);
		res.status(500).json({ error: "User could not be loaded" });
	}
};

exports.editUserById = async (req, res) => {
	try {
		const userId = req.params.userId;

		const { avatar, firstName, lastName, password } = req.body;

		// Check if user exists
		const userToEdit = await User.findById(userId);
		if (!userToEdit) {
			return res.status(404).json({ error: "Benutzer nicht gefunden" });
		}

		// Build update object
		const update = {};
		if (firstName !== undefined) update.firstName = firstName;
		if (lastName !== undefined) update.lastName = lastName;
		if (password !== undefined) {
			update.password = await bcrypt.hash(password, 10);
		}
		if (avatar !== undefined) update.avatar = avatar;

		// Update user
		const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true, fields: "-password" });

		res.json(updatedUser);
	} catch (err) {
		console.error("Fehler beim Editieren des Users:", err);
		res.status(500).json({ error: "Update fehlgeschlagen" });
	}
};

exports.createUserByAdmin = async (req, res) => {
	try {
		const { email, password, firstName, lastName, avatar, isAdmin = false } = req.body;
		if (!email || !password) {
			return res.status(400).json({ error: "E‑Mail und Passwort erforderlich" });
		}

		const existing = await User.findOne({ email: email.trim().toLowerCase() });
		if (existing) {
			return res.status(409).json({ error: "Benutzer existiert bereits" });
		}

		const hashed = await bcrypt.hash(password, 10);
		const user = await User.create({
			email: email.trim().toLowerCase(),
			password: hashed,
			firstName,
			lastName,
			avatar,
			isAdmin: Boolean(isAdmin),
		});

		// Return the user *without* the password
		const { password: _, ...safeUser } = user.toObject();
		res.status(201).json(safeUser);
	} catch (err) {
		console.error("Fehler beim Erstellen eines Users:", err);
		res.status(500).json({ error: "User konnte nicht erstellt werden" });
	}
};

exports.deleteUserByAdmin = async (req, res) => {
	try {
		const userId = req.params.userId;
		const user = await User.findByIdAndDelete(userId);
		if (!user) return res.status(404).json({ error: "Benutzer nicht gefunden" });

		// Optionally also delete all reports by that user
		await Report.deleteMany({ userEmail: user.email });

		res.json({ message: "Benutzer gelöscht" });
	} catch (err) {
		console.error("Fehler beim Löschen eines Users:", err);
		res.status(500).json({ error: "Löschen fehlgeschlagen" });
	}
};

// reports //
exports.getAllReports = async (req, res) => {
	try {
		const adminEmail = req.params.adminEmail?.trim().toLowerCase();
		const admin = await User.findOne({ email: adminEmail });
		if (!admin || !admin.isAdmin) {
			return res.status(403).json({ error: "Keine Admin-Berechtigung" });
		}
		const reports = await Report.find({}).sort({ date: -1 });
		res.json(reports);
	} catch (err) {
		console.error("Fehler beim Abrufen der Admin-Reports:", err);
		res.status(500).json({ error: "Konnte Admin-Reports nicht laden" });
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

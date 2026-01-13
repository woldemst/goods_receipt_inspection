const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES;
const AVATAR_STATIC_PREFIX = "/uploads/images/users/";

const generateToken = (user) => {
	return jwt.sign(
		{
			id: String(user._id),
			email: user.email,
			isAdmin: Boolean(user.isAdmin),
		},
		JWT_SECRET,
		{ expiresIn: JWT_EXPIRES }
	);
};

exports.me = async (req, res) => {
	try {
		const user = await User.findById(req.user?.id, "-password");
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		return res.json(user);
	} catch (err) {
		console.error("Get current user error:", err);
		return res.status(500).json({ error: "Could not load user" });
	}
};

exports.register = async (req, res, next) => {
	try {
		let { email, password, firstName, lastName, avatar } = req.body;
		if (!email || !password) {
			return res.status(400).json({ error: "All fields required" });
		}
		email = email.trim().toLowerCase();

		if (await User.findOne({ email })) {
			return res.status(400).json({ error: "User already exists" });
		}

		const hashed = await bcrypt.hash(password, 10);
		const user = await User.create({
			email,
			password: hashed,
			firstName,
			lastName,
			avatar,
		});

		const token = generateToken(user);

		res.json({
			_id: user._id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			avatar: user.avatar,
			isAdmin: user.isAdmin || false,
			token,
		});
	} catch (err) {
		console.error("Registration error:", err);
		res.status(500).json({ error: err.message || "Registration failed" });
		return next(err);
	}
};

exports.login = async (req, res, next) => {
	try {
		let { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ error: "Email and password required" });
		}

		email = email.trim().toLowerCase();
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		const match = await bcrypt.compare(password, user.password);
		if (!match) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		const token = generateToken(user);
		return res.json({
			_id: user._id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			avatar: user.avatar,
			isAdmin: user.isAdmin || false,
			token,
		});
	} catch (err) {
		console.error("Login error:", err);
		return res.status(500).json({ error: "Login failed" });
	}
};

exports.getAllUsers = async (req, res) => {
	try {
		const users = await User.find({}, "-password");
		res.json(users);
	} catch (err) {
		console.error("Error loading users:", err);
		res.status(500).json({ error: "User could not be loaded" });
	}
};

exports.updateUserById = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) {
			return res.status(400).json({ error: "User ID missing" });
		}

		const requester = req.user;
		if (!requester || (requester.id !== id && !requester.isAdmin)) {
			return res.status(403).json({ error: "Not authorized" });
		}

		const userToEdit = await User.findById(id);
		if (!userToEdit) {
			return res.status(404).json({ error: "User not found" });
		}

		const { firstName, lastName, avatar } = req.body;
		const update = {};

		if (firstName !== undefined) update.firstName = firstName;
		if (lastName !== undefined) update.lastName = lastName;
		if (avatar !== undefined) update.avatar = avatar;

		const avatarFile = req.file;
		if (avatarFile) {
			const shouldDeleteOldAvatar = userToEdit.avatar && !userToEdit.avatar.startsWith("http") && !userToEdit.avatar.startsWith("data:");
			if (shouldDeleteOldAvatar) {
				const safeOldPath = userToEdit.avatar.replace(/^(\.\.\/)+/, "").replace(/^\/+/, "");
				const existingPath = path.join(__dirname, "..", safeOldPath);
				fs.promises.unlink(existingPath).catch(() => {
					/* ignore */
				});
			}
			update.avatar = `${AVATAR_STATIC_PREFIX}${avatarFile.filename}`;
		}

		if (Object.keys(update).length === 0) {
			return res.status(400).json({ error: "No update fields provided" });
		}

		const updatedUser = await User.findByIdAndUpdate(id, update, { new: true, select: "-password" });

		return res.json(updatedUser);
	} catch (err) {
		console.error("Error updating user:", err);
		return res.status(500).json({ error: "User update failed" });
	}
};

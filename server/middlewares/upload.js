// middlewares/upload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadRoot = process.env.UPLOADS || path.join(__dirname, "../uploads");
const uploadDir = path.join(uploadRoot, "images", "reports");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, uploadDir),
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname);
		const name = path.basename(file.originalname, ext);
		cb(null, `${name}-${Date.now()}${ext}`);
	},
});

module.exports = multer({ storage });

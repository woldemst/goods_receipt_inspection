const mongoose = require("mongoose");

// Use dynamic import for nanoid
let nanoid;
(async () => {
	const { customAlphabet } = await import("nanoid");
	nanoid = customAlphabet("1234567890abcdef", 8); // 8-char hex
})();

const projectSchema = new mongoose.Schema(
	{
		title: { type: String, required: true },
		userId: { type: String, required: true },
		description: String,
		images: String,
		hasDamagedReports: { type: Boolean, default: false },
		createdAt: { type: Date, default: Date.now },
		updatedAt: { type: Date, default: Date.now },
		reports: [{ type: mongoose.Schema.Types.ObjectId, ref: "Report" }],
		shortId: { type: String, unique: true, default: () => nanoid() },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);

const mongoose = require("mongoose");

// Use dynamic import for nanoid
let nanoid;
(async () => {
	const { customAlphabet } = await import("nanoid");
	nanoid = customAlphabet("1234567890abcdef", 8); // 8-char hex
})();
const reportSchema = new mongoose.Schema(
	{
		title: { type: String, required: true },
		userEmail: String,
		description: String,
		images: { type: [String], default: [] },
		date: Date,
		createdAt: { type: Date, default: Date.now },
		updatedAt: { type: Date, default: Date.now },
		isDamaged: { type: Boolean, default: false },
		projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
		shortId: { type: String, unique: true, default: () => nanoid() },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const path = require("path");
const fs = require("fs");
const PORT = 3000;

// filesystem paths
const uploadDir = process.env.UPLOADS || path.join(__dirname, "./uploads");
const templateDir = process.env.TEMPLATES || path.join(__dirname, "./templates");


app.use("/uploads", express.static(uploadDir));
app.use("/templates", express.static(templateDir));

// import routes
const userRoutes = require("./routes/user-routes");
const reportRoutes = require("./routes/report-routes");
const projectRoutes = require("./routes/project-routes");
const adminRoutes = require("./routes/admin-routes");

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

// routes
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/admin", adminRoutes);

// connect to MongoDB
mongoose
	.connect(process.env.DB_URL)
	.then(() => console.log("✅ Verbunden mit MongoDB"))
	.catch((err) => console.error("❌ Fehler bei MongoDB-Verbindung:", err));

// Strat server
app.listen(PORT, "0.0.0.0", () => console.log(`Server is running on port ${PORT}`));

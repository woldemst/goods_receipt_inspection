const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
	try {
		const authHeader = req.headers.authorization || req.headers.Authorization;
		if (!authHeader) {
			return res.status(401).json({ error: "Authorization header missing" });
		}

		const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
		if (!token) {
			return res.status(401).json({ error: "Token missing" });
		}

		const decoded = jwt.verify(token, JWT_SECRET);
		req.user = decoded;
		return next();
	} catch (err) {
		return res.status(401).json({ error: "Invalid or expired token" });
	}
};

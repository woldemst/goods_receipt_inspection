export type Report = {
	_id: string;
	userEmail: string;
	title?: string;
	description: string;
	images?: string[];
	date?: string;
	isDamaged?: boolean;
	createdAt?: Date;
	shortId?: string;
};

export type Project = {
	_id?: string;
	title?: string;
	status?: "";
	description: string;
	imageUri?: string;
	reportCount?: number;
	reportIds?: string[];
	hasDamagedReports?: boolean;
	createdAt?: Date;
	shortId?: string;
	reports?: Report[];
};

export type User = {
	_id: string;
	email: string;
	firstName?: string;
	lastName?: string;
	isAdmin?: boolean;
	avatar?: string;
};

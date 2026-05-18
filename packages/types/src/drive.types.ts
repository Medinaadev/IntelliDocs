export type DriveBreadcrumbItem = {
	id: string | null; // null for root
	name: string;
};

export type DriveItemType = "file" | "folder";

export type GetDriveBreadcrumbsResponse = {
	items: DriveBreadcrumbItem[];
};

export type DriveItemAuthor = {
	id: string;
	name: string;
	image: string | null;
};

export type DriveTag = {
	id: string;
	name: string;
	color: string | null;
};

export type DriveFolderItem = {
	type: "folder";
	id: string;
	name: string;
	color: string | null;
	createdBy: DriveItemAuthor | null;
	createdAt: string;
	updatedAt: string;
};

export type DriveFileItem = {
	type: "file";
	id: string;
	name: string;
	parentId: string;
	mimeType: string | null;
	size: string | null; // BigInt serialized as string
	uploadedBy: DriveItemAuthor;
	versionNumber: number;
	tags: DriveTag[];
	createdAt: string;
	updatedAt: string;
};

export type DriveItem = DriveFolderItem | DriveFileItem;

export type GetDriveContentResponse = {
	parentId: string | null;
	items: DriveItem[];
	hasMore: boolean;
};

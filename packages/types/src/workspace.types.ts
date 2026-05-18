export interface ClientWorkspaceData {
	id: string;
	name: string;
	image: string | null;
	plan: string;
	seatsLimit: number;
	storageLimit: number;
	storageUsed: number; // bytes
	memberCount?: number;
	lastActiveAt?: Date;
}

export interface SimpleWorkspaceMember {
	id: string;
	workspaceId: string;
	userId: string;
	isOwner: boolean;
}

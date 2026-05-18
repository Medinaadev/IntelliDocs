export type PgTableInsertPayload<TRow = unknown> = {
	id: number;
	event: "INSERT";
	table: string;
	data: TRow;
	_metadata?: {
		retry_count: number;
		created_at: Date;
	};
};

export type PgTableUpdatePayload<TRow = unknown> = {
	id: number;
	event: "UPDATE";
	table: string;
	data: {
		new: TRow;
		old: TRow;
		updatedFields: string[];
	};
	_metadata?: {
		retry_count: number;
		created_at: Date;
	};
};

export type PgTableDeletePayload<TRow = unknown> = {
	id: number;
	event: "DELETE";
	table: string;
	data: TRow;
	_metadata?: {
		retry_count: number;
		created_at: Date;
	};
};

export type PgTableChangePayload<TRow = unknown> =
	| PgTableInsertPayload<TRow>
	| PgTableUpdatePayload<TRow>
	| PgTableDeletePayload<TRow>;

export type PgTableChangeType = PgTableChangePayload["event"];

export type PgTableChanges<TRow = unknown> = {
	all: PgTableChangePayload<TRow>[];
	INSERT: PgTableInsertPayload<TRow>[];
	UPDATE: PgTableUpdatePayload<TRow>[];
	DELETE: PgTableDeletePayload<TRow>[];
};

export type RealtimeEvent<TRow = unknown> = {
	channel: string;
	payload: PgTableChangePayload<TRow>;
};

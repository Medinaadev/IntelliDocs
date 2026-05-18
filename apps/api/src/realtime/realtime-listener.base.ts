import {
    PgTableChangeListener,
    PgTableChangePayload,
    PgTableChanges,
} from 'src/pg-pubsub/pg-pubsub.types';
import { RealtimeService } from './realtime.service';

export abstract class RealtimeListener<
    TRow,
    TCustomRow = TRow,
> implements PgTableChangeListener<TRow> {
    constructor(
        protected readonly realtime: RealtimeService,
        protected readonly channelName: string,
    ) {}

    protected getRoom(row: TRow): string {
        // Override para emitir a una room específica
        return this.channelName;
    }

    protected async getRoomsForRow(row: TRow): Promise<string[]> {
        return [this.getRoom(row)];
    }

    protected getDataForRow(row: TRow): Promise<TCustomRow> {
        return Promise.resolve(row as unknown as TCustomRow);
    }

    private getOldDataForRow(row: TRow): TCustomRow {
        return row as unknown as TCustomRow;
    }

    private async getPayload(
        row: PgTableChangePayload<TRow>,
    ): Promise<PgTableChangePayload<TCustomRow>> {
        if (row.event === 'UPDATE') {
            return {
                ...row,
                data: {
                    new: await this.getDataForRow(row.data.new),
                    old: this.getOldDataForRow(row.data.old),
                },
            } as PgTableChangePayload<TCustomRow>;
        }

        return {
            ...row,
            data: await this.getDataForRow(row.data),
        } as PgTableChangePayload<TCustomRow>;
    }

    async process(changes: PgTableChanges<TRow>): Promise<void> {
        const all = [...changes.INSERT, ...changes.UPDATE, ...changes.DELETE];

        for (const payload of all) {
            const row =
                payload.event === 'UPDATE' ? payload.data.new : payload.data;
            const rooms = await this.getRoomsForRow(row);
            const formattedPayload = await this.getPayload(payload);

            for (const room of rooms) {
                this.realtime.emitToRoom(
                    room,
                    this.channelName,
                    formattedPayload,
                );
            }
        }
    }
}

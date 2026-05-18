export const REALTIME_CHANNEL_METADATA = 'realtime:channel';

export interface JwtPayload {
    sub: string;
    email: string;
}

export interface RealtimeChannel<
    TFilters extends Record<string, string> = Record<string, string>,
> {
    canSubscribe(user: JwtPayload, filters: TFilters): Promise<boolean>;
    canReceive(
        user: JwtPayload,
        filters: TFilters,
        payload: unknown,
    ): Promise<boolean>;
    // Opcional — si no se implementa, el listener gestiona el emit directamente
    getRoom?(
        user: JwtPayload,
        filters: Record<string, string>,
    ): string | undefined;
}

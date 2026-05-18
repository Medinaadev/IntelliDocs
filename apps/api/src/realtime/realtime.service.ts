import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
    JwtPayload,
    REALTIME_CHANNEL_METADATA,
    RealtimeChannel,
} from './realtime.types';
import { Namespace } from 'socket.io';
import { DiscoveryService, Reflector } from '@nestjs/core';

@Injectable()
export class RealtimeService implements OnModuleInit {
    private readonly logger = new Logger(RealtimeService.name);
    private channelsMap = new Map<string, RealtimeChannel>();
    private server: Namespace;

    constructor(
        private readonly discoveryService: DiscoveryService,
        private readonly reflector: Reflector,
    ) {}

    onModuleInit() {
        this.discoverChannels();
    }

    setServer(server: Namespace) {
        this.server = server;
    }

    async subscribe(
        socketId: string,
        user: JwtPayload,
        channelName: string,
        filters: Record<string, string> = {},
    ): Promise<{ ok: boolean; error?: string }> {
        const channel = this.channelsMap.get(channelName);

        if (!channel) {
            return { ok: false, error: `Unknown channel "${channelName}"` };
        }

        const allowed = await channel.canSubscribe(user, filters);

        if (!allowed) {
            return { ok: false, error: 'Unauthorized' };
        }

        const room = channel.getRoom?.(user, filters);
        const socket = this.server.sockets.get(socketId);

        if (!socket) {
            return { ok: false, error: 'Socket not found' };
        }

        if (room) {
            await socket.join(room);
        }
        return { ok: true };
    }

    async unsubscribe(
        socketId: string,
        channelName: string,
        filters: Record<string, string> = {},
    ) {
        const channel = this.channelsMap.get(channelName);
        if (!channel) return;

        const socket = this.server.sockets.get(socketId);
        if (!socket) {
            return { ok: false, error: 'Socket not found' };
        }
        const user = socket.data.user as JwtPayload;

        const room = channel.getRoom?.(user, filters);
        if (room && socket) {
            await socket?.leave(room);
        }
    }

    async removeSocket(socketId: string) {
        // Socket.IO limpia las rooms automáticamente al desconectar
        // no necesitamos hacer nada manual
    }

    emitToRoom(room: string, channelName: string, payload: unknown) {
        this.server
            .to(room)
            .emit('event', { channel: channelName, room, payload });
    }

    async removeFromRoom(room: string, userId: string) {
        // Busca todos los sockets de ese usuario y los saca de la room
        for (const [, socket] of this.server.sockets) {
            if ((socket.data.user as JwtPayload)?.sub === userId) {
                await socket.leave(room);
            }
        }
    }

    private discoverChannels() {
        const providers = this.discoveryService.getProviders();

        for (const wrapper of providers) {
            if (!wrapper.metatype) continue;

            const channelName = this.reflector.get<string>(
                REALTIME_CHANNEL_METADATA,
                wrapper.metatype,
            );

            if (!channelName) continue;

            this.channelsMap.set(
                channelName,
                wrapper.instance as RealtimeChannel,
            );
            this.logger.log(`Registered realtime channel "${channelName}"`);
        }
    }
}

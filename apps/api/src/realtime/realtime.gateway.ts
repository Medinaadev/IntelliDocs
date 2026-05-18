import { Logger, UnauthorizedException } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Namespace, Server, Socket } from 'socket.io';
import { JwtPayload } from './realtime.types';
import { RealtimeService } from './realtime.service';
import { getFrontendUrl } from 'src/lib/frontend';
import { jwtConstants } from 'src/auth/constants';
import { SubscribeDto } from './dto/subscribe.dto';

@WebSocketGateway({
    cors: { origin: getFrontendUrl(), credentials: true },
    namespace: 'realtime',
})
export class RealtimeGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(RealtimeGateway.name);

    constructor(
        private readonly realtimeService: RealtimeService,
        private readonly jwtService: JwtService,
    ) {}

    afterInit(server: Namespace) {
        this.realtimeService.setServer(server);
        this.logger.log('Realtime gateway initialized');
    }

    handleConnection(client: Socket) {
        try {
            const user = this.extractUser(client);
            client.data.user = user;
            this.logger.log(
                `Client connected: ${client.id} (user: ${user.sub})`,
            );
        } catch {
            this.logger.warn(`Unauthorized connection attempt: ${client.id}`);
            client.disconnect();
        }
    }

    async handleDisconnect(client: Socket) {
        await this.realtimeService.removeSocket(client.id);
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('subscribe')
    async handleSubscribe(
        @MessageBody()
        data: SubscribeDto,
        @ConnectedSocket() client: Socket,
    ) {
        const user = client.data.user as JwtPayload;

        if (!user) {
            return { ok: false, error: 'Unauthorized' };
        }

        const result = await this.realtimeService.subscribe(
            client.id,
            user,
            data.channel,
            data.filters,
        );

        if (result.ok) {
            this.logger.log(
                `Socket ${client.id} subscribed to "${data.channel}"`,
            );
        } else {
            this.logger.warn(
                `Socket ${client.id} failed to subscribe to "${data.channel}": ${result.error}`,
            );
        }

        return result;
    }

    @SubscribeMessage('unsubscribe')
    async handleUnsubscribe(
        @MessageBody() data: SubscribeDto,
        @ConnectedSocket() client: Socket,
    ) {
        await this.realtimeService.unsubscribe(
            client.id,
            data.channel,
            data.filters,
        );
        this.logger.log(
            `Socket ${client.id} unsubscribed from "${data.channel}"`,
        );
        return { ok: true };
    }

    private extractUser(client: Socket): JwtPayload {
        const token = this.extractToken(client);
        const refreshToken = this.extractRefreshToken(client);

        if (!token) {
            if (refreshToken) {
                client.emit('refresh_token_required');
            }

            throw new UnauthorizedException('No token provided');
        }

        try {
            return this.jwtService.verify<JwtPayload>(token, {
                secret: jwtConstants.secret,
            });
        } catch {
            throw new UnauthorizedException('Invalid token');
        }
    }

    private extractToken(client: Socket): string | null {
        // Cookie access_token
        const cookie = client.handshake.headers?.cookie;
        const cookieToken = cookie
            ?.split(';')
            .map((c) => c.trim())
            .find((c) => c.startsWith('access_token='))
            ?.split('=')[1];

        if (cookieToken) return cookieToken;

        // Bearer token
        const bearerToken =
            client.handshake.auth?.token ??
            client.handshake.headers?.authorization?.replace('Bearer ', '');

        return bearerToken ?? null;
    }

    private extractRefreshToken(client: Socket): string | null {
        const cookie = client.handshake.headers?.cookie;
        const refreshToken = cookie
            ?.split(';')
            .map((c) => c.trim())
            .find((c) => c.startsWith('refresh_token='))
            ?.split('=')[1];

        return refreshToken ?? null;
    }
}

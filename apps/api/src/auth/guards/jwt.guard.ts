import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from 'src/prisma.service';
import { AuthService } from '../auth.service';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { jwtConstants } from '../constants';

export interface JwtRequest extends Request {
    user: {
        id: string;
        email: string;
        name: string;
        image?: string;
    };
    session: {
        id: string;
        userId: string;
        expiresAt: Date;
    };
}

@Injectable()
export class JwtGuard implements CanActivate {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly authService: AuthService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<JwtRequest>();
        const response = context.switchToHttp().getResponse<Response>();
        let accessToken = this.extractAccessToken(request);
        const refreshToken = this.extractRefreshToken(request);

        if (!accessToken) {
            if (!refreshToken) {
                throw new UnauthorizedException('No autenticado');
            }

            try {
                const result = await this.handleRefreshToken(
                    response,
                    refreshToken,
                );

                accessToken = result.accessToken;
            } catch (error) {
                if (error instanceof UnauthorizedException) throw error;
                Logger.error('JWT validation error', error.stack);
                throw new UnauthorizedException(
                    'Sesión inválida o expirada',
                );
            }
        }

        try {
            this.jwtService.verify(accessToken, {
                secret: jwtConstants.secret,
            });
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                throw new UnauthorizedException('Sesión expirada');
            }
            throw new UnauthorizedException('Token de acceso inválido');
        }

        const session = await this.prisma.session.findUnique({
            where: { accessToken },
            include: { user: true },
        });

        if (!session) {
            throw new UnauthorizedException('Sesión no encontrada');
        }

        if (!session.user) {
            throw new UnauthorizedException('Usuario no encontrado');
        }

        if (session.accessTokenExpires < new Date()) {
            throw new UnauthorizedException('Sesión expirada');
        }

        request.user = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            image: session.user.image || undefined,
        };
        request.session = {
            id: session.id,
            userId: session.userId,
            expiresAt: session.accessTokenExpires,
        };

        return true;
    }

    private extractAccessToken(request: JwtRequest): string | null {
        const authHeader = request.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.slice(7);
        }

        const tokenCookie = request.cookies['access_token'];
        if (tokenCookie) {
            return tokenCookie;
        }

        return null;
    }

    private extractRefreshToken(request: JwtRequest): string | null {
        const refreshTokenCookie = request.cookies['refresh_token'];
        if (refreshTokenCookie) {
            return refreshTokenCookie;
        }
        return null;
    }

    private async handleRefreshToken(
        response: Response,
        refreshToken: string,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const { accessToken, refreshToken: newRefreshToken } =
            await this.authService.refreshTokens(refreshToken);

        // Guardar nuevos tokens en cookies
        this.authService.setAuthCookies(response, accessToken, newRefreshToken);

        return { accessToken, refreshToken: newRefreshToken };
    }
}

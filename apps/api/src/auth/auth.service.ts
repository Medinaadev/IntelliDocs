import {
    BadRequestException,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaClient, User } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma.service';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ResendService } from 'src/resend.service';
import { DefaultArgs } from '@prisma/client/runtime/client';
import { getFrontendUrl } from 'src/lib/frontend';
import { Response } from 'express';
import { jwtConstants } from './constants';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private resend: ResendService,
        private storage: StorageService,
    ) {}
    private readonly logger = new Logger(AuthService.name);

    async validateOrCreateUser(
        providerType: string,
        providerAccountId: string,
        email: string,
        name: string,
        image?: string,
    ): Promise<User> {
        const account = await this.prisma.account.findUnique({
            where: {
                providerType_providerAccountId: {
                    providerType,
                    providerAccountId,
                },
            },
            include: {
                user: true,
            },
        });

        if (account && account.user) {
            return account.user;
        }

        const user = await this.prisma.user.create({
            data: {
                email,
                name,
                image,
                emailVerified: new Date(),
                accounts: {
                    create: {
                        providerType,
                        providerAccountId,
                    },
                },
            },
        });

        return user;
    }

    async validateUser(email: string, password: string): Promise<User> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (!user.passwordHash) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return user;
    }

    async revokeSession(sessionId: string) {
        await this.prisma.session.delete({ where: { id: sessionId } });
        this.logger.debug(`Session revoked: ${sessionId}`);
    }

    async revokeUserSessions(userId: string) {
        await this.prisma.session.deleteMany({
            where: { userId },
        });
        this.logger.debug(`All sessions revoked for user ID: ${userId}`);
    }

    generateSecureToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    async updateGoogleTokens(
        userId: string,
        googleId: string, // Google profile ID
        accessToken: string,
        refreshToken: string,
    ) {
        await this.prisma.account.update({
            where: {
                providerType_providerAccountId: {
                    providerType: 'google',
                    providerAccountId: googleId, // Usar el ID de Google, no el email
                },
            },
            data: {
                accessToken,
                refreshToken,
            },
        });
    }

    async createJwtToken(user: { id: string; email: string }) {
        const payload = {
            sub: user.id,
            email: user.email,
            type: 'access',
        };
        return this.jwtService.signAsync(payload);
    }

    async googleLogin(req: {
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            picture: string;
            accessToken: string;
            refreshToken: string;
            sessionId: string;
        };
    }) {
        if (!req.user) {
            throw new UnauthorizedException('No user from google');
        }

        // Obtener usuario completo de BD
        const user = await this.prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                accounts: true,
                sessions: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found in database');
        }

        this.logger.debug(
            `Google user logged in: ${user.email} (ID: ${user.id})`,
        ); // Log de inicio de sesión exitoso
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            accessToken: req.user.accessToken,
            refreshToken: req.user.refreshToken,
            sessionId: req.user.sessionId,
        };
    }

    async login({ id }: { id: string }) {
        const user = await this.prisma.user.findUnique({
            where: { id: id },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        } else if (!user.emailVerified) {
            throw new UnauthorizedException('Email not verified');
        }

        const accessToken = await this.createJwtToken({
            id: user.id,
            email: user.email,
        });

        const refreshToken = this.generateSecureToken();

        const session = await this.prisma.session.create({
            data: {
                userId: user.id,
                accessToken,
                refreshToken,
                accessTokenExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
                refreshTokenExpires: new Date(
                    Date.now() + 30 * 24 * 60 * 60 * 1000,
                ), // 30 días
            },
        });

        this.logger.debug(`User logged in: ${user.email} (ID: ${user.id})`); // Log de inicio de sesión exitoso
        return {
            accessToken,
            refreshToken,
            sessionId: session.id,
            userId: user.id,
            email: user.email,
            name: user.name,
        };
    }

    async refreshTokens(refreshToken: string) {
        // Buscar sesión por refresh token
        const session = await this.prisma.session.findUnique({
            where: { refreshToken },
            include: { user: true },
        });

        if (!session) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // Verificar expiración del refresh token
        if (session.refreshTokenExpires < new Date()) {
            await this.prisma.session.delete({ where: { id: session.id } });
            throw new UnauthorizedException('Refresh token expired');
        }

        // Actualizar sesión con nuevos tokens y marcar el refresh token actual como reutilizado
        return await this.prisma.$transaction(async (tx) => {
            let reuse = false;

            try {
                await tx.refreshTokenReuse.create({
                    data: {
                        sessionId: session.id,
                        oldToken: refreshToken, // Guardar el token antiguo para detectar reutilización
                    },
                });
            } catch (error) {
                if (error.code === 'P2002') {
                    // Violación de restricción única, el token ya fue registrado como reutilizado
                    reuse = true; // Se ha detectado reutilización del refresh token
                }
            }

            if (reuse) {
                await this.revokeUserSessions(session.userId); // Revocar todas las sesiones del usuario, posible ataque de reutilización
                throw new UnauthorizedException(
                    'Refresh token reuse detected. All sessions revoked.',
                );
            }

            // Generar nuevos tokens
            const newAccessToken = await this.createJwtToken({
                id: session.user.id,
                email: session.user.email,
            });

            const newRefreshToken = this.generateSecureToken();

            await tx.session.update({
                where: { id: session.id },
                data: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                    accessTokenExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
                    refreshTokenExpires: new Date(
                        Date.now() + 30 * 24 * 60 * 60 * 1000,
                    ), // 30 días
                    rotationCounter: session.rotationCounter + 1,
                },
            });

            this.logger.debug(
                `Tokens refreshed for user: ${session.user.email} (ID: ${session.user.id})`,
            ); // Log de refresco de tokens exitoso

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user: {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.name,
                    image: session.user.image,
                },
            };
        });
    }

    setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: jwtConstants.accessTokenExpiration,
        });

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: jwtConstants.refreshTokenExpiration,
        });

        this.logger.debug('Auth cookies set successfully'); // Log de cookies establecidas
    }

    clearAuthCookies(res: Response) {
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        this.logger.debug('Auth cookies cleared successfully'); // Log de cookies eliminadas
    }

    async register(name: string, email: string, password: string) {
        // Verificar si el usuario ya existe
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            if (existingUser.emailVerified) {
                throw new HttpException(
                    'User already exists and email is verified',
                    HttpStatus.BAD_REQUEST,
                );
            } else {
                const existingRequests =
                    await this.prisma.verificationRequest.findMany({
                        where: { userId: existingUser.id },
                        select: { expires: true },
                    });

                if (existingRequests.some((req) => req.expires > new Date())) {
                    throw new HttpException(
                        'User already exists but email is not verified. A verification email has already been sent.',
                        HttpStatus.BAD_REQUEST,
                    );
                }

                await this.sendVerificationEmail(existingUser);

                throw new HttpException(
                    'User already exists but email is not verified. A new verification email has been sent.',
                    HttpStatus.BAD_REQUEST,
                );
            }
        }

        // Crear nuevo usuario
        const passwordHash = await bcrypt.hash(password, 10);

        return await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    passwordHash,
                },
            });

            if (!user) {
                throw new HttpException(
                    'Error creating user',
                    HttpStatus.INTERNAL_SERVER_ERROR,
                );
            }

            // Enviar email de verificación
            await this.sendVerificationEmail(user, tx);

            this.logger.debug(`New user registered: ${email} (ID: ${user.id})`);
            return {
                message:
                    'User registered successfully. Please verify your email.',
            };
        });
    }

    async sendVerificationEmail(
        user: User,
        tx?: Omit<
            PrismaClient<never, undefined, DefaultArgs>,
            '$connect' | '$disconnect' | '$on' | '$use' | '$extends'
        >,
    ) {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verficationRequest = await (
            tx || this.prisma
        ).verificationRequest.create({
            data: {
                userId: user.id,
                token: verificationToken,
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
            },
        });

        if (!verficationRequest) {
            throw new HttpException(
                'Error creating verification request',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        const { data, error } = await this.resend.emails.send({
            to: user.email,
            template: {
                id: 'email-verification',
                variables: {
                    USERNAME: user.name,
                    VERIFICATION_URL: getFrontendUrl(
                        `/auth/verify-email?token=${verificationToken}`,
                    ),
                    YEAR: new Date().getFullYear(),
                    EXPIRATION: 24, // horas
                },
            },
        });

        if (error) {
            this.logger.warn(`Email de verificacion no enviado: ${error.message}`);
        } else {
            this.logger.debug('Verification email sent:', data);
        }

        return { message: 'Verification email sent' };
    }

    async verifyEmail(token: string) {
        const verificationRequest =
            await this.prisma.verificationRequest.findUnique({
                where: { token },
                include: { user: true },
            });

        if (
            !verificationRequest ||
            verificationRequest.expires < new Date() ||
            !verificationRequest.user
        ) {
            throw new HttpException(
                'Invalid or expired verification token',
                HttpStatus.BAD_REQUEST,
            );
        }

        await this.prisma.user.update({
            where: { id: verificationRequest.userId },
            data: { emailVerified: new Date() },
        });

        // Eliminar todas las solicitudes de verificación pendientes para este usuario
        await this.prisma.verificationRequest.deleteMany({
            where: { userId: verificationRequest.userId },
        });

        this.logger.debug(
            `Email verified for user ${verificationRequest.user.email}`,
        );
        return { message: 'Email verified successfully' };
    }

    // Profile

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                passwordHash: true,
            },
        });

        if (!user) throw new UnauthorizedException('User not found');

        const imageUrl = user.image
            ? await this.storage.getPresignedUrl(user.image)
            : null;

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            imageUrl,
            hasPassword: !!user.passwordHash,
        };
    }

    async updateProfile(
        userId: string,
        name?: string,
        file?: Express.Multer.File,
    ) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, image: true },
        });

        if (!user) throw new UnauthorizedException('User not found');

        let imageStorageKey = user.image;

        if (file) {
            const { storageKey } = await this.storage.uploadFile(
                file,
                userId,
                'images',
            );

            // Eliminar avatar anterior si existe
            if (user.image) {
                await this.storage.deleteFile(user.image).catch(() => null);
            }

            imageStorageKey = storageKey;
        }

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(name ? { name } : {}),
                ...(imageStorageKey !== user.image
                    ? { image: imageStorageKey }
                    : {}),
            },
            select: { id: true, name: true, email: true, image: true },
        });

        const imageUrl = updated.image
            ? await this.storage.getPresignedUrl(updated.image)
            : null;

        return { ...updated, imageUrl };
    }

    async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string,
    ) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, passwordHash: true },
        });

        if (!user) throw new UnauthorizedException('User not found');

        if (!user.passwordHash) {
            throw new BadRequestException(
                'Tu cuenta usa inicio de sesión con Google. No puedes cambiar la contraseña.',
            );
        }

        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid) {
            throw new UnauthorizedException('Contraseña actual incorrecta');
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newHash },
        });

        return { success: true };
    }
}

import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from 'src/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        private readonly authService: AuthService,
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
    ) {
        super({
            clientID: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            callbackURL: `${process.env.BACKEND_URL}/auth/login/google-redirect`,
            scope: ['email', 'profile'],
            passReqToCallback: true,
        });
    }

    async validate(
        req: any,
        googleAccessToken: string,
        googleRefreshToken: string,
        profile: {
            id: string;
            name: { givenName: string; familyName: string };
            emails: { value: string }[];
            photos: { value: string }[];
        },
        done: VerifyCallback,
    ) {
        const { name, emails, photos } = profile;
        const state = req.query.state
            ? JSON.parse(
                  Buffer.from(req.query.state as string, 'base64').toString(),
              )
            : {};

        // 1. Crear o obtener usuario de BD (email es el providerAccountId)
        const dbUser = await this.authService.validateOrCreateUser(
            'google',
            profile.id,
            emails[0].value,
            `${name.givenName} ${name.familyName}`,
            photos[0].value, // imagen de perfil de Google
        );

        // 2. Crear sesión y tokens JWT
        const accessToken = await this.authService.createJwtToken({
            id: dbUser.id,
            email: dbUser.email,
        });

        const refreshToken = this.authService.generateSecureToken();

        const session = await this.prisma.session.create({
            data: {
                userId: dbUser.id,
                accessToken,
                refreshToken,
                accessTokenExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
                refreshTokenExpires: new Date(
                    Date.now() + 30 * 24 * 60 * 60 * 1000,
                ), // 30 días
            },
        });

        // 3. Guardar tokens de Google en la cuenta
        await this.authService.updateGoogleTokens(
            dbUser.id,
            profile.id,
            googleAccessToken,
            googleRefreshToken,
        );

        // 4. Retornar usuario completo con tokens y sesión
        const user = {
            id: dbUser.id,
            email: emails[0].value,
            firstName: name.givenName,
            lastName: name.familyName,
            picture: photos[0].value,
            accessToken,
            refreshToken,
            sessionId: session.id,
            redirectUri: state.redirectUri, // Incluir redirectUri en la respuesta
        };
        done(null, user);
    }

    authenticate(req: Request & { redirectUri?: string }, options?: any): void {
        // Passport se encargará de redirigir al usuario a Google
        const redirectUri = req.query.redirectUri as string | undefined;
        const stateData = {
            redirectUri,
        };

        super.authenticate(req, {
            ...options,
            state: Buffer.from(JSON.stringify(stateData)).toString('base64'), // Codificar el estado como base64 para evitar problemas con caracteres especiales
        });
    }
}

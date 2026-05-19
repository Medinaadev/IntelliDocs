import {
    Controller,
    Get,
    Post,
    Patch,
    Request,
    UseGuards,
    Res,
    Body,
    UnauthorizedException,
    Logger,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { AuthService } from './auth.service';
import { JwtGuard, JwtRequest } from './guards/jwt.guard';
import { Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { minutes, Throttle } from '@nestjs/throttler';
import { Cookies } from 'src/decorators/cookies.decorator';
import { getFrontendUrl } from 'src/lib/frontend';
import { Jwt, JwtPayload, JwtSession, JwtSessionType, UseJwt } from './decorators/jwt.decorator';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}
    private readonly logger = new Logger(AuthController.name);

    @Throttle({ short: { limit: 5, ttl: minutes(5) } }) // Limitar a 5 solicitudes por 5 minutos
    @Get('login/google')
    @UseGuards(GoogleOAuthGuard)
    googleAuth() {
        // El guard se encargará de redirigir al usuario a Google
    }

    @Throttle({ medium: { limit: 5, ttl: minutes(5) } }) // Limitar a 5 solicitudes por 5 minutos
    @Get('login/google-redirect')
    @UseGuards(GoogleOAuthGuard)
    async googleAuthRedirect(
        @Request() req: { user: any; redirectUri?: string },
        @Res() res: Response,
    ) {
        const redirectUri = req.user.redirectUri as string | undefined;
        const { accessToken, refreshToken } =
            await this.authService.googleLogin(req);

        // Guardar tokens en cookies HttpOnly
        this.authService.setAuthCookies(res, accessToken, refreshToken);

        // Redirigir al frontend
        const frontendUrl = getFrontendUrl(redirectUri);
        return res.redirect(frontendUrl);
    }

    @Throttle({
        medium: { limit: 10, ttl: minutes(5), blockDuration: minutes(15) },
    }) // Limitar a 5 solicitudes por 5 minutos y bloquear por 15 minutos si se excede
    @Post('login')
    @UseGuards(AuthGuard('local'))
    async login(@Request() req: any, @Res() res: Response) {
        const data = await this.authService.login(
            req.user as { id: string; email: string; name: string },
        );

        // Guardar tokens en cookies HttpOnly
        this.authService.setAuthCookies(
            res,
            data.accessToken,
            data.refreshToken,
        );

        return res.json({
            user: {
                id: req.user.id,
                email: req.user.email,
                name: req.user.name,
            },
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        });
    }

    @Throttle({ short: { limit: 5, ttl: minutes(60) } }) // Limitar a 5 solicitudes por 60 minutos
    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        const { name, email, password } = registerDto;
        return await this.authService.register(name, email, password);
    }

    @Throttle({ short: { limit: 15, ttl: minutes(1) } }) // Limitar a 15 solicitudes por minuto
    @Post('verify-email')
    async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
        const { token } = verifyEmailDto;
        return await this.authService.verifyEmail(token);
    }

    @Get('profile')
    @UseJwt()
    async getProfile(@Jwt() jwt: JwtPayload) {
        return this.authService.getProfile(jwt.user.id);
    }

    @Get('session')
    @UseJwt()
    getSession(@Jwt() jwt: JwtPayload) {
        return {
            user: jwt.user,
            expiresAt: jwt.session.expiresAt.toISOString(),
        };
    }

    @Post('refresh')
    async refreshToken(
        @Cookies('refresh_token') refreshToken: string | undefined,
        @Res() res: Response,
    ) {
        if (!refreshToken) {
            throw new UnauthorizedException('No autenticado');
        }

        try {
            const {
                accessToken,
                refreshToken: newRefreshToken,
                user,
            } = await this.authService.refreshTokens(refreshToken);

            // Guardar nuevos tokens en cookies
            this.authService.setAuthCookies(res, accessToken, newRefreshToken);

            return res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                },
                expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            });
        } catch (error) {
            this.logger.error('Error refreshing token:', error);
            throw new UnauthorizedException('Sesión inválida o expirada');
        }
    }

    @Post('logout')
    @UseJwt()
    async logout(@JwtSession() session: JwtSessionType, @Res() res: Response) {
        await this.authService.revokeSession(session.id);
        this.authService.clearAuthCookies(res);
        return res.json({ success: true });
    }

    @Patch('profile')
    @UseJwt()
    @UseInterceptors(FileInterceptor('image'))
    updateProfile(
        @Jwt() jwt: JwtPayload,
        @Body() dto: UpdateProfileDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.authService.updateProfile(jwt.user.id, dto.name, file);
    }

    @Patch('change-password')
    @UseJwt()
    changePassword(
        @Jwt() jwt: JwtPayload,
        @Body() dto: ChangePasswordDto,
    ) {
        return this.authService.changePassword(
            jwt.user.id,
            dto.currentPassword,
            dto.newPassword,
        );
    }
}

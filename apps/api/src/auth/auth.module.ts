import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from 'src/prisma.service';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { ResendService } from 'src/resend.service';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { StorageModule } from 'src/storage/storage.module';

@Module({
    imports: [
        PassportModule,
        JwtModule.register({
            global: true,
            secret: jwtConstants.secret,
            signOptions: {
                expiresIn: '15m',
            },
        }),
        StorageModule,
    ],
    providers: [
        AuthService,
        PrismaService,
        GoogleOAuthGuard,
        GoogleStrategy,
        LocalStrategy,
        ResendService,
    ],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule {}

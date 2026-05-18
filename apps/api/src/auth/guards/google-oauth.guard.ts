import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
    constructor(private configService: ConfigService) {
        super({
            accessType: 'offline',
        });
    }

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const redirectUri = request.query.redirectUri as string | undefined;

        if (redirectUri) {
            request.redirectUri = redirectUri;
        }

        return super.canActivate(context);
    }
}

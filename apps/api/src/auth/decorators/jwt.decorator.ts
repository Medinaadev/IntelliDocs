import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { JwtGuard, JwtRequest } from '../guards/jwt.guard';

export type JwtUserType = JwtRequest['user'];
export type JwtSessionType = JwtRequest['session'];
export type JwtPayload = {
    user: JwtUserType;
    session: JwtSessionType;
};

const detectJwtGuard = (context: ExecutionContext, decoratorName: string) => {
    const request = context.switchToHttp().getRequest();

    if (request.user && request.session) {
        return true;
    }

    throw new UnauthorizedException(
        '@' +
            decoratorName +
            '() can only be used within a route protected by JwtGuard()',
    );
};

export const JwtUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<JwtRequest>();
        detectJwtGuard(ctx, 'JwtUser');
        return request.user;
    },
);

export const JwtSession = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<JwtRequest>();
        detectJwtGuard(ctx, 'JwtSession');
        return request.session;
    },
);

export const Jwt = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<JwtRequest>();
        detectJwtGuard(ctx, 'Jwt');
        return {
            user: request.user,
            session: request.session,
        };
    },
);

export const UseJwt = () => applyDecorators(UseGuards(JwtGuard));

import { days, minutes } from '@nestjs/throttler';

export const jwtConstants = {
    secret: 'Gu5UTNh9Mzd81OPUzdlbV33BRGhbZn4CQUm4yTQ2ow3',
    expiresIn: '15m', // Expira en 15 minutos
    accessTokenExpiration: minutes(15), // 15 minutos
    refreshTokenExpiration: days(30), // 30 días
};

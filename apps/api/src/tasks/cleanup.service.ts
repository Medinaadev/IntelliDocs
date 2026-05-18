import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class CleanupService {
    constructor(private readonly prisma: PrismaService) {}
    private readonly logger = new Logger(CleanupService.name);

    @Cron('0 */6 * * *') // Cada 6 horas
    async cleanupExpiredSessions() {
        const now = new Date();
        await this.prisma.session.deleteMany({
            where: {
                refreshTokenExpires: {
                    lt: now,
                },
            },
        });

        this.logger.log('Expired sessions cleaned up', 'CleanupService');
    }
}

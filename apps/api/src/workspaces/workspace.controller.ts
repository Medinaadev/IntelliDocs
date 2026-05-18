import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Logger,
    Param,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { JwtUser, JwtUserType } from 'src/auth/decorators/jwt.decorator';
import { PrismaService } from 'src/prisma.service';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { STORAGE_CONFIG } from 'src/storage/storage.config';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RenameWorkspaceDto } from './dto/rename-workspace.dto';
import { WorkspaceSubscriptionService } from 'src/stripe/workspace-subscription.service';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { getFrontendUrl } from 'src/lib/frontend';

@UseGuards(JwtGuard, WorkspaceMemberGuard)
@Controller('workspaces/:workspaceId')
export class WorkspaceController {
    private readonly logger = new Logger(WorkspaceController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly workspacesService: WorkspacesService,
        private readonly subscriptionService: WorkspaceSubscriptionService,
    ) {}

    // Imagen

    @Patch('image')
    @UseInterceptors(
        FileInterceptor('image', {
            limits: {
                fileSize: STORAGE_CONFIG.workspaceImage.maxSize,
            },
            fileFilter(req, file, callback) {
                if (
                    STORAGE_CONFIG.workspaceImage.allowedMimeTypes.includes(
                        file.mimetype,
                    )
                ) {
                    callback(null, true);
                } else {
                    callback(
                        new ForbiddenException(
                            `Tipo de archivo no válido. Permitidos: ${STORAGE_CONFIG.workspaceImage.allowedMimeTypes.join(', ')}`,
                        ),
                        false,
                    );
                }
            },
        }),
    )
    async uploadWorkspaceImage(
        @Param('workspaceId') workspaceId: string,
        @UploadedFile() file: Express.Multer.File,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspacesService.uploadImage(workspaceId, file, user.id);
    }

    // Configuración

    @Patch('name')
    renameWorkspace(
        @Param('workspaceId') workspaceId: string,
        @Body() dto: RenameWorkspaceDto,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspacesService.renameWorkspace(
            workspaceId,
            dto.name,
            user.id,
        );
    }

    @Delete()
    deleteWorkspace(
        @Param('workspaceId') workspaceId: string,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspacesService.deleteWorkspace(workspaceId, user.id);
    }

    @Post('leave')
    leaveWorkspace(
        @Param('workspaceId') workspaceId: string,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspacesService.leaveWorkspace(workspaceId, user.id);
    }

    // Suscripción

    @Get('subscription/prices')
    getPlanPrices() {
        return this.subscriptionService.getPlanPrices();
    }

    @Get('subscription')
    getSubscription(@Param('workspaceId') workspaceId: string) {
        return this.subscriptionService.getSubscription(workspaceId);
    }

    @Post('subscription/checkout')
    createCheckout(
        @Param('workspaceId') workspaceId: string,
        @Body() dto: CreateSubscriptionCheckoutDto,
        @JwtUser() user: JwtUserType,
    ) {
        return this.subscriptionService.createCheckoutSession(
            workspaceId,
            user.id,
            dto.plan,
            dto.successUrl,
            dto.cancelUrl,
        );
    }

    @Get('subscription/billing-portal')
    getBillingPortal(
        @Param('workspaceId') workspaceId: string,
        @Query('returnUrl') returnUrl: string,
        @JwtUser() user: JwtUserType,
    ) {
        const url = returnUrl ?? getFrontendUrl(`/dashboard/${workspaceId}/plans`);
        return this.subscriptionService.getBillingPortalUrl(
            workspaceId,
            user.id,
            url,
        );
    }

    @Post('subscription/sync')
    syncSubscription(
        @Param('workspaceId') workspaceId: string,
        @JwtUser() user: JwtUserType,
    ) {
        return this.subscriptionService.syncSubscriptionFromStripe(
            workspaceId,
            user.id,
        );
    }

    @Post('subscription/reactivate')
    reactivateSubscription(
        @Param('workspaceId') workspaceId: string,
        @JwtUser() user: JwtUserType,
    ) {
        return this.subscriptionService.reactivateSubscription(
            workspaceId,
            user.id,
        );
    }

    @Delete('subscription')
    cancelSubscription(
        @Param('workspaceId') workspaceId: string,
        @JwtUser() user: JwtUserType,
    ) {
        return this.subscriptionService.cancelSubscription(
            workspaceId,
            user.id,
            false,
        );
    }
}

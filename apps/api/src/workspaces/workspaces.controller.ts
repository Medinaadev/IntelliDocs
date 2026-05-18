import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    Logger,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtRequest } from 'src/auth/guards/jwt.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import {
    JwtUser,
    JwtUserType,
    UseJwt,
} from 'src/auth/decorators/jwt.decorator';
import { PrismaService } from 'src/prisma.service';
import { WorkspacesService } from './workspaces.service';
import { MAX_FREE_WORKSPACES } from './workspaces.config';
import { seconds, Throttle } from '@nestjs/throttler';
import { GetWorkspacesDto } from './dto/get-workspaces.dto';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';
import { JwtGuard } from 'src/auth/guards/jwt.guard';

@UseJwt()
@Controller('workspaces')
export class WorkspacesController {
    private readonly logger = new Logger(WorkspacesController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly workspacesService: WorkspacesService,
    ) {}

    @Throttle({ short: { limit: 10, ttl: seconds(60) } }) // Limitar a 10 solicitudes por minuto
    @Post('create')
    async createWorkspace(
        @Req() req: JwtRequest,
        @Body() createWorkspaceDto: CreateWorkspaceDto,
        @JwtUser() user: JwtUserType,
    ) {
        const { id: userId } = user;
        const { name, image } = createWorkspaceDto;

        this.logger.debug(
            `User ${userId} is creating a workspace with name "${name}" and image "${image}"`,
        );

        const freeWorkspacesCount =
            await this.workspacesService.getFreeWorkspacesCount(userId);

        console.log(
            'Free workspaces count for user',
            userId,
            ':',
            freeWorkspacesCount,
        ); // Agregar este log
        console.log('Max free workspaces allowed:', MAX_FREE_WORKSPACES); // Agregar este log

        if (freeWorkspacesCount >= MAX_FREE_WORKSPACES) {
            throw new ForbiddenException(
                `You have reached the limit of free workspaces (${freeWorkspacesCount}/${MAX_FREE_WORKSPACES}). Please delete an existing workspace or upgrade your plan to create more.`,
            );
        }

        const workspace = await this.workspacesService.createWorkspace(
            userId,
            name,
            image,
        );

        this.logger.debug(
            `Workspace "${name}" created successfully with ID ${workspace.id} for user ${userId}`,
        );
        return workspace;
    }

    @Get()
    async getWorkspaces(
        @JwtUser() { id: userId }: JwtUserType,
        @Query() query: GetWorkspacesDto,
    ) {
        const { memberCount, lastActiveAt } = query;

        const workspaces = await this.workspacesService.getWorkspacesByUserId(
            userId,
            { memberCount, lastActiveAt },
        );
        return { workspaces };
    }

    @UseGuards(JwtGuard, WorkspaceMemberGuard)
    @Get(':workspaceId/overview')
    getOverview(@Param('workspaceId') workspaceId: string) {
        return this.workspacesService.getWorkspaceOverview(workspaceId);
    }

    @UseGuards(JwtGuard, WorkspaceMemberGuard)
    @Get(':workspaceId/activity')
    getActivity(
        @Param('workspaceId') workspaceId: string,
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
    ) {
        return this.workspacesService.getActivity(
            workspaceId,
            limit ? parseInt(limit, 10) : 50,
            cursor,
        );
    }
}

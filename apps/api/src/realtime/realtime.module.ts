import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

@Module({
    imports: [DiscoveryModule, JwtModule.register({})],
    providers: [RealtimeGateway, RealtimeService],
    exports: [RealtimeService],
})
export class RealtimeModule {}

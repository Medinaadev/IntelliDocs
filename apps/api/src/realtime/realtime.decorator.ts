import { SetMetadata } from '@nestjs/common';
import { REALTIME_CHANNEL_METADATA } from './realtime.types';

export const RegisterRealtimeChannel = (channelName: string) =>
    SetMetadata(REALTIME_CHANNEL_METADATA, channelName);

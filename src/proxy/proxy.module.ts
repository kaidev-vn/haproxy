import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';
import { ConfigService } from '../config/config.service';

@Module({
  controllers: [ProxyController],
  providers: [ProxyService, ConfigService],
  exports: [ProxyService, ConfigService],
})
export class ProxyModule {}
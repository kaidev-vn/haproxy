import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ConfigService } from '../config/config.service';
import { ProxyService } from '../proxy/proxy.service';

@Module({
  controllers: [AdminController],
  providers: [ConfigService, ProxyService],
})
export class AdminModule {}
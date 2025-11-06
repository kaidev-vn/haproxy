import { Controller, Get, Render } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('index')
  getHome() {
    return {
      title: 'NestJS Proxy Server',
      message: 'Chào mừng đến với Proxy Server!',
    };
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}
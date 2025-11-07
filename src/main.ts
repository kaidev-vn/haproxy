import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  
  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));
  
  // Serve static files for web interface
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Proxy Server đang chạy tại: http://localhost:${port}`);
  console.log(`📊 Giao diện quản lý: http://localhost:${port}/admin`);
}

bootstrap();
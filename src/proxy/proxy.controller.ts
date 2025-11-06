import { Controller, All, Param, Req, Res, Get, Post, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { ConfigService } from '../config/config.service';

@Controller('proxy')
export class ProxyController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly configService: ConfigService
  ) {}

  // Route chính để proxy requests: /proxy/{projectName}/*
  @All(':projectName/*')
  async proxyWithPath(
    @Param('projectName') projectName: string,
    @Req() request: Request,
    @Res() response: Response
  ) {
    // Extract path sau projectName
    const fullPath = request.url;
    const projectPath = `/proxy/${projectName}`;
    const targetPath = fullPath.replace(projectPath, '') || '/';
    
    await this.proxyService.forwardRequest(projectName, request, response, targetPath);
  }

  // Route cho requests đến root của project: /proxy/{projectName}
  @All(':projectName')
  async proxyRoot(
    @Param('projectName') projectName: string,
    @Req() request: Request,
    @Res() response: Response
  ) {
    await this.proxyService.forwardRequest(projectName, request, response, '/');
  }

  // API để test connection đến target server
  @Post('test/:projectName')
  async testConnection(@Param('projectName') projectName: string) {
    return await this.proxyService.testConnection(projectName);
  }

  // API để lấy danh sách projects có thể proxy
  @Get('projects')
  getAvailableProjects() {
    const configs = this.configService.getEnabledConfigs();
    return {
      projects: configs.map(config => ({
        projectName: config.projectName,
        description: config.description,
        target: `${config.target.protocol}://${config.target.host}:${config.target.port}`,
        enabled: config.enabled,
        customHeaders: Object.keys(config.customHeaders)
      })),
      total: configs.length
    };
  }

  // API để lấy thông tin chi tiết của một project
  @Get('projects/:projectName')
  getProjectInfo(@Param('projectName') projectName: string) {
    const config = this.configService.getConfigByProjectName(projectName);
    if (!config) {
      return {
        error: `Project '${projectName}' không tồn tại`,
        available: false
      };
    }

    return {
      projectName: config.projectName,
      description: config.description,
      target: {
        url: `${config.target.protocol}://${config.target.host}:${config.target.port}`,
        host: config.target.host,
        port: config.target.port,
        protocol: config.target.protocol
      },
      customHeaders: config.customHeaders,
      enabled: config.enabled,
      available: true,
      proxyUrl: `/proxy/${projectName}`,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    };
  }
}
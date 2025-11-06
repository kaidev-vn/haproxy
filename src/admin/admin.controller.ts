import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Render,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ConflictException
} from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { CreateProxyConfigDto, UpdateProxyConfigDto } from '../common/dto/proxy-config.dto';
import { ProxyService } from '../proxy/proxy.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly configService: ConfigService,
    private readonly proxyService: ProxyService
  ) {}

  // Giao diện quản lý
  @Get()
  @Render('admin')
  getAdminPanel() {
    const configs = this.configService.getAllConfigs();
    return {
      title: 'Quản lý Proxy Server',
      configs,
      totalConfigs: configs.length,
      enabledConfigs: configs.filter(c => c.enabled).length
    };
  }

  // API: Lấy tất cả cấu hình
  @Get('api/configs')
  getAllConfigs() {
    const configs = this.configService.getAllConfigs();
    return {
      success: true,
      data: configs,
      total: configs.length,
      enabled: configs.filter(c => c.enabled).length
    };
  }

  // API: Lấy cấu hình theo project name
  @Get('api/configs/:projectName')
  getConfig(@Param('projectName') projectName: string) {
    const config = this.configService.getConfigByProjectName(projectName);
    if (!config) {
      throw new NotFoundException(`Không tìm thấy cấu hình cho project: ${projectName}`);
    }
    return {
      success: true,
      data: config
    };
  }

  // API: Tạo cấu hình mới
  @Post('api/configs')
  @HttpCode(HttpStatus.CREATED)
  createConfig(@Body() createDto: CreateProxyConfigDto) {
    // Kiểm tra project đã tồn tại chưa
    if (this.configService.isProjectExists(createDto.projectName)) {
      throw new ConflictException(`Project '${createDto.projectName}' đã tồn tại`);
    }

    const config = this.configService.createConfig(createDto);
    return {
      success: true,
      message: `Đã tạo cấu hình cho project '${createDto.projectName}'`,
      data: config
    };
  }

  // API: Cập nhật cấu hình
  @Put('api/configs/:projectName')
  updateConfig(
    @Param('projectName') projectName: string,
    @Body() updateDto: UpdateProxyConfigDto
  ) {
    // Kiểm tra nếu đổi tên project và tên mới đã tồn tại
    if (updateDto.projectName && 
        updateDto.projectName !== projectName && 
        this.configService.isProjectExists(updateDto.projectName)) {
      throw new ConflictException(`Project '${updateDto.projectName}' đã tồn tại`);
    }

    const config = this.configService.updateConfig(projectName, updateDto);
    return {
      success: true,
      message: `Đã cập nhật cấu hình cho project '${projectName}'`,
      data: config
    };
  }

  // API: Xóa cấu hình
  @Delete('api/configs/:projectName')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteConfig(@Param('projectName') projectName: string) {
    const deleted = this.configService.deleteConfig(projectName);
    if (!deleted) {
      throw new NotFoundException(`Không tìm thấy cấu hình cho project: ${projectName}`);
    }
    return {
      success: true,
      message: `Đã xóa cấu hình cho project '${projectName}'`
    };
  }

  // API: Test kết nối đến target server
  @Post('api/configs/:projectName/test')
  async testConnection(@Param('projectName') projectName: string) {
    const result = await this.proxyService.testConnection(projectName);
    return {
      success: result.success,
      message: result.message,
      responseTime: result.responseTime,
      projectName
    };
  }

  // API: Toggle enable/disable config
  @Post('api/configs/:projectName/toggle')
  toggleConfig(@Param('projectName') projectName: string) {
    const config = this.configService.getConfigByProjectName(projectName);
    if (!config) {
      throw new NotFoundException(`Không tìm thấy cấu hình cho project: ${projectName}`);
    }

    const updatedConfig = this.configService.updateConfig(projectName, {
      enabled: !config.enabled
    });

    return {
      success: true,
      message: `Đã ${updatedConfig.enabled ? 'kích hoạt' : 'vô hiệu hóa'} project '${projectName}'`,
      data: updatedConfig
    };
  }

  // API: Lấy thống kê
  @Get('api/stats')
  getStats() {
    const allConfigs = this.configService.getAllConfigs();
    const enabledConfigs = allConfigs.filter(c => c.enabled);
    
    return {
      success: true,
      data: {
        total: allConfigs.length,
        enabled: enabledConfigs.length,
        disabled: allConfigs.length - enabledConfigs.length,
        projects: allConfigs.map(c => ({
          name: c.projectName,
          enabled: c.enabled,
          target: `${c.target.host}:${c.target.port}`,
          description: c.description
        }))
      }
    };
  }

  // API: Bulk operations
  @Post('api/configs/bulk/enable')
  bulkEnable(@Body('projectNames') projectNames: string[]) {
    const results = [];
    
    for (const projectName of projectNames) {
      try {
        const config = this.configService.updateConfig(projectName, { enabled: true });
        results.push({ projectName, success: true, config });
      } catch (error) {
        results.push({ projectName, success: false, error: error.message });
      }
    }

    return {
      success: true,
      message: `Đã xử lý ${projectNames.length} projects`,
      results
    };
  }

  @Post('api/configs/bulk/disable')
  bulkDisable(@Body('projectNames') projectNames: string[]) {
    if (!projectNames || !Array.isArray(projectNames)) {
      return {
        success: false,
        message: 'Danh sách project names không hợp lệ'
      };
    }

    const results = projectNames.map(projectName => {
      try {
        const config = this.configService.updateConfig(projectName, { enabled: false });
        return { projectName, success: true, config };
      } catch (error) {
        return { projectName, success: false, error: error.message };
      }
    });

    return {
      success: true,
      message: `Đã vô hiệu hóa ${results.filter(r => r.success).length}/${projectNames.length} cấu hình`,
      results
    };
  }

  // API: Reload cấu hình từ file
  @Post('api/configs/reload')
  reloadConfigs() {
    const result = this.configService.reloadConfigs();
    return {
      success: result.success,
      message: result.message,
      data: {
        configCount: result.configCount,
        timestamp: new Date().toISOString()
      }
    };
  }

  // API: Backup cấu hình hiện tại
  @Post('api/configs/backup')
  backupConfigs() {
    const result = this.configService.backupConfigs();
    return {
      success: result.success,
      message: result.message,
      data: {
        backupPath: result.backupPath,
        timestamp: new Date().toISOString()
      }
    };
  }

  // API: Import cấu hình từ file JSON
  @Post('api/configs/import')
  importConfigs(@Body() importData: { configs: any[], overwrite?: boolean }) {
    try {
      const { configs, overwrite = false } = importData;
      
      if (!configs || !Array.isArray(configs)) {
        return {
          success: false,
          message: 'Dữ liệu import không hợp lệ'
        };
      }

      const results = [];
      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (const configData of configs) {
        try {
          const exists = this.configService.isProjectExists(configData.projectName);
          
          if (exists && !overwrite) {
            results.push({
              projectName: configData.projectName,
              status: 'skipped',
              message: 'Project đã tồn tại'
            });
            skipped++;
            continue;
          }

          if (exists && overwrite) {
            // Update existing config
            const updatedConfig = this.configService.updateConfig(configData.projectName, {
              targetHost: configData.targetHost,
              targetPort: configData.targetPort,
              customHeaders: configData.customHeaders,
              enabled: configData.enabled,
              description: configData.description
            });
            results.push({
              projectName: configData.projectName,
              status: 'updated',
              config: updatedConfig
            });
          } else {
            // Create new config
            const newConfig = this.configService.createConfig({
              projectName: configData.projectName,
              targetHost: configData.targetHost,
              targetPort: configData.targetPort,
              customHeaders: configData.customHeaders,
              enabled: configData.enabled,
              description: configData.description
            });
            results.push({
              projectName: configData.projectName,
              status: 'created',
              config: newConfig
            });
          }
          imported++;
        } catch (error) {
          results.push({
            projectName: configData.projectName,
            status: 'error',
            message: error.message
          });
          errors++;
        }
      }

      return {
        success: true,
        message: `Import hoàn thành: ${imported} imported, ${skipped} skipped, ${errors} errors`,
        data: {
          imported,
          skipped,
          errors,
          results
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Lỗi khi import cấu hình: ${error.message}`
      };
    }
  }

  // API: Export cấu hình hiện tại
  @Get('api/configs/export')
  exportConfigs() {
    try {
      const configs = this.configService.getAllConfigs();
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        configs: configs.map(config => ({
          projectName: config.projectName,
          targetHost: config.target.host,
          targetPort: config.target.port,
          customHeaders: config.customHeaders,
          enabled: config.enabled,
          description: config.description
        }))
      };

      return {
        success: true,
        message: 'Export cấu hình thành công',
        data: exportData
      };
    } catch (error) {
      return {
        success: false,
        message: `Lỗi khi export cấu hình: ${error.message}`
      };
    }
  }
}
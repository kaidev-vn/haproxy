import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { ProxyRule } from '../common/interfaces/proxy-config.interface';
import { CreateProxyConfigDto, UpdateProxyConfigDto } from '../common/dto/proxy-config.dto';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ConfigService implements OnModuleDestroy {
  private proxyConfigs: Map<string, ProxyRule> = new Map();
  private readonly configFilePath: string;
  private fileWatcher: fs.FSWatcher | null = null;

  constructor() {
    this.configFilePath = path.join(process.cwd(), 'config', 'proxy-configs.json');
    this.loadConfigsFromFile();
    this.setupFileWatcher();
  }

  private setupFileWatcher(): void {
    try {
      // Đảm bảo thư mục config tồn tại
      const configDir = path.dirname(this.configFilePath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Tạo file watcher
      this.fileWatcher = fs.watch(this.configFilePath, (eventType, filename) => {
        if (eventType === 'change' && filename) {
          console.log('🔄 Phát hiện thay đổi file config, đang reload...');
          setTimeout(() => {
            this.reloadConfigs();
          }, 100); // Delay nhỏ để đảm bảo file đã được ghi xong
        }
      });

      console.log('👁️ File watcher đã được thiết lập cho:', this.configFilePath);
    } catch (error) {
      console.error('❌ Lỗi khi thiết lập file watcher:', error.message);
    }
  }

  onModuleDestroy(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      console.log('🔒 File watcher đã được đóng');
    }
  }

  private loadConfigsFromFile(): void {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const fileContent = fs.readFileSync(this.configFilePath, 'utf8');
        const configData = JSON.parse(fileContent);
        
        if (configData.configs && Array.isArray(configData.configs)) {
          configData.configs.forEach((config: any) => {
            const proxyRule: ProxyRule = {
              id: config.id,
              projectName: config.projectName,
              target: {
                host: config.targetHost,
                port: config.targetPort,
                protocol: 'http'
              },
              customHeaders: config.customHeaders || {},
              enabled: config.enabled ?? true,
              description: config.description,
              createdAt: new Date(config.createdAt),
              updatedAt: new Date(config.updatedAt)
            };
            this.proxyConfigs.set(config.projectName, proxyRule);
          });
        }
        console.log(`✅ Đã tải ${this.proxyConfigs.size} cấu hình proxy từ file`);
      } else {
        console.log('⚠️ File cấu hình không tồn tại, sử dụng cấu hình mặc định');
        this.initializeDefaultConfigs();
      }
    } catch (error) {
      console.error('❌ Lỗi khi đọc file cấu hình:', error.message);
      this.initializeDefaultConfigs();
    }
  }

  private saveConfigsToFile(): void {
    try {
      const configData = {
        configs: Array.from(this.proxyConfigs.values()).map(config => ({
          id: config.id,
          projectName: config.projectName,
          targetHost: config.target.host,
          targetPort: config.target.port,
          customHeaders: config.customHeaders,
          enabled: config.enabled,
          description: config.description,
          createdAt: config.createdAt.toISOString(),
          updatedAt: config.updatedAt.toISOString()
        }))
      };
      
      // Tạo thư mục config nếu chưa tồn tại
      const configDir = path.dirname(this.configFilePath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(this.configFilePath, JSON.stringify(configData, null, 2), 'utf8');
      console.log('✅ Đã lưu cấu hình vào file');
    } catch (error) {
      console.error('❌ Lỗi khi lưu file cấu hình:', error.message);
    }
  }

  private initializeDefaultConfigs(): void {
    // Fallback khi không đọc được file
    const defaultConfigs: CreateProxyConfigDto[] = [
      {
        projectName: 'api-gateway',
        targetHost: 'localhost',
        targetPort: 8080,
        customHeaders: {
          'X-Forwarded-By': 'nestjs-proxy',
          'X-Project': 'api-gateway'
        },
        enabled: true,
        description: 'API Gateway Service'
      }
    ];

    defaultConfigs.forEach(config => {
      this.createConfig(config, false); // false = không lưu file
    });
  }

  createConfig(createDto: CreateProxyConfigDto, saveToFile: boolean = true): ProxyRule {
    const id = uuidv4();
    const now = new Date();
    
    const config: ProxyRule = {
      id,
      projectName: createDto.projectName,
      target: {
        host: createDto.targetHost,
        port: createDto.targetPort,
        protocol: 'http'
      },
      customHeaders: createDto.customHeaders || {},
      enabled: createDto.enabled ?? true,
      description: createDto.description,
      createdAt: now,
      updatedAt: now
    };

    this.proxyConfigs.set(createDto.projectName, config);
    
    if (saveToFile) {
      this.saveConfigsToFile();
    }
    
    return config;
  }

  getAllConfigs(): ProxyRule[] {
    return Array.from(this.proxyConfigs.values());
  }

  getConfigByProjectName(projectName: string): ProxyRule | undefined {
    return this.proxyConfigs.get(projectName);
  }

  updateConfig(projectName: string, updateDto: UpdateProxyConfigDto): ProxyRule {
    const existingConfig = this.proxyConfigs.get(projectName);
    if (!existingConfig) {
      throw new NotFoundException(`Không tìm thấy cấu hình cho project: ${projectName}`);
    }

    const updatedConfig: ProxyRule = {
      ...existingConfig,
      projectName: updateDto.projectName || existingConfig.projectName,
      target: {
        ...existingConfig.target,
        host: updateDto.targetHost || existingConfig.target.host,
        port: updateDto.targetPort || existingConfig.target.port
      },
      customHeaders: updateDto.customHeaders || existingConfig.customHeaders,
      enabled: updateDto.enabled ?? existingConfig.enabled,
      description: updateDto.description || existingConfig.description,
      updatedAt: new Date()
    };

    // Nếu projectName thay đổi, cần xóa key cũ và tạo key mới
    if (updateDto.projectName && updateDto.projectName !== projectName) {
      this.proxyConfigs.delete(projectName);
      this.proxyConfigs.set(updateDto.projectName, updatedConfig);
    } else {
      this.proxyConfigs.set(projectName, updatedConfig);
    }

    // Lưu thay đổi vào file
    this.saveConfigsToFile();

    return updatedConfig;
  }

  deleteConfig(projectName: string): boolean {
    const deleted = this.proxyConfigs.delete(projectName);
    
    if (deleted) {
      // Lưu thay đổi vào file
      this.saveConfigsToFile();
    }
    
    return deleted;
  }

  getEnabledConfigs(): ProxyRule[] {
    return this.getAllConfigs().filter(config => config.enabled);
  }

  isProjectExists(projectName: string): boolean {
    return this.proxyConfigs.has(projectName);
  }

  getTargetUrl(projectName: string): string | null {
    const config = this.getConfigByProjectName(projectName);
    if (!config || !config.enabled) {
      return null;
    }
    
    return `${config.target.protocol}://${config.target.host}:${config.target.port}`;
  }

  getCustomHeaders(projectName: string): Record<string, string> {
    const config = this.getConfigByProjectName(projectName);
    return config?.customHeaders || {};
  }

  // Phương thức để reload cấu hình từ file
  reloadConfigs(): { success: boolean; message: string; configCount: number } {
    try {
      this.proxyConfigs.clear();
      this.loadConfigsFromFile();
      return {
        success: true,
        message: 'Đã reload cấu hình thành công',
        configCount: this.proxyConfigs.size
      };
    } catch (error) {
      return {
        success: false,
        message: `Lỗi khi reload cấu hình: ${error.message}`,
        configCount: 0
      };
    }
  }

  // Phương thức để backup cấu hình hiện tại
  backupConfigs(): { success: boolean; message: string; backupPath?: string } {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = this.configFilePath.replace('.json', `_backup_${timestamp}.json`);
      
      const configData = {
        configs: Array.from(this.proxyConfigs.values()).map(config => ({
          id: config.id,
          projectName: config.projectName,
          targetHost: config.target.host,
          targetPort: config.target.port,
          customHeaders: config.customHeaders,
          enabled: config.enabled,
          description: config.description,
          createdAt: config.createdAt.toISOString(),
          updatedAt: config.updatedAt.toISOString()
        }))
      };
      
      fs.writeFileSync(backupPath, JSON.stringify(configData, null, 2), 'utf8');
      
      return {
        success: true,
        message: 'Đã backup cấu hình thành công',
        backupPath
      };
    } catch (error) {
      return {
        success: false,
        message: `Lỗi khi backup cấu hình: ${error.message}`
      };
    }
  }
}
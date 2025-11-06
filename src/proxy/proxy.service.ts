import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { Request, Response } from 'express';

@Injectable()
export class ProxyService {
  constructor(private readonly configService: ConfigService) {}

  async forwardRequest(
    projectName: string,
    originalRequest: Request,
    response: Response,
    path?: string
  ): Promise<void> {
    // Kiểm tra project có tồn tại và được kích hoạt không
    const targetUrl = this.configService.getTargetUrl(projectName);
    if (!targetUrl) {
      throw new BadRequestException(
        `Project '${projectName}' không tồn tại hoặc đã bị vô hiệu hóa`
      );
    }

    // Lấy custom headers cho project
    const customHeaders = this.configService.getCustomHeaders(projectName);

    try {
      // Chuẩn bị URL đích
      const targetPath = path || originalRequest.url.replace(`/proxy/${projectName}`, '') || '/';
      const fullTargetUrl = `${targetUrl}${targetPath}`;

      // Chuẩn bị headers
      const forwardedHeaders = this.prepareHeaders(originalRequest, customHeaders);

      // Cấu hình axios request
      const axiosConfig: AxiosRequestConfig = {
        method: originalRequest.method as any,
        url: fullTargetUrl,
        headers: forwardedHeaders,
        timeout: 30000, // 30 seconds timeout
        validateStatus: () => true, // Accept all status codes
      };

      // Thêm body cho POST, PUT, PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(originalRequest.method.toUpperCase())) {
        axiosConfig.data = originalRequest.body;
      }

      // Thêm query parameters
      if (originalRequest.query && Object.keys(originalRequest.query).length > 0) {
        axiosConfig.params = originalRequest.query;
      }

      console.log(`🔄 Forwarding ${originalRequest.method} ${originalRequest.url} -> ${fullTargetUrl}`);
      console.log(`📋 Headers:`, forwardedHeaders);

      // Thực hiện request
      const axiosResponse: AxiosResponse = await axios(axiosConfig);

      // Forward response headers (loại bỏ một số headers không cần thiết)
      const responseHeaders = this.filterResponseHeaders(axiosResponse.headers);
      Object.entries(responseHeaders).forEach(([key, value]) => {
        response.setHeader(key, value);
      });

      // Set status code và response body
      response.status(axiosResponse.status);
      response.send(axiosResponse.data);

      console.log(`✅ Response: ${axiosResponse.status} ${axiosResponse.statusText}`);
    } catch (error) {
      console.error(`❌ Proxy Error for ${projectName}:`, error.message);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new ServiceUnavailableException(
          `Không thể kết nối đến server của project '${projectName}'. Vui lòng kiểm tra server đích.`
        );
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new ServiceUnavailableException(
          `Timeout khi kết nối đến server của project '${projectName}'.`
        );
      }

      throw new ServiceUnavailableException(
        `Lỗi khi chuyển tiếp request đến project '${projectName}': ${error.message}`
      );
    }
  }

  private prepareHeaders(
    originalRequest: Request,
    customHeaders: Record<string, string>
  ): Record<string, string> {
    // Bắt đầu với headers từ request gốc
    const headers: Record<string, string> = {};
    
    // Copy headers từ request gốc (loại bỏ một số headers không cần thiết)
    Object.entries(originalRequest.headers).forEach(([key, value]) => {
      if (this.shouldForwardHeader(key)) {
        headers[key] = Array.isArray(value) ? value.join(', ') : value;
      }
    });

    // Thêm thông tin forwarding
    headers['X-Forwarded-For'] = this.getClientIp(originalRequest);
    headers['X-Forwarded-Proto'] = originalRequest.protocol;
    headers['X-Forwarded-Host'] = originalRequest.get('host') || 'unknown';
    headers['X-Real-IP'] = this.getClientIp(originalRequest);
    
    // Thêm custom headers (sẽ override headers hiện tại nếu trùng key)
    Object.entries(customHeaders).forEach(([key, value]) => {
      headers[key] = value;
    });

    return headers;
  }

  private shouldForwardHeader(headerName: string): boolean {
    const lowerHeaderName = headerName.toLowerCase();
    
    // Danh sách headers không nên forward
    const skipHeaders = [
      'host',
      'connection',
      'upgrade',
      'proxy-connection',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers',
      'transfer-encoding'
    ];

    return !skipHeaders.includes(lowerHeaderName);
  }

  private filterResponseHeaders(headers: Record<string, any>): Record<string, any> {
    const filtered: Record<string, any> = {};
    
    // Danh sách headers không nên forward về client
    const skipHeaders = [
      'connection',
      'upgrade',
      'proxy-connection',
      'transfer-encoding'
    ];

    Object.entries(headers).forEach(([key, value]) => {
      if (!skipHeaders.includes(key.toLowerCase())) {
        filtered[key] = value;
      }
    });

    return filtered;
  }

  private getClientIp(request: Request): string {
    return (
      request.headers['x-forwarded-for'] as string ||
      request.headers['x-real-ip'] as string ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  // Method để test connection đến target server
  async testConnection(projectName: string): Promise<{ success: boolean; message: string; responseTime?: number }> {
    const targetUrl = this.configService.getTargetUrl(projectName);
    if (!targetUrl) {
      return {
        success: false,
        message: `Project '${projectName}' không tồn tại hoặc đã bị vô hiệu hóa`
      };
    }

    try {
      const startTime = Date.now();
      const response = await axios.get(`${targetUrl}/health`, {
        timeout: 5000,
        validateStatus: () => true
      });
      const responseTime = Date.now() - startTime;

      return {
        success: response.status < 500,
        message: `Connection successful. Status: ${response.status}`,
        responseTime
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }
}
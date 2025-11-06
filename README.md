# NestJS Proxy Server

🚀 **Proxy Server mạnh mẽ được xây dựng bằng NestJS** - Chuyển tiếp request dựa trên project name với custom headers và giao diện quản lý thân thiện.

## ✨ Tính năng chính

- 🔄 **Smart Routing**: Chuyển tiếp request dựa trên project name
- 🏷️ **Custom Headers**: Tự động thêm custom headers cho mỗi project
- 🎛️ **Web Interface**: Giao diện quản lý cấu hình trực quan
- ⚡ **Real-time Management**: CRUD cấu hình proxy trong thời gian thực
- 🔍 **Connection Testing**: Kiểm tra kết nối đến target servers
- 📊 **Statistics**: Thống kê và monitoring
- 🛡️ **Error Handling**: Xử lý lỗi chi tiết và thông báo rõ ràng

## 🏗️ Kiến trúc

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client        │───▶│  Proxy Server   │───▶│  Target Server  │
│                 │    │  (NestJS)       │    │  (Your Apps)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Web Interface  │
                       │  (Management)   │
                       └─────────────────┘
```

## 🚀 Cài đặt và chạy

### Yêu cầu hệ thống
- Node.js >= 16.x
- npm >= 8.x

### Cài đặt dependencies

```bash
npm install
```

### Cấu hình môi trường

```bash
cp .env.example .env
```

Chỉnh sửa file `.env` theo nhu cầu:

```env
PORT=3000
NODE_ENV=development
PROXY_TIMEOUT=30000
MAX_REDIRECTS=5
CORS_ORIGIN=*
CORS_CREDENTIALS=true
LOG_LEVEL=info
LOG_FORMAT=combined
```

### Chạy ứng dụng

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

Server sẽ chạy tại: `http://localhost:3000`

## 📖 Cách sử dụng

### 1. Truy cập giao diện quản lý

Mở trình duyệt và truy cập: `http://localhost:3000/admin`

### 2. Thêm cấu hình proxy mới

1. Click nút **"Thêm Project"**
2. Điền thông tin:
   - **Tên Project**: Tên duy nhất cho project
   - **Target Host**: IP/domain của server đích
   - **Target Port**: Port của server đích
   - **Custom Headers**: Headers tùy chỉnh (optional)
   - **Mô tả**: Mô tả project (optional)
3. Click **"Lưu"**

### 3. Sử dụng proxy

Sau khi cấu hình, bạn có thể proxy request bằng cách:

```bash
# Proxy đến project "api-gateway"
curl http://localhost:3000/proxy/api-gateway/users

# Proxy với path cụ thể
curl http://localhost:3000/proxy/user-service/api/v1/profile

# POST request
curl -X POST http://localhost:3000/proxy/order-service/orders \
  -H "Content-Type: application/json" \
  -d '{"product_id": 123, "quantity": 2}'
```

## 🔧 API Endpoints

### Proxy Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `ALL` | `/proxy/{project-name}/*` | Proxy request đến project |
| `GET` | `/proxy/projects` | Lấy danh sách projects |
| `GET` | `/proxy/projects/{project-name}` | Thông tin chi tiết project |
| `POST` | `/proxy/test/{project-name}` | Test kết nối |

### Admin API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/admin/api/configs` | Lấy tất cả cấu hình |
| `GET` | `/admin/api/configs/{project-name}` | Lấy cấu hình theo project |
| `POST` | `/admin/api/configs` | Tạo cấu hình mới |
| `PUT` | `/admin/api/configs/{project-name}` | Cập nhật cấu hình |
| `DELETE` | `/admin/api/configs/{project-name}` | Xóa cấu hình |
| `POST` | `/admin/api/configs/{project-name}/toggle` | Bật/tắt project |
| `POST` | `/admin/api/configs/{project-name}/test` | Test kết nối |
| `GET` | `/admin/api/stats` | Thống kê |

## 📝 Ví dụ cấu hình

### Cấu hình mẫu cho API Gateway

```json
{
  "projectName": "api-gateway",
  "targetHost": "localhost",
  "targetPort": 8080,
  "customHeaders": {
    "X-Forwarded-By": "nestjs-proxy",
    "X-Project": "api-gateway",
    "X-Environment": "development"
  },
  "enabled": true,
  "description": "Main API Gateway Service"
}
```

### Cấu hình cho Microservice

```json
{
  "projectName": "user-service",
  "targetHost": "192.168.1.100",
  "targetPort": 3001,
  "customHeaders": {
    "X-Service": "user-management",
    "X-Version": "v1.0.0"
  },
  "enabled": true,
  "description": "User Management Microservice"
}
```

## 🔍 Monitoring và Logging

### Health Check

Kiểm tra trạng thái server:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "message": "Proxy Server đang hoạt động bình thường"
}
```

### Logs

Server sẽ log các thông tin quan trọng:

```
🔄 Forwarding GET /proxy/api-gateway/users -> http://localhost:8080/users
📋 Headers: {"X-Forwarded-By":"nestjs-proxy","X-Project":"api-gateway"}
✅ Response: 200 OK
```

## 🛠️ Development

### Cấu trúc thư mục

```
src/
├── admin/              # Admin module (quản lý cấu hình)
│   ├── admin.controller.ts
│   └── admin.module.ts
├── common/             # Shared DTOs và interfaces
│   ├── dto/
│   └── interfaces/
├── config/             # Configuration service
│   └── config.service.ts
├── proxy/              # Proxy module (core logic)
│   ├── proxy.controller.ts
│   ├── proxy.service.ts
│   └── proxy.module.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts

views/                  # Handlebars templates
├── admin.hbs          # Admin interface
└── index.hbs          # Home page

public/                # Static assets
└── (CSS, JS, images)
```

### Chạy tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Build cho production

```bash
npm run build
```

## 🔒 Security

### Headers Security

Server tự động thêm các security headers:

- `X-Forwarded-For`: IP của client
- `X-Forwarded-Proto`: Protocol (http/https)
- `X-Forwarded-Host`: Host gốc
- `X-Real-IP`: IP thực của client

### CORS Configuration

Cấu hình CORS trong file `.env`:

```env
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
CORS_CREDENTIALS=true
```

## 🚨 Troubleshooting

### Lỗi thường gặp

1. **Connection Refused**
   ```
   ❌ Proxy Error: ECONNREFUSED
   ```
   - Kiểm tra target server có đang chạy không
   - Verify host và port trong cấu hình

2. **Timeout**
   ```
   ❌ Proxy Error: ECONNABORTED
   ```
   - Tăng `PROXY_TIMEOUT` trong `.env`
   - Kiểm tra network connectivity

3. **Project Not Found**
   ```
   ❌ Project 'xyz' không tồn tại hoặc đã bị vô hiệu hóa
   ```
   - Kiểm tra tên project trong URL
   - Verify project đã được enable

### Debug Mode

Chạy với debug mode:

```bash
npm run start:debug
```

## 📄 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

## 📞 Support

Nếu bạn gặp vấn đề hoặc có câu hỏi, vui lòng:

1. Kiểm tra [Troubleshooting](#-troubleshooting)
2. Tạo [Issue](https://github.com/your-repo/issues) mới
3. Liên hệ qua email: your-email@example.com

---

**Được xây dựng với ❤️ bằng NestJS**
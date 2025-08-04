# CFCDN - Cloudflare Workers 文件上传服务

一个基于 Cloudflare Workers 的文件上传服务，支持拖拽上传到第三方CDN。

## 功能特性

- 🚀 基于 Cloudflare Workers 部署，快速稳定
- 📁 支持拖拽上传和点击选择文件
- 🔄 支持多文件批量上传
- 📱 响应式设计，支持移动端
- 🎨 现代化UI界面
- 🔗 自动生成CDN链接
- 📋 一键复制链接功能

## 部署方式

### Cloudflare Workers 部署

1. 安装依赖：
```bash
npm install
```

2. 本地开发：
```bash
npm run dev
```

3. 部署到 Cloudflare Workers：
```bash
npm run deploy
```

## 技术栈

- **Cloudflare Workers** - 边缘计算平台
- **Hono** - 轻量级Web框架
- **TypeScript** - 类型安全的JavaScript
- **HTML5 File API** - 文件上传处理

## API 接口

### 文件上传
- **POST** `/upload` - 上传文件到CDN
- **GET** `/link` - 获取纯文本链接

## 免责声明

1. 本服务仅供学习和测试使用，请勿上传违法、侵权或敏感内容。
2. 文件由第三方CDN存储，本站不保证永久可用性。
3. 请勿上传涉及隐私、商业机密或其他受法律保护的内容。
4. 使用本服务即表示您同意承担所有相关责任。

## 许可证

MIT License
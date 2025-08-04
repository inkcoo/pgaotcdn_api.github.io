# Cloudflare Workers托管免费文件上传服务

一个托管在 Cloudflare Workers 上的免费文件上传服务。基于<a href="https://github.com/inkcoo/pgaotcdn_api" target="_blank">inkcoo/pgaotcdn_api</a>项目修改为Hono框架在Cloudflare Workers上部署.

## 功能特性

- 🚀 基于 Cloudflare Workers 部署，优选IP支持快速稳定
- 📁 支持拖拽上传和点击选择文件
- 🔄 支持多文件批量上传
- 📱 响应式设计，支持移动端
- 🎨 现代化UI界面
- 🔗 自动生成CDN链接
- 📋 一键复制链接功能
- 可生成纯文本链接

## 部署方式

### Cloudflare Workers 部署

1.构建命令: (留空)

2.部署命令: npm run deploy
## 技术栈

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

GPL-3.0

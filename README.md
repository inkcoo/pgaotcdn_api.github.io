# Cloudflare CDN 文件上传服务

这个项目提供了一个简单的文件上传服务，可以将文件上传到第三方 CDN，并在 Cloudflare Pages 上运行。

## 功能特点

- 基于 Hono 框架构建，专为 Cloudflare Workers 优化
- 支持跨域请求
- 模拟真实浏览器请求头
- 自动处理文件扩展名
- 简单易用的前端界面

## 部署到 Cloudflare Pages

1. 将此仓库推送到 GitHub
2. 在 Cloudflare Pages 控制台中创建新项目
3. 连接到您的 GitHub 仓库
4. 设置构建配置：
   - 构建命令：`npm run build`
   - 输出目录：`dist`
5. 部署！

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## API 端点

### 上传文件

```
POST /api/upload

表单数据：
- file: 要上传的文件
```

### 获取纯文本链接

```
GET /api/link?link=<url>&ext=<extension>

查询参数：
- link: CDN 返回的链接
- ext (可选): 文件扩展名
```

## 技术栈

- [Hono](https://hono.dev/) - 轻量级服务器端框架
- TypeScript
- Cloudflare Workers

## 注意事项

- 此服务仅适用于学习和测试目的
- 上传的文件存储在第三方 CDN 上，我们不保证永久可用性
- 请勿上传违法、侵权或敏感内容
import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import uploadApp from '../api/upload'

const app = new Hono()

// 上传API路由 - 放在静态文件服务之前
app.route('/upload', uploadApp)
app.route('/link', uploadApp)

// 根路径返回 index.html
app.get('/', serveStatic({ path: './index.html' }))

// 静态文件服务
app.use('/*', serveStatic({ root: './' }))

export default app

import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import uploadApp from '../api/upload'

const app = new Hono()

// 静态文件服务
app.use('/*', serveStatic({ root: './' }))

// 上传API路由
app.route('/upload', uploadApp)
app.route('/link', uploadApp)

export default app
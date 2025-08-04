import { Context, Hono } from 'hono'
import { cors } from 'hono/cors'

// 初始化 Hono 应用
const app = new Hono()

// 启用 CORS
app.use('*', cors())

// 类型定义
interface UploadResult {
  success: boolean
  message?: string
  url?: string
}

// 模拟 CDN 上传器
class CDNUploader {
  private api_url = 'https://api.pgaot.com/user/up_cat_file'
  private referer_url = 'https://shequ.pgaot.com/?mod=codemaocdn'
  
  // 随机 User-Agent 池
  private user_agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ]
  
  // 上传文件到 CDN
  async upload(file: File): Promise<UploadResult> {
    // 随机延迟，模拟真实用户行为
    await this.randomDelay()
    
    // 获取随机 User-Agent
    const user_agent = this.user_agents[Math.floor(Math.random() * this.user_agents.length)]
    
    // 构造请求头
    const headers = new Headers({
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': 'https://shequ.pgaot.com',
      'DNT': '1',
      'User-Agent': user_agent,
      'Referer': this.referer_url
    })
    
    // 构造表单数据
    const formData = new FormData()
    formData.append('path', 'pickduck')
    formData.append('file', file)
    
    try {
      // 执行 HTTP 请求
      const response = await fetch(this.api_url, {
        method: 'POST',
        headers,
        body: formData
      })
      
      // 检查响应状态
      if (!response.ok) {
        return {
          success: false,
          message: `服务器返回错误：${response.status}，响应：${await response.text().then(text => text.substring(0, 300))}`
        }
      }
      
      // 解析 JSON 响应
      const result = await response.json()
      
      if (result.url) {
        // 自动补全扩展名
        let final_url = result.url
        const ext = file.name.split('.').pop()?.toLowerCase()
        
        if (ext && !new RegExp(`\\.${ext}$`, 'i').test(final_url)) {
          final_url += `.${ext}`
        }
        
        return {
          success: true,
          url: final_url
        }
      } else {
        return {
          success: false,
          message: `上传失败：${result.msg || '未知错误'}`
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `网络请求失败：${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }
  
  // 随机延迟
  private randomDelay(): Promise<void> {
    // 随机延迟 100-500 毫秒
    const delay = Math.floor(Math.random() * 400) + 100
    return new Promise(resolve => setTimeout(resolve, delay))
  }
}

// 上传主路由
app.post('/upload', async (c) => {
  const formData = await c.req.parseBody()
  const files = formData['files[]'] as File[] | File | undefined
  
  // 检查文件是否存在
  if (!files) {
    c.status(400)
    return c.json({
      success: false,
      message: '文件上传失败（未找到文件）'
    })
  }
  
  // 处理单个文件或多个文件
  const fileList = Array.isArray(files) ? files : [files]
  
  // 上传到 CDN
  const uploader = new CDNUploader()
  const results = []
  
  for (const file of fileList) {
    const result = await uploader.upload(file)
    results.push({
      ...result,
      filename: file.name
    })
  }
  
  // 设置响应状态码
  const allSuccess = results.every(r => r.success)
  if (!allSuccess) {
    c.status(500)
  }
  
  // 如果只有一个文件，保持原有的响应格式
  if (results.length === 1) {
    return c.json(results[0])
  }
  
  // 多个文件的响应格式
  return c.json({
    success: allSuccess,
    results
  })
})

// 纯文本链接接口
app.get('/link', (c) => {
  const url = c.req.query('link')
  const urls = c.req.query('links')
  
  // 检查参数是否存在
  if (!url && !urls) {
    c.status(400)
    return c.text('缺少 link 或 links 参数')
  }
  
  // 处理单个链接
  if (url) {
    // 尝试从 url 参数获取扩展名
    let ext = c.req.query('ext')?.toLowerCase() || ''
    
    if (!ext) {
      const match = url.match(/\.([a-z0-9]{1,5})$/i)
      if (match) {
        ext = match[1].toLowerCase()
      }
    }
    
    let finalUrl = url
    if (ext && !new RegExp(`\\.${ext}$`, 'i').test(url)) {
      finalUrl += `.${ext}`
    }
    
    return c.text(finalUrl)
  }
  
  // 处理多个链接
  if (urls) {
    const urlList = urls.split(',').map(u => decodeURIComponent(u))
    const finalUrls = urlList.map(url => {
      // 尝试从 url 获取扩展名
      let ext = ''
      const match = url.match(/\.([a-z0-9]{1,5})$/i)
      if (match) {
        ext = match[1].toLowerCase()
      }
      
      let finalUrl = url
      if (ext && !new RegExp(`\\.${ext}$`, 'i').test(url)) {
        finalUrl += `.${ext}`
      }
      
      return finalUrl
    })
    
    return c.text(finalUrls.join('\n'))
  }
  
  return c.text('')
})

export default app

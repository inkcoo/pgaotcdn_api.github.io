/**
 * Cloudflare Workers CDN上传API
 * 基于点鸭社区CDN的文件上传服务
 */

// 配置常量
const CONFIG = {
  API_URL: 'https://api.pgaot.com/user/up_cat_file',
  REFERER_URL: 'https://shequ.pgaot.com/?mod=codemaocdn',
  ENABLE_LINK_LOGGING: true,
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB
  ALLOWED_EXTENSIONS: {
    // 服务器中转模式允许的文件类型
    safe: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm', 'mp3', 'wav', 'pdf', 'txt', 'md', 'json', 'xml', 'csv'],
    // 所有文件类型（前端直传模式）
    all: []
  }
};

// 随机User-Agent池
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

/**
 * 获取随机User-Agent
 */
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * 随机延迟函数（模拟真实用户行为）
 */
function randomDelay() {
  return new Promise(resolve => {
    const delay = Math.random() * 400 + 100; // 100-500ms
    setTimeout(resolve, delay);
  });
}

/**
 * 检查文件扩展名是否安全
 */
function isSafeFileExtension(filename, mode = 'proxy') {
  if (mode === 'direct') return true; // 前端直传模式允许所有文件
  
  const ext = filename.split('.').pop()?.toLowerCase();
  return CONFIG.ALLOWED_EXTENSIONS.safe.includes(ext);
}

/**
 * 记录链接信息（使用KV存储）
 */
async function logLink(env, filename, url, ip) {
  if (!CONFIG.ENABLE_LINK_LOGGING || !env.CDN_LOGS) return;
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip: ip,
    filename: filename,
    url: url
  };
  
  try {
    const key = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await env.CDN_LOGS.put(key, JSON.stringify(logEntry), { expirationTtl: 86400 * 30 }); // 30天过期
  } catch (error) {
    console.error('记录链接失败:', error);
  }
}

/**
 * 上传文件到CDN
 */
async function uploadToCDN(file, filename, mode = 'proxy') {
  // 检查文件大小
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    throw new Error(`文件大小超过限制（${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB）`);
  }
  
  // 检查文件类型
  if (!isSafeFileExtension(filename, mode)) {
    throw new Error('服务器中转模式不支持此文件类型，请使用前端直传模式');
  }
  
  // 随机延迟
  await randomDelay();
  
  // 构造FormData
  const formData = new FormData();
  formData.append('path', 'pickduck');
  formData.append('file', file, filename);
  
  // 构造请求头
  const headers = {
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
    'User-Agent': getRandomUserAgent(),
    'Referer': CONFIG.REFERER_URL
  };
  
  // 执行上传请求
  const response = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: headers,
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`服务器返回错误：${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.url) {
    throw new Error(`上传失败：${result.msg || '未知错误'}`);
  }
  
  // 自动补全扩展名
  let finalUrl = result.url;
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext && !finalUrl.toLowerCase().endsWith(`.${ext}`)) {
    finalUrl += `.${ext}`;
  }
  
  return finalUrl;
}

/**
 * 处理CORS预检请求
 */
function handleCORS(request) {
  const origin = request.headers.get('Origin');
  const headers = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
  
  return new Response(null, { status: 204, headers });
}

/**
 * 返回JSON响应
 */
function jsonResponse(data, status = 200) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  
  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * 返回纯文本响应
 */
function textResponse(text, status = 200) {
  const headers = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  
  return new Response(text, { status, headers });
}

/**
 * 主处理函数
 */
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  
  // 处理CORS预检请求
  if (method === 'OPTIONS') {
    return handleCORS(request);
  }
  
  // 处理纯文本链接接口
  if (method === 'GET' && url.searchParams.has('link')) {
    let linkUrl = url.searchParams.get('link');
    const ext = url.searchParams.get('ext');
    
    if (ext && !linkUrl.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
      linkUrl += `.${ext}`;
    }
    
    return textResponse(linkUrl);
  }
  
  // 处理文件上传
  if (method === 'POST') {
    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const mode = formData.get('mode') || 'proxy';
      
      if (!file) {
        return jsonResponse({ success: false, message: '未找到上传的文件' }, 400);
      }
      
      // 获取客户端IP
      const clientIP = request.headers.get('CF-Connecting-IP') || 
                      request.headers.get('X-Forwarded-For') || 
                      'unknown';
      
      // 上传文件
      const url = await uploadToCDN(file, file.name, mode);
      
      // 记录链接
      await logLink(env, file.name, url, clientIP);
      
      return jsonResponse({ success: true, url: url });
      
    } catch (error) {
      console.error('上传错误:', error);
      return jsonResponse({ 
        success: false, 
        message: error.message || '上传失败' 
      }, 500);
    }
  }
  
  // 默认返回API信息
  return jsonResponse({
    success: true,
    message: '点鸭社区CDN上传API',
    version: '1.0.0',
    endpoints: {
      upload: 'POST /',
      link: 'GET /?link=URL&ext=EXTENSION'
    }
  });
}

/**
 * Cloudflare Workers入口点
 */
export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error('Worker错误:', error);
      return jsonResponse({
        success: false,
        message: '服务器内部错误'
      }, 500);
    }
  }
}; 

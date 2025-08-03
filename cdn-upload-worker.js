/**
 * 点鸭社区CDN上传 - Cloudflare Workers 版本
 * 基于 upload_advanced.php 重构，支持在 Cloudflare Workers 上运行
 */

// 配置常量
const CONFIG = {
  ENABLE_LINK_LOGGING: true, // 是否启用链接记录
  API_URL: 'https://api.pgaot.com/user/up_cat_file',
  REFERER_URL: 'https://shequ.pgaot.com/?mod=codemaocdn',
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB
  ALLOWED_EXTENSIONS: [
    // 图片文件
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico',
    // 视频文件
    'mp4', 'avi', 'mov', 'flv', 'wmv', 'mkv', 'ts', 'm3u8', 'webm',
    // 音频文件
    'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a',
    // 文档文件
    'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'md', 'rtf',
    // 压缩文件
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
    // 字体文件
    'ttf', 'woff', 'woff2', 'eot', 'otf',
    // 代码文件
    'js', 'css', 'html', 'xml', 'json'
  ]
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
 * 获取文件扩展名
 */
function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

/**
 * 检查文件类型是否安全
 */
function isFileTypeSafe(extension) {
  return CONFIG.ALLOWED_EXTENSIONS.includes(extension);
}

/**
 * 随机延迟（模拟真实用户行为）
 */
function randomDelay() {
  return new Promise(resolve => {
    const delay = Math.random() * 400 + 100; // 100-500ms
    setTimeout(resolve, delay);
  });
}

/**
 * 记录请求日志
 */
function logRequest(httpCode, response, userAgent, totalTime) {
  const log = `[${new Date().toISOString()}] HTTP状态：${httpCode} | 耗时：${totalTime}ms | User-Agent：${userAgent.substring(0, 50)} | 响应：${response.substring(0, 500)}\n`;
  console.log(log);
}

/**
 * 记录链接信息
 */
function logLink(filename, url, clientIP) {
  if (!CONFIG.ENABLE_LINK_LOGGING) {
    return;
  }
  
  const logEntry = `${new Date().toISOString()} | ${clientIP || 'unknown'} | ${filename}\n${url}\n`;
  console.log(logEntry);
}

/**
 * 上传文件到CDN
 */
async function uploadToCDN(file, filename) {
  const startTime = Date.now();
  const userAgent = getRandomUserAgent();
  
  // 随机延迟
  await randomDelay();
  
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
    'User-Agent': userAgent,
    'Referer': CONFIG.REFERER_URL
  };
  
  // 构造FormData
  const formData = new FormData();
  formData.append('path', 'pickduck');
  formData.append('file', file, filename);
  
  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: headers,
      body: formData
    });
    
    const totalTime = Date.now() - startTime;
    const responseText = await response.text();
    
    // 记录日志
    logRequest(response.status, responseText, userAgent, totalTime);
    
    if (!response.ok) {
      return {
        success: false,
        message: `服务器返回错误：${response.status}，响应：${responseText.substring(0, 300)}`
      };
    }
    
    // 解析JSON响应
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      return {
        success: false,
        message: `响应格式错误：${responseText.substring(0, 300)}`
      };
    }
    
    if (result.url) {
      // 自动补全扩展名
      let finalUrl = result.url;
      const ext = getFileExtension(filename);
      if (ext && !finalUrl.toLowerCase().endsWith(`.${ext}`)) {
        finalUrl += `.${ext}`;
      }
      
      return {
        success: true,
        url: finalUrl
      };
    } else {
      return {
        success: false,
        message: `上传失败：${result.msg || '未知错误'}`
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: `网络请求失败：${error.message}`
    };
  }
}

/**
 * 处理CORS预检请求
 */
function handleCORS(request) {
  const origin = request.headers.get('Origin');
  const headers = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
  
  return new Response(null, {
    status: 204,
    headers: headers
  });
}

/**
 * 返回JSON响应
 */
function jsonResponse(data, status = 200) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  return new Response(JSON.stringify(data), {
    status: status,
    headers: headers
  });
}

/**
 * 返回纯文本响应
 */
function textResponse(text, status = 200) {
  const headers = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  return new Response(text, {
    status: status,
    headers: headers
  });
}

/**
 * 主处理函数
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  const clientIP = request.headers.get('CF-Connecting-IP') || 
                   request.headers.get('X-Forwarded-For') || 
                   request.headers.get('X-Real-IP') || 
                   'unknown';
  
  // 处理CORS预检请求
  if (request.method === 'OPTIONS') {
    return handleCORS(request);
  }
  
  // 处理纯文本链接请求
  if (request.method === 'GET' && url.searchParams.has('link')) {
    let linkUrl = url.searchParams.get('link');
    const ext = url.searchParams.get('ext') || 
                (linkUrl.match(/\.([a-z0-9]{1,5})$/i) ? linkUrl.match(/\.([a-z0-9]{1,5})$/i)[1].toLowerCase() : '');
    
    if (ext && !linkUrl.toLowerCase().endsWith(`.${ext}`)) {
      linkUrl += `.${ext}`;
    }
    
    return textResponse(linkUrl);
  }
  
  // 处理文件上传
  if (request.method === 'POST') {
    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const mode = formData.get('mode') || 'direct';
      
      if (!file) {
        return jsonResponse({
          success: false,
          message: '未找到上传的文件'
        }, 400);
      }
      
      // 检查文件大小
      if (file.size > CONFIG.MAX_FILE_SIZE) {
        return jsonResponse({
          success: false,
          message: `文件大小超过限制（最大${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB）`
        }, 400);
      }
      
      const filename = file.name || 'unknown';
      const extension = getFileExtension(filename);
      
      // 检查文件类型（中转模式）
      if (mode === 'proxy' && !isFileTypeSafe(extension)) {
        return jsonResponse({
          success: false,
          message: `中转模式不支持此文件类型: .${extension}，请使用前端直传模式`
        }, 400);
      }
      
      // 上传到CDN
      const result = await uploadToCDN(file, filename);
      
      // 记录链接信息
      if (result.success) {
        logLink(filename, result.url, clientIP);
      }
      
      return jsonResponse(result, result.success ? 200 : 500);
      
    } catch (error) {
      return jsonResponse({
        success: false,
        message: `处理上传请求时出错：${error.message}`
      }, 500);
    }
  }
  
  // 默认返回404
  return jsonResponse({
    success: false,
    message: '不支持的请求方法'
  }, 404);
}

// Cloudflare Workers 入口点
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
}); 
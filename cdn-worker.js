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
function isSafeFileExtension(filename, mode = 'direct') {
  // 前端直传模式允许所有文件
  return true;
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
async function uploadToCDN(file, filename, mode = 'direct') {
  // 检查文件大小
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    throw new Error(`文件大小超过限制（${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB）`);
  }

  // 检查文件类型
  if (!isSafeFileExtension(filename, mode)) {
    throw new Error('文件类型不支持');
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
 * 返回HTML页面
 */
function htmlResponse(html, status = 200) {
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  return new Response(html, { status, headers });
}

/**
 * 返回CSS样式
 */
function cssResponse(css, status = 200) {
  const headers = {
    'Content-Type': 'text/css; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600'
  };

  return new Response(css, { status, headers });
}

/**
 * 返回JavaScript文件
 */
function jsResponse(js, status = 200) {
  const headers = {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600'
  };

  return new Response(js, { status, headers });
}

/**
 * 主处理函数
 */
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname;

  // 处理CORS预检请求
  if (method === 'OPTIONS') {
    return handleCORS(request);
  }

  // 处理静态资源请求
  if (method === 'GET') {
    // 返回CSS文件
    if (path === '/index.css') {
      const cssContent = await getCSSContent();
      return cssResponse(cssContent);
    }

    // 返回JavaScript文件
    if (path === '/index-worker.js') {
      const jsContent = await getJSContent(url.origin);
      return jsResponse(jsContent);
    }

    // 处理纯文本链接接口
    if (url.searchParams.has('link')) {
      let linkUrl = url.searchParams.get('link');
      const ext = url.searchParams.get('ext');

      if (ext && !linkUrl.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
        linkUrl += `.${ext}`;
      }

      return textResponse(linkUrl);
    }

    // 返回主页HTML
    if (path === '/' || path === '') {
      const htmlContent = await getHTMLContent(url.origin);
      return htmlResponse(htmlContent);
    }
  }

  // 处理文件上传
  if (method === 'POST') {
    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const mode = 'direct'; // 仅支持前端直传模式

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
 * 获取HTML内容
 */
async function getHTMLContent(origin) {
  return `<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>免费CDN文件上传 - Worker版本</title>
    <link rel="stylesheet" href="${origin}/index.css">
</head>

<body>
    <div class="container">
        <h1>点鸭社区CDN上传 (Worker API)</h1>

        <div class="upload-area" id="dropZone">
            <p>拖拽文件到此处或点击选择文件</p>
            <div class="file-input-wrapper">
                <input type="file" id="fileInput" class="file-input" />
                <label for="fileInput" class="file-input-label">选择文件</label>
                <div class="file-name" id="fileNameDisplay"></div>
            </div>

            <div class="info-box">
                <strong>📁 文件类型说明：</strong><br>
                <span>💡 <strong>前端直传模式</strong>：支持所有文件类型，仅受点鸭社区CDN限制</span><br>
                <span>⚠️ 建议上传小于20MB的文件，大文件可能上传失败！</span><br>
                <span>🚀 <strong>Worker API</strong>：基于Cloudflare Workers，更快速稳定</span>
            </div>

            <button class="btn" id="uploadBtn" disabled>上传文件</button>
            <button class="btn btn-secondary" id="plainLinkBtn" style="display:none;">纯文本链接</button>

            <div class="progress-bar" id="progressDiv"></div>
        </div>

        <div id="result" class="result" style="display: none;"></div>

        <div class="disclaimer">
            <h3>免责声明</h3>
            <p>1. 本服务仅供学习和测试使用，请勿上传违法、侵权或敏感内容。</p>
            <p>2. 文件由第三方<a href="https://shequ.pgaot.com/?mod=codemaocdn" target="_blank">编程猫点鸭社区CDN</a>存储，本站不保证永久可用性。
            </p>
            <p>3. 请勿上传涉及隐私、商业机密或其他受法律保护的内容，本站没有能力删除任何上传的文件。</p>
            <p>4. 本站默认开启URL记录，所有上传链接将被记录保留。</p>
            <p>5. 使用本服务即表示您同意承担所有相关责任。</p>
            <p>6. 本站不提供任何技术支持，如有问题，请自行解决。</p>
            <p>7. 本站的API代码在<a href="https://github.com/inkcoo/pgaotcdn_api" target="_blank">GitHub</a>上开源。</p>
            <p>8. 本版本使用Cloudflare Workers部署，提供更好的性能和稳定性。</p>
        </div>
    </div>

    <script src="${origin}/index-worker.js"></script>
</body>

</html>`;
}

/**
 * 获取CSS内容
 */
async function getCSSContent() {
  return `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    color: #333;
    line-height: 1.6;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

h1 {
    text-align: center;
    color: white;
    margin-bottom: 30px;
    font-size: 2.5rem;
    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.upload-area {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    padding: 40px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    margin-bottom: 30px;
    transition: all 0.3s ease;
    border: 2px dashed #ddd;
}

.upload-area.dragover {
    border-color: #667eea;
    background: rgba(255, 255, 255, 0.98);
    transform: scale(1.02);
}

.upload-area p {
    font-size: 1.2rem;
    color: #666;
    margin-bottom: 20px;
}

.file-input-wrapper {
    margin: 20px 0;
}

.file-input {
    display: none;
}

.file-input-label {
    display: inline-block;
    background: #667eea;
    color: white;
    padding: 12px 24px;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 500;
}

.file-input-label:hover {
    background: #5a6fd8;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.file-name {
    margin-top: 10px;
    font-size: 0.9rem;
    color: #666;
    word-break: break-all;
}

.info-box {
    background: rgba(102, 126, 234, 0.1);
    border: 1px solid rgba(102, 126, 234, 0.2);
    border-radius: 10px;
    padding: 15px;
    margin: 20px 0;
    text-align: left;
    font-size: 0.9rem;
    line-height: 1.8;
}

.info-box strong {
    color: #667eea;
}

.btn {
    background: #667eea;
    color: white;
    border: none;
    padding: 12px 30px;
    border-radius: 25px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.3s ease;
    margin: 10px 5px;
}

.btn:hover:not(:disabled) {
    background: #5a6fd8;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

.btn-secondary {
    background: #6c757d;
}

.btn-secondary:hover:not(:disabled) {
    background: #5a6268;
    box-shadow: 0 5px 15px rgba(108, 117, 125, 0.4);
}

.progress-bar {
    margin-top: 20px;
    padding: 10px;
    background: rgba(102, 126, 234, 0.1);
    border-radius: 5px;
    display: none;
    font-weight: 500;
    color: #667eea;
}

.result {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    padding: 20px;
    margin: 20px 0;
    text-align: center;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.result.success {
    border-left: 4px solid #28a745;
}

.result.error {
    border-left: 4px solid #dc3545;
}

.url-input {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 0.9rem;
    background: rgba(255,255,255,0.9);
    margin: 10px 0;
    cursor: pointer;
}

.url-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.disclaimer {
    background: rgba(255, 255, 255, 0.9);
    border-radius: 15px;
    padding: 25px;
    margin-top: 30px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.disclaimer h3 {
    color: #667eea;
    margin-bottom: 15px;
    text-align: center;
}

.disclaimer p {
    margin-bottom: 10px;
    font-size: 0.9rem;
    color: #666;
    line-height: 1.6;
}

.disclaimer a {
    color: #667eea;
    text-decoration: none;
}

.disclaimer a:hover {
    text-decoration: underline;
}

@media (max-width: 768px) {
    .container {
        padding: 15px;
    }
    
    h1 {
        font-size: 2rem;
    }
    
    .upload-area {
        padding: 25px;
    }
    
    .btn {
        padding: 10px 20px;
        font-size: 0.9rem;
    }
}`;
}

/**
 * 获取JavaScript内容
 */
async function getJSContent(origin) {
  return `const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const resultDiv = document.getElementById('result');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const plainLinkBtn = document.getElementById('plainLinkBtn');
const progressDiv = document.getElementById('progressDiv');
let lastCDNLink = '';
let lastExt = '';

// Worker API配置
const WORKER_API_URL = '${origin}'; // 使用当前域名

// 文件选择事件
fileInput.addEventListener('change', function () {
    if (this.files.length > 0) {
        const file = this.files[0];
        fileNameDisplay.textContent = file.name;
        uploadBtn.disabled = false;
        lastExt = file.name.split('.').pop().toLowerCase();

        // 检查文件类型是否支持
        checkFileTypeSupport(lastExt);
    } else {
        fileNameDisplay.textContent = '';
        uploadBtn.disabled = true;
        lastExt = '';
    }
});

// 检查文件类型支持
function checkFileTypeSupport(ext) {
    // 前端直传模式支持所有文件类型
    fileNameDisplay.style.color = '#4ade80';
}

// 更新文件类型信息显示
function updateFileTypesInfo() {
    // 前端直传模式支持所有文件类型
    // 无需更新文件类型信息
}

// 拖拽事件
dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', function () {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        const file = files[0];
        fileNameDisplay.textContent = file.name;
        uploadBtn.disabled = false;
        lastExt = file.name.split('.').pop().toLowerCase();
        checkFileTypeSupport(lastExt);
    }
});

// 点击上传区域选择文件
dropZone.addEventListener('click', function (e) {
    if (e.target !== uploadBtn && e.target !== plainLinkBtn && e.target !== fileInput) {
        fileInput.click();
    }
});

// 上传按钮事件
uploadBtn.addEventListener('click', async function () {
    if (fileInput.files.length === 0) {
        showMessage('请先选择文件', 'error');
        return;
    }

    const file = fileInput.files[0];

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', 'direct'); // 仅支持前端直传模式

    uploadBtn.disabled = true;
    uploadBtn.textContent = '上传中...';
    plainLinkBtn.style.display = 'none';
    progressDiv.style.display = 'block';
    progressDiv.textContent = '🔄 正在前端直传...';

    try {
        const response = await fetch(WORKER_API_URL, {
            method: 'POST',
            body: formData
        });

        let data = null;
        let text = await response.text();
        try {
            data = JSON.parse(text);
        } catch (e) {
            showMessage(\`上传出错: Worker返回非JSON数据<br>HTTP状态码：\${response.status}<br>内容：\${text}\`, 'error');
            return;
        }

        if (response.ok && data.success) {
            progressDiv.textContent = '✅ 上传完成';

            lastCDNLink = data.url;
            showMessage(\`
                <div style='margin-bottom:15px;font-weight:600;'>🎉 上传成功！</div>
                <input type="text" id="cdnUrlBox" class="url-input" value="\${data.url}" readonly onclick="this.select();navigator.clipboard.writeText(this.value);this.style.background='rgba(74,222,128,0.2)';setTimeout(()=>this.style.background='rgba(255,255,255,0.1)',1000);">
                <div style='color:rgba(255,255,255,0.7);font-size:0.85rem;margin-top:8px;'>点击输入框可复制链接</div>
            \`, 'success', true);
            plainLinkBtn.style.display = 'inline-block';
        } else {
            progressDiv.style.display = 'none';
            showMessage(\`❌ 上传失败: \${data.message || '未知错误'}\`, 'error');
        }
    } catch (error) {
        progressDiv.style.display = 'none';
        showMessage(\`❌ 上传出错: \${error.message}\`, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = '上传文件';
    }
});

// 纯文本链接按钮
plainLinkBtn.addEventListener('click', function () {
    if (lastCDNLink) {
        window.open(\`\${WORKER_API_URL}?link=\${encodeURIComponent(lastCDNLink)}&ext=\${lastExt}\`, '_blank');
    }
});

// 显示消息
function showMessage(message, type, fixed = false) {
    resultDiv.innerHTML = message;
    resultDiv.className = \`result \${type}\`;
    resultDiv.style.display = 'block';
    if (!fixed) {
        setTimeout(() => resultDiv.style.display = 'none', 5000);
    }
}`;
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

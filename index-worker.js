const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const resultDiv = document.getElementById('result');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const plainLinkBtn = document.getElementById('plainLinkBtn');
const uploadMode = document.getElementById('uploadMode');
const progressDiv = document.getElementById('progressDiv');
let lastCDNLink = '';
let lastExt = '';

// Worker API配置
const WORKER_API_URL = 'https://your-worker.your-subdomain.workers.dev'; // 需要替换为实际的Worker URL

// 中转模式安全文件类型列表
const proxySafeExtensions = [
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
];

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
        updateFileTypesInfo();
    }
});

// 检查文件类型支持
function checkFileTypeSupport(ext) {
    const mode = uploadMode.value;
    const isSupported = mode === 'direct' || proxySafeExtensions.includes(ext);

    if (!isSupported) {
        fileNameDisplay.style.color = '#ef4444';
        fileNameDisplay.textContent += ' (中转模式不支持此格式)';
    } else {
        fileNameDisplay.style.color = '#4ade80';
    }
}

// 更新文件类型信息显示
function updateFileTypesInfo() {
    const mode = uploadMode.value;
    const proxyExtensionsElement = document.getElementById('proxyExtensions');

    // 如果元素不存在，则直接返回
    if (!proxyExtensionsElement) return;

    if (mode === 'proxy') {
        const displayExtensions = proxySafeExtensions.slice(0, 12);
        proxyExtensionsElement.innerHTML = `${displayExtensions.join(', ')} 等${proxySafeExtensions.length}种安全格式`;
    } else {
        proxyExtensionsElement.innerHTML = '所有文件类型（仅受点鸭社区限制）';
    }
}

// 模式切换事件
uploadMode.addEventListener('change', function () {
    updateFileTypesInfo();
    if (lastExt) {
        checkFileTypeSupport(lastExt);
    }
});

// 初始化显示
updateFileTypesInfo();

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
    if (e.target !== uploadBtn && e.target !== plainLinkBtn && e.target !== fileInput && e.target !== uploadMode) {
        fileInput.click();
    }
});

// 上传按钮事件
uploadBtn.addEventListener('click', async function () {
    if (fileInput.files.length === 0) {
        showMessage('请先选择文件', 'error');
        return;
    }

    const mode = uploadMode.value;
    const file = fileInput.files[0];
    const ext = file.name.split('.').pop().toLowerCase();

    // 检查中转模式的文件类型限制
    if (mode === 'proxy' && !proxySafeExtensions.includes(ext)) {
        showMessage(`中转模式不支持此文件类型: .${ext}，请使用前端直传模式`, 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

    uploadBtn.disabled = true;
    uploadBtn.textContent = '上传中...';
    plainLinkBtn.style.display = 'none';
    progressDiv.style.display = 'block';
    progressDiv.textContent = mode === 'proxy' ? '🔄 正在上传至Worker...' : '🔄 正在前端直传...';

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
            showMessage(`上传出错: Worker返回非JSON数据<br>HTTP状态码：${response.status}<br>内容：${text}`, 'error');
            return;
        }

        if (response.ok && data.success) {
            progressDiv.textContent = '✅ 上传完成';

            lastCDNLink = data.url;
            showMessage(`
                <div style='margin-bottom:15px;font-weight:600;'>🎉 上传成功！</div>
                <input type="text" id="cdnUrlBox" class="url-input" value="${data.url}" readonly onclick="this.select();navigator.clipboard.writeText(this.value);this.style.background='rgba(74,222,128,0.2)';setTimeout(()=>this.style.background='rgba(255,255,255,0.1)',1000);">
                <div style='color:rgba(255,255,255,0.7);font-size:0.85rem;margin-top:8px;'>点击输入框可复制链接</div>
            `, 'success', true);
            plainLinkBtn.style.display = 'inline-block';
        } else {
            progressDiv.style.display = 'none';
            showMessage(`❌ 上传失败: ${data.message || '未知错误'}`, 'error');
        }
    } catch (error) {
        progressDiv.style.display = 'none';
        showMessage(`❌ 上传出错: ${error.message}`, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = '上传文件';
    }
});

// 纯文本链接按钮
plainLinkBtn.addEventListener('click', function () {
    if (lastCDNLink) {
        window.open(`${WORKER_API_URL}?link=${encodeURIComponent(lastCDNLink)}&ext=${lastExt}`, '_blank');
    }
});

// 显示消息
function showMessage(message, type, fixed = false) {
    resultDiv.innerHTML = message;
    resultDiv.className = `result ${type}`;
    resultDiv.style.display = 'block';
    if (!fixed) {
        setTimeout(() => resultDiv.style.display = 'none', 5000);
    }
} 
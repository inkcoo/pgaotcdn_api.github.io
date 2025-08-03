<?php
/**
 * 高级版上传文件到点鸭社区CDN
 * 包含反检测机制和安全文件类型限制
 * 
 * 功能说明：
 * - 服务器中转模式：只允许安全的媒体文件和文档文件
 * - 前端直传模式：支持所有文件类型（仅受点鸭社区限制）
 * - 包含进度查询、链接记录、反检测等功能
 */

// 启用错误报告
ini_set('display_errors', 1);
error_reporting(E_ALL);

// 允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ========== 配置区 ==========
define('SERVER_PROXY_ENABLED', true); // 管理员可切换是否启用服务器中转
define('ENABLE_LINK_LOGGING', true); // 管理员可切换是否启用链接记录

// 中转模式安全文件类型限制（只允许安全的媒体文件和文档文件）
$proxy_safe_exts = [
    // 图片文件
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico',
    // 视频文件
    'mp4', 'avi', 'mov', 'flv', 'wmv', 'mkv', 'ts', 'm3u8', 'webm',
    // 音频文件
    'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a',
    // 文档文件
    'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'md', 'rtf',
    // 压缩文件（仅常见安全格式）
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
    // 字体文件
    'ttf', 'woff', 'woff2', 'eot', 'otf',
    // 代码文件（仅常见安全格式）
    'js', 'css', 'html', 'xml', 'json', 'md', 'txt'
];

// 前端直传模式支持所有文件类型（仅受点鸭社区限制）
$direct_all_exts = ['*'];

// ========== 进度查询接口 ==========
if (isset($_GET['progress']) && $_GET['progress']) {
    $key = preg_replace('/[^a-zA-Z0-9_\-]/', '', $_GET['progress']);
    $progress_file = sys_get_temp_dir() . "/cdn_upload_progress_{$key}.json";
    if (file_exists($progress_file)) {
        header('Content-Type: application/json');
        echo file_get_contents($progress_file);
    } else {
        echo json_encode(['status'=>'not_found','msg'=>'无进度信息']);
    }
    exit;
}

/**
 * CDN上传器类
 * 负责处理文件上传到点鸭社区CDN
 */
class CDNUploader {
    private $api_url = 'https://api.pgaot.com/user/up_cat_file';
    private $referer_url = 'https://shequ.pgaot.com/?mod=codemaocdn';
    
    // 随机User-Agent池，模拟真实浏览器
    private $user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ];
    
    /**
     * 上传文件到CDN
     * @param string $file_path 文件路径
     * @return array 上传结果
     */
    public function upload($file_path) {
        // 检查文件是否存在
        if (!file_exists($file_path)) {
            return ['success' => false, 'message' => '文件不存在'];
        }
        
        // 随机延迟，模拟真实用户行为
        $this->randomDelay();
        
        // 获取随机User-Agent
        $user_agent = $this->user_agents[array_rand($this->user_agents)];
        
        // 构造请求头，模拟真实浏览器
        $headers = [
            'Accept: application/json, text/plain, */*',
            'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding: gzip, deflate, br',
            'Connection: keep-alive',
            'Cache-Control: no-cache',
            'Pragma: no-cache',
            'Sec-Fetch-Dest: empty',
            'Sec-Fetch-Mode: cors',
            'Sec-Fetch-Site: cross-site',
            'X-Requested-With: XMLHttpRequest',
            'Origin: https://shequ.pgaot.com',
            'DNT: 1'
        ];
        
        // 构造文件数据
        $file = class_exists('CURLFile') ? new CURLFile($file_path) : '@' . $file_path;
        $post_data = [
            'path' => 'pickduck',
            'file' => $file
        ];
        
        // 执行HTTP请求
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->api_url,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $post_data,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => false,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_USERAGENT => $user_agent,
            CURLOPT_REFERER => $this->referer_url,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_LOW_SPEED_LIMIT => 512,
            CURLOPT_LOW_SPEED_TIME => 60,
            CURLOPT_ENCODING => 'gzip, deflate',
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1
        ]);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        $effective_url = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
        $total_time = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
        curl_close($ch);
        
        // 记录详细日志
        $this->logRequest($http_code, $curl_error, $response, $effective_url, $total_time, $user_agent);
        
        // 处理响应
        if ($curl_error) {
            return ['success' => false, 'message' => '网络请求失败：' . $curl_error];
        }
        
        if ($http_code !== 200) {
            return ['success' => false, 'message' => '服务器返回错误：' . $http_code . '，响应：' . substr($response, 0, 300)];
        }
        
        // 解析JSON响应
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ['success' => false, 'message' => '响应格式错误：' . substr($response, 0, 300)];
        }
        
        if (isset($result['url'])) {
            // 自动补全扩展名
            $final_url = $result['url'];
            $ext = '';
            // 尝试从上传文件名获取扩展名
            if (isset($_FILES['file']['name'])) {
                $ext = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
                global $proxy_safe_exts;
                if (in_array($ext, $proxy_safe_exts) && !preg_match('/\\.' . preg_quote($ext, '/') . '$/i', $final_url)) {
                    $final_url .= '.' . $ext;
                }
            }
            return ['success' => true, 'url' => $final_url];
        } else {
            return ['success' => false, 'message' => '上传失败：' . ($result['msg'] ?? '未知错误')];
        }
    }
    
    /**
     * 随机延迟，模拟真实用户行为
     */
    private function randomDelay() {
        // 随机延迟 0.1-0.5 秒
        usleep(rand(100000, 500000));
    }
    
    /**
     * 记录请求日志
     */
    private function logRequest($http_code, $curl_error, $response, $effective_url, $total_time, $user_agent) {
        $log = sprintf(
            "[%s] HTTP状态：%d | 耗时：%.2fs | User-Agent：%s | 最终URL：%s | CURL错误：%s | 响应：%s\n",
            date('Y-m-d H:i:s'),
            $http_code,
            $total_time,
            substr($user_agent, 0, 50),
            $effective_url,
            $curl_error,
            substr($response, 0, 500)
        );
        file_put_contents('upload_advanced.log', $log, FILE_APPEND);
    }
    
    /**
     * 记录链接信息
     */
    public function logLink($filename, $url) {
        if (!ENABLE_LINK_LOGGING) {
            return;
        }
        
        $log_entry = sprintf(
            "%s | %s | %s\n%s\n",
            date('Y-m-d H:i:s'),
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            $filename,
            $url
        );
        
        file_put_contents('cdn_links.log', $log_entry, FILE_APPEND | LOCK_EX);
    }
}

// ========== 上传主逻辑 ==========
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['file'])) {
    $mode = isset($_POST['mode']) ? $_POST['mode'] : (isset($_GET['mode']) ? $_GET['mode'] : 'proxy');
    
    if ($mode === 'proxy') {
        // 服务器中转模式
        if (!SERVER_PROXY_ENABLED) {
            http_response_code(403);
            echo json_encode(['success'=>false,'message'=>'服务器中转上传服务已关闭']);
            exit;
        }
        
        $file = $_FILES['file'];
        $filename = $file['name'];
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        // 检查文件类型是否安全
        if (!in_array($ext, $proxy_safe_exts)) {
            http_response_code(400);
            echo json_encode(['success'=>false,'message'=>'中转模式不支持此文件类型: .' . $ext . '，请使用前端直传模式']);
            exit;
        }
        
        // 创建进度文件
        $progress_key = uniqid('cdn_', true);
        $progress_file = sys_get_temp_dir() . "/cdn_upload_progress_{$progress_key}.json";
        file_put_contents($progress_file, json_encode(['status'=>'uploading','msg'=>'正在上传至服务器...']));
        
        // 检查文件上传错误
        if ($file['error'] !== UPLOAD_ERR_OK) {
            file_put_contents($progress_file, json_encode(['status'=>'error','msg'=>'文件上传失败（错误码：' . $file['error'] . '）']));
            http_response_code(400);
            echo json_encode(['success'=>false,'message'=>'文件上传失败（错误码：' . $file['error'] . '）','progress'=>$progress_key]);
            exit;
        }
        
        // 上传到CDN
        file_put_contents($progress_file, json_encode(['status'=>'transferring','msg'=>'正在中转至CDN...']));
        $uploader = new CDNUploader();
        $_FILES['file']['name'] = $filename; // 兼容扩展名补全
        $result = $uploader->upload($file['tmp_name']);
        
        // 删除本地临时文件
        @unlink($file['tmp_name']);
        
        if ($result['success']) {
            file_put_contents($progress_file, json_encode(['status'=>'done','msg'=>'上传完成','url'=>$result['url']]));
            // 记录链接信息
            $uploader->logLink($filename, $result['url']);
        } else {
            file_put_contents($progress_file, json_encode(['status'=>'error','msg'=>$result['message']]));
        }
        
        header('Content-Type: application/json');
        if (!$result['success']) {
            http_response_code(500);
        }
        echo json_encode(array_merge($result, ['progress'=>$progress_key]));
        exit;
        
    } else if ($mode === 'direct') {
        // 前端直传模式
        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['success'=>false,'message'=>'文件上传失败（错误码：' . $file['error'] . '）']);
            exit;
        }
        
        // 上传到CDN
        $uploader = new CDNUploader();
        $result = $uploader->upload($file['tmp_name']);
        
        // 删除本地临时文件
        @unlink($file['tmp_name']);
        
        // 记录链接信息
        if ($result['success']) {
            $uploader->logLink($file['name'], $result['url']);
        }
        
        header('Content-Type: application/json');
        if (!$result['success']) {
            http_response_code(500);
        }
        echo json_encode($result);
        exit;
    }
}

// ========== 纯文本链接接口 ==========
// 支持 GET 方式返回纯文本链接，自动补全扩展名
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['link'])) {
    $url = $_GET['link'];
    // 尝试从 url 参数或 referer 获取扩展名
    $ext = '';
    if (isset($_GET['ext'])) {
        $ext = strtolower(trim($_GET['ext']));
    } elseif (preg_match('/\\.([a-z0-9]{1,5})$/i', $url, $m)) {
        $ext = strtolower($m[1]);
    }
    
    // 只允许安全扩展名
    if (!in_array($ext, $proxy_safe_exts)) $ext = '';
    if ($ext && !preg_match('/\\.' . preg_quote($ext, '/') . '$/i', $url)) {
        $url .= '.' . $ext;
    }
    
    header('Content-Type: text/plain; charset=utf-8');
    echo $url;
    exit;
}
?>
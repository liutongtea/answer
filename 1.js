const express = require('express');
const multer = require('multer');
const pdfjsLib = require('pdfjs-dist');
const cors = require('cors');

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.js');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 限制10MB
    }
});

const app = express();

// 添加静态文件服务
app.use(express.static(__dirname));
app.use(express.json());
app.use(cors())
// 添加根路由
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/1.html');
});

// 添加错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '服务器内部错误' });
});

// 添加文件类型验证
function validatePDF(req, res, next) {
    if (!req.file || !req.file.mimetype.includes('pdf')) {
        return res.status(400).json({ error: '请上传PDF文件' });
    }
    next();
}

// 处理文件上传
app.post('/upload', upload.single('pdf'), validatePDF, async (req, res) => {
    try {
        const pdfBuffer = req.file.buffer;
        const data = new Uint8Array(pdfBuffer);
        
        const loadingTask = pdfjsLib.getDocument({data});
        const pdfDocument = await loadingTask.promise;
        
        res.json({
            encrypted: false,
            info: {
                pages: pdfDocument.numPages,
                password: null
            }
        });
    } catch (error) {
        console.error('PDF处理错误:', error);
        
        if (error.name === 'PasswordException') {
            res.json({ 
                encrypted: true,
                message: '文件已加密，请提供密码'
            });
        } else {
            res.status(400).json({ 
                error: '无效的PDF文件',
                details: error.message 
            });
        }
    }
});

// 处理解密请求
app.post('/decrypt', upload.single('pdf'), validatePDF, async (req, res) => {
    try {
        const pdfBuffer = req.file.buffer;
        const password = req.body.password;
        
        if (!password) {
            return res.status(400).json({ 
                success: false, 
                error: '未提供密码' 
            });
        }

        const data = new Uint8Array(pdfBuffer);
        const loadingTask = pdfjsLib.getDocument({
            data,
            password
        });
        
        const pdfDocument = await loadingTask.promise;
        
        res.json({
            success: true,
            info: {
                pages: pdfDocument.numPages,
                password: password
            }
        });
    } catch (error) {
        console.error('解密失败:', error);
        res.status(400).json({ 
            success: false, 
            error: '密码错误' 
        });
    }
});

// 添加请求日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.listen(3000, () => console.log('服务器运行在端口3000'));
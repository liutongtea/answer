const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const cors = require('cors')
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
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        
        res.json({
            encrypted: false,
            info: extractPDFInfo(pdfDoc)
        });
    } catch (error) {
        console.error('PDF处理错误:', error);
        
        if (error.message.includes('encrypted')) {
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
        const password = req.body.password || req.query.password;
        
        if (!password) {
            return res.status(400).json({ 
                success: false, 
                error: '未提供密码' 
            });
        }

        const pdfDoc = await PDFDocument.load(pdfBuffer, { password });
        
        res.json({
            success: true,
            info: extractPDFInfo(pdfDoc)
        });
    } catch (error) {
        console.error('解密失败:', error);
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 提取PDF信息
function extractPDFInfo(pdfDoc) {
    return {
        isEncrypted: pdfDoc.isEncrypted,
        title: pdfDoc.getTitle() || '无',
        author: pdfDoc.getAuthor() || '无',
        pages: pdfDoc.getPageCount()
    };
}

// 添加请求日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.listen(3000, () => console.log('服务器运行在端口3000'));
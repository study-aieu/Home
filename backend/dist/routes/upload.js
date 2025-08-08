"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const BlogSite_1 = __importDefault(require("../models/BlogSite"));
const router = express_1.default.Router();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    }
});
// Upload image to WordPress media library
router.post('/:siteId', [auth_1.authenticateToken, upload.single('image')], async (req, res) => {
    let tempFilePath = null;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        const { siteId } = req.params;
        const { alt_text, caption, description } = req.body;
        const userId = req.user.id;
        tempFilePath = req.file.path;
        // Get site connection
        const site = await BlogSite_1.default.findOne({
            where: { id: siteId, userId, isActive: true }
        });
        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }
        // Prepare form data for WordPress
        const formData = new form_data_1.default();
        formData.append('file', fs_1.default.createReadStream(tempFilePath), {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        if (alt_text)
            formData.append('alt_text', alt_text);
        if (caption)
            formData.append('caption', caption);
        if (description)
            formData.append('description', description);
        // Upload to WordPress media library
        const response = await axios_1.default.post(`${site.getApiBaseUrl()}/media`, formData, {
            headers: {
                'Authorization': site.getAuthHeader(),
                ...formData.getHeaders()
            },
            timeout: 30000,
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });
        res.status(201).json({
            message: 'Image uploaded successfully',
            media: response.data
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        if (error.response) {
            res.status(error.response.status).json({
                error: error.response.data?.message || 'Failed to upload image'
            });
        }
        else {
            res.status(500).json({ error: 'Failed to upload image' });
        }
    }
    finally {
        // Clean up temporary file
        if (tempFilePath && fs_1.default.existsSync(tempFilePath)) {
            fs_1.default.unlinkSync(tempFilePath);
        }
    }
});
// Get media library items
router.get('/:siteId/media', auth_1.authenticateToken, async (req, res) => {
    try {
        const { siteId } = req.params;
        const { page = 1, perPage = 20, mediaType = 'image' } = req.query;
        const userId = req.user.id;
        // Get site connection
        const site = await BlogSite_1.default.findOne({
            where: { id: siteId, userId, isActive: true }
        });
        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }
        // Fetch media from WordPress
        const response = await axios_1.default.get(`${site.getApiBaseUrl()}/media`, {
            params: {
                page,
                per_page: perPage,
                media_type: mediaType,
                context: 'edit'
            },
            headers: {
                'Authorization': site.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });
        res.json({
            media: response.data,
            totalPages: parseInt(response.headers['x-wp-totalpages'] || '1'),
            total: parseInt(response.headers['x-wp-total'] || '0')
        });
    }
    catch (error) {
        console.error('Get media error:', error);
        if (error.response) {
            res.status(error.response.status).json({
                error: error.response.data?.message || 'Failed to fetch media'
            });
        }
        else {
            res.status(500).json({ error: 'Failed to fetch media' });
        }
    }
});
// Delete media item
router.delete('/:siteId/media/:mediaId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { siteId, mediaId } = req.params;
        const { force = true } = req.query;
        const userId = req.user.id;
        // Get site connection
        const site = await BlogSite_1.default.findOne({
            where: { id: siteId, userId, isActive: true }
        });
        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }
        // Delete media from WordPress
        const response = await axios_1.default.delete(`${site.getApiBaseUrl()}/media/${mediaId}`, {
            params: { force },
            headers: {
                'Authorization': site.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        res.json({
            message: 'Media deleted successfully',
            media: response.data
        });
    }
    catch (error) {
        console.error('Delete media error:', error);
        if (error.response) {
            res.status(error.response.status).json({
                error: error.response.data?.message || 'Failed to delete media'
            });
        }
        else {
            res.status(500).json({ error: 'Failed to delete media' });
        }
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map
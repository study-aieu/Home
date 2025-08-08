"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const axios_1 = __importDefault(require("axios"));
const auth_1 = require("../middleware/auth");
const BlogSite_1 = __importDefault(require("../models/BlogSite"));
const router = express_1.default.Router();
// Test WordPress connection
const testWordPressConnection = async (url, username, password) => {
    try {
        const cleanUrl = url.replace(/\/$/, '');
        const apiUrl = `${cleanUrl}/wp-json/wp/v2/users/me`;
        const response = await axios_1.default.get(apiUrl, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        return response.status === 200;
    }
    catch (error) {
        console.error('WordPress connection test failed:', error);
        return false;
    }
};
// Connect to WordPress site
router.post('/connect', [
    auth_1.authenticateToken,
    (0, express_validator_1.body)('name').trim().isLength({ min: 1 }),
    (0, express_validator_1.body)('url').isURL(),
    (0, express_validator_1.body)('username').trim().isLength({ min: 1 }),
    (0, express_validator_1.body)('applicationPassword').trim().isLength({ min: 1 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { name, url, username, applicationPassword } = req.body;
        const userId = req.user.id;
        // Test the connection
        const isConnected = await testWordPressConnection(url, username, applicationPassword);
        if (!isConnected) {
            return res.status(400).json({ error: 'Failed to connect to WordPress site. Please check your credentials.' });
        }
        // Check if site already exists for this user
        const existingSite = await BlogSite_1.default.findOne({
            where: { userId, url }
        });
        if (existingSite) {
            // Update existing site
            await existingSite.update({
                name,
                username,
                applicationPassword,
                isActive: true
            });
            res.json({
                message: 'Site connection updated successfully',
                site: existingSite.toJSON()
            });
        }
        else {
            // Create new site connection
            const site = await BlogSite_1.default.create({
                userId,
                name,
                url,
                username,
                applicationPassword
            });
            res.status(201).json({
                message: 'Site connected successfully',
                site: site.toJSON()
            });
        }
    }
    catch (error) {
        console.error('Site connection error:', error);
        res.status(500).json({ error: 'Failed to connect site' });
    }
});
// Get connected sites
router.get('/sites', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const sites = await BlogSite_1.default.findAll({
            where: { userId, isActive: true },
            order: [['createdAt', 'DESC']]
        });
        res.json({
            sites: sites.map(site => site.toJSON())
        });
    }
    catch (error) {
        console.error('Get sites error:', error);
        res.status(500).json({ error: 'Failed to fetch sites' });
    }
});
// Test connection to a site
router.post('/test/:siteId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { siteId } = req.params;
        const userId = req.user.id;
        const site = await BlogSite_1.default.findOne({
            where: { id: siteId, userId }
        });
        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }
        const isConnected = await testWordPressConnection(site.url, site.username, site.applicationPassword);
        res.json({
            connected: isConnected,
            message: isConnected ? 'Connection successful' : 'Connection failed'
        });
    }
    catch (error) {
        console.error('Test connection error:', error);
        res.status(500).json({ error: 'Failed to test connection' });
    }
});
// Delete site connection
router.delete('/sites/:siteId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { siteId } = req.params;
        const userId = req.user.id;
        const site = await BlogSite_1.default.findOne({
            where: { id: siteId, userId }
        });
        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }
        await site.update({ isActive: false });
        res.json({ message: 'Site disconnected successfully' });
    }
    catch (error) {
        console.error('Delete site error:', error);
        res.status(500).json({ error: 'Failed to disconnect site' });
    }
});
exports.default = router;
//# sourceMappingURL=site.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("./database");
const User_1 = __importDefault(require("./User"));
class BlogSite extends sequelize_1.Model {
    // Method to get WordPress API base URL
    getApiBaseUrl() {
        const cleanUrl = this.url.replace(/\/$/, '');
        return `${cleanUrl}/wp-json/wp/v2`;
    }
    // Method to get basic auth header for WordPress API
    getAuthHeader() {
        const credentials = Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64');
        return `Basic ${credentials}`;
    }
    toJSON() {
        const { applicationPassword, ...siteWithoutPassword } = super.toJSON();
        return siteWithoutPassword;
    }
}
BlogSite.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id',
        },
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 100],
        },
    },
    url: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            isUrl: true,
        },
    },
    username: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 100],
        },
    },
    applicationPassword: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 255],
        },
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'blog_sites',
});
// Define associations
User_1.default.hasMany(BlogSite, { foreignKey: 'userId', as: 'blogSites' });
BlogSite.belongsTo(User_1.default, { foreignKey: 'userId', as: 'user' });
exports.default = BlogSite;
//# sourceMappingURL=BlogSite.js.map
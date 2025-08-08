"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("./database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class User extends sequelize_1.Model {
    // Instance methods
    async validatePassword(password) {
        return bcryptjs_1.default.compare(password, this.password);
    }
    toJSON() {
        const { password, ...userWithoutPassword } = super.toJSON();
        return userWithoutPassword;
    }
}
User.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [6, 100],
        },
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 100],
        },
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'users',
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcryptjs_1.default.genSalt(10);
                user.password = await bcryptjs_1.default.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcryptjs_1.default.genSalt(10);
                user.password = await bcryptjs_1.default.hash(user.password, salt);
            }
        },
    },
});
exports.default = User;
//# sourceMappingURL=User.js.map
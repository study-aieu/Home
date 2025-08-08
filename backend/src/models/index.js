const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize(process.env.DATABASE_URL || {
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require('./user')(sequelize, Sequelize);
db.Blog = require('./blog')(sequelize, Sequelize);

db.User.hasOne(db.Blog, { foreignKey: 'userId' });
db.Blog.belongsTo(db.User, { foreignKey: 'userId' });

module.exports = db;
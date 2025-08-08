const User = require('./User');
const BlogSite = require('./BlogSite');

// Define associations
User.hasMany(BlogSite, {
  foreignKey: 'userId',
  as: 'blogSites',
});

BlogSite.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

module.exports = {
  User,
  BlogSite,
};
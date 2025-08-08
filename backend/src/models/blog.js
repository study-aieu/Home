module.exports = (sequelize, DataTypes) => {
  const Blog = sequelize.define('Blog', {
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    appPassword: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return Blog;
};
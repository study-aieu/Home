module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: { isEmail: true },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return User;
};
const { Sequelize } = require('sequelize');
const path = require('path');

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_URL || path.join(__dirname, '..', 'database.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

// Test the connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

module.exports = { sequelize, testConnection };
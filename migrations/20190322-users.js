'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      discord_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false
      },
      private_key: {
        type: Sequelize.STRING,
        allowNull: false
      },
      sent: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      received: {
        type: Sequelize.FLOAT,
        allowNull: true
      }
    });
  },

  down: (queryInterface, Sequelize) => {
      return queryInterface.dropTable('users');
  }
};


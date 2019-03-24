"use strict";

module.exports = function(sequelize, DataTypes) {
  var Users = sequelize.define('Users', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    discord_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    private_key: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sent: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    received: {
      type: DataTypes.FLOAT,
      allowNull: true
    }
  }, {
    tableName: 'users', timestamps : false
  });

  return Users;
};

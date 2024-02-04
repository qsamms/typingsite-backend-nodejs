const { Sequelize, DataTypes } = require("sequelize");
require("dotenv").config({ path: "./process.env" });

const sequelize = new Sequelize(
  "typingsite",
  `${process.env.POSTGRES_USERNAME}`,
  `${process.env.POSTGRES_PASSWORD}`,
  {
    host: "localhost",
    dialect: "postgres",
    logging: false, // Disable logging SQL queries
  }
);

module.exports = sequelize;

const User = sequelize.define("User", {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const Game = sequelize.define("Game", {
  time: {
    type: DataTypes.REAL,
    allowNull: false,
  },
  words: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  numWords: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  wpm: {
    type: DataTypes.REAL,
    allowNull: false,
  },
  accuracy: {
    type: DataTypes.REAL,
    allowNull: false,
  },
  mistakes: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  datetime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
});

Game.belongsTo(User, {
    foreignKey: 'userId',
    allowNull: false,
})

const synchronize = async () => {
  await sequelize.sync({ alter: true });
};
synchronize();
console.log("All Tables were (re) created");

module.exports = {
  sequelize,
  User,
  Game,
};

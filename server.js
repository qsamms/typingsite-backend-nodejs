require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const bodyParser = require("body-parser");
const cors = require("cors");
const { sequelize, User, Game } = require("./db");
const app = express();
const port = 5005;

// Mongo DB config
mongoose.connect("mongodb://localhost:27017/typingsite", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// App config
app.use(bodyParser.json());
app.use(cors());
app.use(
  session({
    secret: `${process.env.SECRET_KEY}`,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: "mongodb://localhost:27017/typingsite",
    }),
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour
      secure: false,
      httpOnly: true,
    },
  })
);

const sessionSchema = new mongoose.Schema({
  _id: String,
  session: Object,
});
const Session = mongoose.model("Session", sessionSchema);

// ROUTES
app.get("/api/user-stats", async (req, res) => {
  const { sessionid } = req.headers;

  try {
    const result = await Session.findOne({ _id: sessionid });
    console.log(result);
    if (result) {
      const json_result = JSON.parse(result.session);
      const usr = json_result.user;
      const user = await User.findOne({ where: { email: usr.email } });

      const games = await Game.findAll({
        where: { userId: user.id },
        order: [["createdAt", "ASC"]],
      });
      const filteredGames = games.slice(-10);
      const wpmList = games.map(game => game.wpm);
      const accuracyList = games.map(game => game.accuracy);
      const highestWPM = Math.max(...wpmList);
      const sum = wpmList.reduceRight((acc, val) => acc + val, 0);
      const highestAccuracy = Math.max(...accuracyList);
      const accuracysum = accuracyList.reduce((acc, val ) => acc + val, 0);
      let wordsSum = 0;
      const totalWords = games.forEach(game => wordsSum += game.numWords)

      const data = {
        gamesCompleted: games.length,
        highestWPM: highestWPM,
        averageWPM: sum / wpmList.length,
        highestAccuracy: highestAccuracy,
        averageAccuracy: accuracysum / accuracyList.length,
        totalWords: wordsSum,
      }

      res.status(200).json({ games: filteredGames, data: data });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/game", async (req, res) => {
  const { sessionId, game } = req.body;

  try {
    const result = await Session.findOne({ _id: sessionId });
    if (result) {
      const json_result = JSON.parse(result.session);
      const user = json_result.user;

      const userObj = await User.findOne({ where: { email: user.email } });
      const gameObj = await Game.create({
        words: game.words,
        accuracy: game.accuracy,
        mistakes: game.mistakes,
        numWords: game.numWords,
        wpm: game.wpm,
        time: game.time,
        userId: userObj.id,
      });
      res
        .status(200)
        .json({ message: "Game successfully saved", game: gameObj });
    } else {
      res.status(400).json({ message: "No active session" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/session", async (req, res) => {
  const { sessionId } = req.body;

  try {
    const result = await Session.findOne({ _id: sessionId });
    if (result) {
      const json_result = JSON.parse(result.session);
      const user = json_result.user;
      res.status(200).json({
        loggedIn: true,
        message: "Active session available",
        user: {
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
        },
      });
    } else {
      res
        .status(200)
        .json({ loggedIn: false, message: "No active session available" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/logout", async (req, res) => {
  const { sessionId } = req.body;
  const result = await Session.findOneAndDelete({ _id: sessionId });
  if (result) {
    res.status(200).json({ success: true });
  } else {
    res.status(404), json({ success: false, message: "No session was found" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({
      where: {
        email: email,
        password: password,
      },
    });
    if (user) {
      req.session.user = user;
      await req.session.save();
      res.status(200).json({
        success: true,
        message: "Login successful",
        sessionId: req.sessionID,
        user: user,
      });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (error) {
    console.error("Error searching for user", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/sign-up", async (req, res) => {
  const { username, password, email } = req.body;

  try {
    const user = await User.findOne({
      where: {
        email: email,
      },
    });
    if (user) {
      res.status(409).json({
        success: false,
        message: `The email ${email} alredy exists in the system, please provide a unique email or navigate to the login page.`,
      });
    }
  } catch (error) {
    console.error("Error searching for user", error);
    res.status(500).json({ message: "Internal server error" });
  }

  try {
    const user = await User.create({
      username: username,
      email: email,
      password: password,
    });
    console.log(user);
    res
      .status(200)
      .json({ success: true, message: "User successfully created" });
  } catch (error) {
    console.error("Error inserting data", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

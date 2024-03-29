const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const shortid = require("shortid");

mongoose.connect(process.env.MLAB_URI, { useNewUrlParser: true });
console.log("mongoose connection readyState", mongoose.connection.readyState);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

const UserSchema = new mongoose.Schema({
  username: String,
  _id: { type: String, unique: true, default: shortid.generate }
});
const UserModel = mongoose.model("UserModel", UserSchema);

const ExerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: Date,
  userid: String,
  _id: { type: String, unique: true, default: shortid.generate }
});
const ExerciseModel = mongoose.model("ExerciseModel", ExerciseSchema);

app.post("/api/exercise/new-user", (req, res) => {
  UserModel.findOne({ username: req.body.username })
    .then(user => {
      if (user) res.status(400).send("username already taken");
      return UserModel.create({ username: req.body.username });
    })
    .then(user => {
      res.json({ username: user.username, _id: user._id });
    })
    .catch(err => res.status(500).json({ error: err }));
});

app.post("/api/exercise/add", (req, res) => {
  var user;
  UserModel.findOne({ _id: req.body.userId })
    .then(user => {
      if (!user) res.status(400).send("unknown _id");
      if (!req.body.duration) res.status(400).send("unknown duration");
      if (!req.body.duration) res.status(400).send("unknown description");
      user = user; //
      return Promise.all([
        user,
        ExerciseModel.create({
          userid: req.body.userId,
          description: req.body.description,
          duration: req.body.duration,
          date: req.body.date ? new Date(req.body.date) : new Date()
        })
      ]);
    })
    .then(([user, exercise]) => {
      res.json({
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        _id: user._id,
        date: exercise.date.toDateString()
      });
    })
    .catch(err => res.status(500).json({ error: err }));
});

app.get("/api/exercise/users", (req, res) => {
  UserModel.find()
    .then(user => res.json(user))
    .catch(err => res.status(500).json({ error: err }));
});

app.get("/api/exercise/log", (req, res) => {
  if (!req.query.userId) res.status(400).send("unknown userId");
  UserModel.findOne({ _id: req.query.userId })
    .then(user => {
      let query = {};
      query.userid = req.query.userId;
      if (req.query.from || req.query.to) {
        query.date = {};
        if (req.query.from) query.date.$gte = new Date(req.query.from);
        if (req.query.to) query.date.$lte = new Date(req.query.to);
      }
      console.log(query);
      return Promise.all([
        { _id: req.query.userId, username: user.username },
        ExerciseModel.find(query)
          .select("-_id description duration date")
          .sort({ date: query.date ? 1 : 0 })
          .limit(Number(req.query.limit) ? Number(req.query.limit) : 0)
      ]);
    })
    .then(([data, exercise]) => {
      data.count = exercise.length;
      data.log = exercise.map(d => (d.date = d.date.toDateString()));
      res.json(data);
    })
    .catch(err => res.status(500).json({ error: err }));
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;
  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

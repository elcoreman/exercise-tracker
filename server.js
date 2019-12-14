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
  _id: { type: String, default: shortid.generate }
});
const UserModel = mongoose.model("UserModel", UserSchema);

const ExerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: String
});
const ExerciseModel = mongoose.model("ExerciseModel", ExerciseSchema);

app.post("/api/exercise/new-user", (req, res) => {
  UserModel.findOne({ username: req.body.username }, (err, data) => {
    if (err) console.log(err);
    if (data) {
      res.status(400).send("username already taken");
    } else {
      UserModel.create({ username: req.body.username }, (err, data) => {
        if (err) console.log(err);
        res.json({ username: data.username, _id: data._id });
      });
    }
  });
});

app.post("/api/exercise/add", (req, res) => {
  UserModel.findOne({ _id: req.body.userId })
    .then(data => {
      if (!data) res.status(400).send("unknown _id");
      if (!req.body.duration) res.status(400).send("unknown duration");
      if (!req.body.duration) res.status(400).send("unknown description");
      return ExerciseModel.create({
        username: req.body.username,
        description: req.body.description,
        duration: req.body.duration,
        date: new Date(req.body.date).toDateString() || new Date().toDateString()
      });
    })
    .then(data => {
      res.json({
        username: data.username,
        description: data.description,
        duration: data.duration,
        _id: data._id,
        date: data.date
      });
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

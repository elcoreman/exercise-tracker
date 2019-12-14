const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");

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
  username: String
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
      UserModel.create({username});
    }
  });
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

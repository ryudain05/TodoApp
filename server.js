const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
const MongoClient = require("mongodb").MongoClient;
app.set("view engine", "ejs");
require("dotenv").config();

var db;
MongoClient.connect(process.env.MongoDB, (err, client) => {
  if (err) return console.log(err);
  db = client.db("todoapp");

  app.listen(process.env.POST, () => {
    console.log("3000 sever start");
  });
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/write", (req, res) => {
  res.sendFile(__dirname + "/write.html");
});

app.post("/add", (req, res) => {
  res.send("전송완료");
  db.collection("counter").findOne({ name: "게시물갯수" }, (err, result) => {
    console.log(result.totalPost);
    const totalPost = result.totalPost;

    db.collection("post").insertOne(
      { _id: totalPost + 1, 제목: req.body.title, 날짜: req.body.date },
      (err, result) => {
        console.log("저장완료");
        //counter라는 콜렉션에 있는 totalPost 라는 항목도 1 증가시켜야함 (수정)
        db.collection("counter").updateOne(
          { name: "게시물갯수" },
          { $inc: { totalPost: 1 } },
          (err, result) => {
            if (err) return console.log(err);
          }
        );
      }
    );
  });
});

app.get("/list", (req, res) => {
  db.collection("post")
    .find()
    .toArray((err, result) => {
      console.log(result);
      res.render("list.ejs", { posts: result });
    });
});

app.delete("/delete", (req, res) => {
  console.log(req.body);
  req.body._id = parseInt(req.body._id);

  db.collection("post").deleteOne(req.body, (err, result) => {
    console.log("삭제완료");
    res.status(200).send({ message: "성공했습니다 ! " });
  });
});

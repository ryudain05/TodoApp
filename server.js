const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const MongoClient = require("mongodb").MongoClient;
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
app.set("view engine", "ejs");
require("dotenv").config();

//미들웨어
app.use("/public", express.static("public"));

var db;
MongoClient.connect(process.env.MongoDB, (err, client) => {
  if (err) return console.log(err);
  db = client.db("todoapp");

  app.listen(3000, () => {
    console.log("3000 sever start");
  });
});

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/write", (req, res) => {
  res.render("write.ejs");
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

app.get("/detail/:id", (req, res) => {
  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    (err, result) => {
      console.log(result);
      res.render("detail.ejs", { data: result });
    }
  );
});

app.get("/edit/:id", (req, res) => {
  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    (err, result) => {
      console.log(result);
      res.render("edit.ejs", { result: result });
    }
  );
});

app.put("/edit", (req, res) => {
  //$set = 업데이트 해주세요. 없으면 추가해주세요
  db.collection("post").updateOne(
    { _id: parseInt(req.body.id) },
    { $set: { 제목: req.body.title, 날짜: req.body.date } },
    (err, result) => {
      console.log(result.date);
      res.redirect("/list");
    }
  );
});

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");

//미들웨어
app.use(
  session({ secret: "made in dain", resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/fail",
  }),
  (req, res) => {
    res.redirect("/");
  }
);

passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "pw",
      session: true,
      passReqToCallback: false,
    },
    (id, pw, done) => {
      //console.log(id, pw);
      db.collection("login").findOne({ id: id }, function (err, result) {
        if (err) return done(err);

        if (!result)
          return done(null, false, { message: "존재하지않는 아이디요" });
        if (pw == result.pw) {
          return done(null, result);
        } else {
          return done(null, false, { message: "비번틀렸어요" });
        }
      });
    }
  )
);

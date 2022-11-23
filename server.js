const express = require("express");
const app = express();

const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);

const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const MongoClient = require("mongodb").MongoClient;
const methodOverride = require("method-override");
const { ObjectId } = require("mongodb");
app.use(methodOverride("_method"));
app.set("view engine", "ejs");
require("dotenv").config();

//미들웨어
app.use("/public", express.static("public"));

var db;
MongoClient.connect(process.env.MongoDB, (err, client) => {
  if (err) return console.log(err);
  db = client.db("todoapp");

  http.listen(3000, () => {
    console.log("3000 sever start");
  });
});

//메인페이지
app.get("/", (req, res) => {
  res.render("index.ejs");
});

//글쓰기
app.get("/write", (req, res) => {
  res.render("write.ejs");
});

app.get("/list", (req, res) => {
  db.collection("post")
    .find()
    .toArray((err, result) => {
      console.log(result);
      res.render("list.ejs", { posts: result });
    });
});

//:id를 사용해서 파라미터 가져오기
app.get("/detail/:id", (req, res) => {
  db.collection("post").findOne(
    //파라미터값이 string 형변환시켜주기
    { _id: parseInt(req.params.id) },
    (err, result) => {
      console.log(result);
      //결과값 data에 담기
      res.render("detail.ejs", { data: result });
    }
  );
});

//params 받아와서 ejs에 저장된 제목, 날짜 띄우기
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
app.use(session({ secret: "dain", resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

//미들웨어를 통해 검증
app.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/fail" }),
  (req, res) => {
    res.redirect("/");
  }
);

//미들웨어 추가
app.get("/mypage", login, (req, res) => {
  console.log(req.user);
  res.render("mypage.ejs", { user: req.user });
});

function login(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.render("login.ejs");
  }
}

//미들웨어
passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "pw",
      session: true,
      passReqToCallback: false,
    },
    (id, pw, done) => {
      //아이디, 비번 찾기
      db.collection("login").findOne({ id: id }, (err, result) => {
        if (err) return done(err);

        if (!result)
          //done(서버에러, 성공시 사용자 DB데이터(실패면 false), 에러메시지)
          return done(null, false, { message: "존재하지않는 아이디입니다." });
        if (pw == result.pw) {
          return done(null, result);
        } else {
          return done(null, false, { message: "비밀번호가 맞지 않습니다." });
        }
      });
    }
  )
);

//id를 이용해서 세션을 저장
passport.serializeUser((user, done) => {
  done(null, user.id);
});
//마이페이지 접속시 발동 (어떤 유저인지 해석)
passport.deserializeUser((id, done) => {
  db.collection("login").findOne({ id: id }, (err, result) => {
    done(null, result);
  });
});

app.post("/register", (req, res) => {
  db.collection("login").insertOne(
    { id: req.body.id, pw: req.body.pw },
    (err, result) => {
      res.redirect("/");
    }
  );
});

//글 추가
app.post("/add", (req, res) => {
  res.send("전송완료");
  //totalPost 변수에 담아서 사용
  db.collection("counter").findOne({ name: "게시물갯수" }, (err, result) => {
    console.log(result.totalPost);
    const totalPost = result.totalPost;

    var save = {
      _id: totalPost + 1,
      제목: req.body.title,
      날짜: req.body.date,
      작성자: req.user._id,
    };
    db.collection("post").insertOne(save, (err, result) => {
      console.log("저장완료");
      //counter라는 콜렉션에 있는 totalPost 라는 항목도 1 증가시켜야함 (수정)
      db.collection("counter").updateOne(
        { name: "게시물갯수" },
        { $inc: { totalPost: 1 } },
        (err, result) => {
          if (err) return console.log(err);
        }
      );
    });
  });
});

//글 삭제
app.delete("/delete", (req, res) => {
  console.log(req.body);
  //type 전환 유의하기
  req.body._id = parseInt(req.body._id);

  var deleteData = { _id: req.body._id, 작성자: req.user._id };

  db.collection("post").deleteOne(deleteData, (err, result) => {
    console.log("삭제완료");
    if (err) {
      console.log(err);
    }
    res.status(200).send({ message: "성공했습니다 ! " });
  });
});

app.get("/search", (req, res) => {
  var 검색조건 = [
    {
      $search: {
        index: "titleSearch",
        text: {
          query: req.query.value,
          path: "제목", // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        },
      },
    },
    //정렬
    { $sort: { _id: 1 } },
    //글 제한 10 개로
    { $limit: 10 },
    //검색결과에 필터주기 score 달라고하면 줌
    //{ $project: { 제목: 1, _id: 0, score: { $meta: "searchScore" } } },
  ];

  db.collection("post")
    //검색조건여러개가능
    .aggregate(검색조건)
    .toArray((err, result) => {
      res.render("search.ejs", { posts: result });
    });
});

//shop파일 첨부, app.use(미들웨어) /경로로 이동하면 미들웨어 적용
app.use("/shop", require("./routes/shop.js"));
app.use("/board/sub", require("./routes/board.js"));

let multer = require("multer");
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/image");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
  filefilter: (req, file, cb) => {
    var ext = path.extname(file.originalname);
    if (ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg") {
      return callback(new Error("PNG, JPG만 업로드하세요"));
    }
    callback(null, true);
  },
  limits: {
    fileSize: 1024 * 1024,
  },
});

var upload = multer({ storage: storage });

app.get("/upload", (req, res) => {
  res.render("upload.ejs");
});

app.post("/upload", upload.array("upload"), (req, res) => {
  res.send("업로드가 되었습니다.");
});

app.get("/image/:imageName", (req, res) => {
  res.sendFile(__dirname + "/public/image/" + req.params.imageName);
});

app.get("/chat", login, (req, res) => {
  db.collection("chatroom")
    .find({ member: req.user._id })
    .toArray()
    .then((result) => {
      res.render("chat.ejs", { data: result });
    });
});

//채팅방 개설
app.post("/chatroom", login, (req, res) => {
  var save = {
    title: "채팅방",
    member: [ObjectId(req.body.Tid), req.user._id],
    date: new Date(),
  };

  db.collection("chatroom")
    .insertOne(save)
    .then(function (result) {
      res.send("채팅방 발행 성공");
    });
});

//메시지 발행
app.post("/message", login, (req, res) => {
  var save = {
    parent: req.body.parent,
    userid: req.user._id,
    content: req.body.content,
    date: new Date(),
  };
  db.collection("message")
    .insertOne(save)
    .then(() => {
      console.log("성공");
      res.send("DB저장 성공");
    });
});

app.get("/message/:id", login, (req, res) => {
  res.writeHead(200, {
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });
  db.collection("message")
    .find({ parent: req.params.id })
    .toArray()
    .then((result) => {
      res.write("event: test\n");
      res.write(`data: ${JSON.stringify(result)}\n\n`);
    });

  //DB 실시간 업데이트
  const pipeline = [{ $match: { "fullDocument.parent": req.params.id } }];
  const changeStream = db.collection("message").watch(pipeline);
  //일종의 이벤트리스너
  changeStream.on("change", (result) => {
    var plusDoc = [result.fullDocument];
    res.write(`data: ${JSON.stringify(plusDoc)}\n\n`);
  });
});

//socket채팅방 만들기
app.get("/socket", (req, res) => {
  res.render("socket.ejs");
});

io.on("connection", (socket) => {
  console.log("유저접속성공");

  socket.on("user-send", function (data) {
    console.log(data);
    //socket id 유저 정보 가져와서 보여줌
    io.to(socket.id).emit("broadcast", data);
  });
});

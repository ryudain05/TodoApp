var router = require("express").Router();
// require("/shop.js");

function login(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.render("login.ejs");
  }
}

//모든 router에 미들웨어 적용
//router.use(login);
//특정 router에 미들웨어 적용
router.use("shirts", login);

router.get("/shirts", (req, res) => {
  res.send("셔츠 파는 페이지");
});

router.get("/pants", (req, res) => {
  res.send("바지 파는 페이지");
});

//javacsript 파일을 다른 파일에서 가져올때 사용함, module.exports = 변수명
module.exports = router;

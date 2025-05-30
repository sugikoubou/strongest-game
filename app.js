var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// Firebase Admin SDK のインポートと初期化
var admin = require("firebase-admin");
// ↓↓↓ サービスアカウントキーのJSONファイルへのパスを指定してください ↓↓↓
var serviceAccount = require("./strongest-game-key.json"); // 例: ./serviceAccountKey.json

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // ↓↓↓ Realtime DatabaseのURLを指定してください (Firebaseコンソールで確認できます) ↓↓↓
    databaseURL: "https://strongest-game-default-rtdb.firebaseio.com/" // 例: "https://strongest-game.firebaseio.com"
  });
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
  // エラー処理: 初期化に失敗した場合、アプリの起動を中止するなどの対応
  process.exit(1);
}


var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users'); //

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views')); //
app.set('view engine', 'pug'); //

app.use(logger('dev')); //
app.use(express.json()); //
app.use(express.urlencoded({ extended: false })); //
app.use(cookieParser()); //
app.use(express.static(path.join(__dirname, 'public'))); //

// indexRouter に Firebase Admin の db インスタンスを渡せるようにする
// (ミドルウェアを使うか、直接渡すかは設計によります)
app.use(function(req, res, next){
  req.db = admin.database(); // Realtime Databaseの参照をリクエストオブジェクトに追加
  next();
});

app.use('/', indexRouter); //
// app.use('/users', usersRouter); //

// catch 404 and forward to error handler
app.use(function(req, res, next) { //
  next(createError(404)); //
});

// error handler
app.use(function(err, req, res, next) { //
  // set locals, only providing error in development
  res.locals.message = err.message; //
  res.locals.error = req.app.get('env') === 'development' ? err : {}; //

  // render the error page
  res.status(err.status || 500); //
  res.render('error'); //
});

module.exports = app; //
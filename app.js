var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const { GoogleGenerativeAI } = require("@google/generative-ai");
let genAI, generativeModelInstance; // グローバルまたはappのローカル変数として保持


// Firebase Admin SDK のインポートと初期化
var admin = require("firebase-admin");
// ↓↓↓ サービスアカウントキーのJSONファイルへのパスを指定してください ↓↓↓
let serviceAccount; // 変数をletで宣言

try {
  if (process.env.GAME_JSON) {
    // Render環境など、環境変数からJSON文字列をパースして使用
    console.log("Found GAME_JSON environment variable."); // デバッグ用ログ
    serviceAccount = JSON.parse(process.env.GAME_JSON); // ★★★ ここが重要 ★★★
  } else {
    // ローカル開発環境など、直接ファイルを読み込む場合 (フォールバック)
    // このパスはローカルでのファイル配置に合わせてください
    console.log("GAME_JSON not found, trying local file require."); // デバッグ用ログ
    serviceAccount = require("./strongest-game-key.json"); // 例: ローカルのファイルパス
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
  console.log("Firebase Admin SDK initialized successfully.");

} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
  if (error instanceof SyntaxError && process.env.GAME_JSON) {
    console.error("Failed to parse GAMET_JSON. Ensure it's a valid JSON string.");
  } else if (error.code === 'MODULE_NOT_FOUND' && !process.env.GAME_JSON) {
    console.error("Local service account key file not found and GAME_JSON environment variable is not set.");
  }
  process.exit(1);
}


var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users'); //

var app = express();




// app.js の冒頭あたり

if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    generativeModelInstance = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-latest",
        generationConfig: {
            responseMimeType: "application/json",
        }
    });
    
    console.log("Google AI SDK (generativeModelInstance) initialized in app.js.");
} else {
    console.warn("GEMINI_API_KEY is not set in app.js. AI battle functionality will be disabled.");
}

// ミドルウェアで generativeModel をリクエストオブジェクトに追加
app.use(function(req, res, next){
  req.db = admin.database(); // 既存のDB参照
  if (generativeModelInstance) {
    req.generativeModel = generativeModelInstance; // Geminiモデルの参照を追加
  }
  next();
});



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
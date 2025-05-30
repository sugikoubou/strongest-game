// 1. 必要なモジュールの require
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var admin = require("firebase-admin"); // Firebase Admin SDK
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Google AI SDK

// ルーターの require
var indexRouter = require('./routes/index');

// 2. Express アプリケーションのインスタンス化 (最優先事項の一つ)
var app = express(); // ← これが app.use より必ず先に来る必要があります

// 3. SDK の初期化
// Firebase Admin SDK 初期化
try {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) { // Render の環境変数からJSON文字列を読み込む場合
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else { // ローカル開発用にファイルパスから読み込む場合など
    serviceAccount = require("./your-service-account-key.json"); // 実際のファイルパスに置き換えてください
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL // 環境変数で設定
  });
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
  // 起動を中止するなどの処理が必要な場合
  process.exit(1);
}

// Google AI SDK (Gemini) 初期化
let generativeModelInstance;
if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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

// 4. ビューエンジンの設定
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// 5. 標準的なミドルウェアの使用 (app の初期化後)
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'))); // ← この行がエラー箇所(line 26)の可能性

// 6. カスタムミドルウェア (DB参照やAIモデルをリクエストに追加)
app.use(function(req, res, next){
  req.db = admin.database(); // Realtime Databaseの参照
  if (generativeModelInstance) {
    req.generativeModel = generativeModelInstance; // Geminiモデルの参照
  }
  next();
});

// 7. ルーターのマウント
app.use('/', indexRouter);
// app.use('/users', usersRouter); // 必要であれば

// 8. 404エラーハンドラと通常のエラーハンドラ
app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// 9. モジュールのエクスポート
module.exports = app;
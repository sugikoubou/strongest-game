const express = require('express')
const app = express()
const port = process.env.PORT || 3000
var router = express.Router();

var LoremIpsum = require('lorem-ipsum').LoremIpsum;

var lorem = new LoremIpsum({
  sentencesPerParagraph: {
    max: 8,
    min: 4
  },
  wordsPerSentence: {
    max: 16,
    min: 4
  }
});

router.get('/data-from-db', async function(req, res, next) {
  try {
    const dbRef = req.db.ref("path/to/your/data"); // 読み込みたいデータのパスを指定
    const snapshot = await dbRef.once("value");
    const data = snapshot.val();
    res.render('database_view', { title: 'Data from Realtime DB', data: data }); // 新しいPugテンプレートを作成想定
  } catch (error) {
    console.error("Error fetching data from Realtime DB:", error);
    next(error);
  }
});



// routes/index.js

router.get('/', async function(req, res, next) {
  const userId = req.query.userId || 'defaultUser'; // 適切なユーザー識別方法
  let successMessage = null;
  if (req.query.success === 'char_created') {
    successMessage = 'キャラクターが正常に作成されました！';
  }

  try {
    const charactersRef = req.db.ref(`users/${userId}/characters`).orderByChild('createdAt'); // 例: 作成日時でソート
    // または全ユーザー共通の場合
    // const charactersRef = req.db.ref("characters").orderByChild('createdAt');

    const snapshot = await charactersRef.once('value');
    const charactersData = snapshot.val();
    const charactersList = [];
    if (charactersData) {
      for (const key in charactersData) {
        charactersList.push({
          id: key,
          name: charactersData[key].name,
          ability: charactersData[key].ability,
          strength: charactersData[key].strength,
          intelligence: charactersData[key].intelligence,
          agility: charactersData[key].agility,
          wins: charactersData[key].wins || 0, // winsが未定義の場合0
          losses: charactersData[key].losses || 0 // lossesが未定義の場合0
        });
      }
    }
    // createdAtでソートした場合は、逆順にして新しいものが上に来るようにする例
    // charactersList.reverse();

    // Pugテンプレートに渡す locals オブジェクトに characters を含める
    res.render('index', {
      title: 'キャラクター対戦ゲーム',
      userId: userId,
      characters: charactersList, // 取得したキャラクターリスト
      success: successMessage,
      error: null // エラーメッセージ用の変数も用意
      // ... 他の必要なデータ
    });
  } catch (error) {
    console.error("Error fetching characters for index page:", error);
    next(error);
  }
});



// Realtime Databaseにデータを書き込む例 (フォームからのPOSTを想定)
router.post('/save-data', async function(req, res, next) {
  try {
    const dataToSave = req.body; // POSTされたデータ (例: { name: "Test", value: 123 })
    const dbRef = req.db.ref("path/to/save/data"); // 保存先のパスを指定
    await dbRef.push(dataToSave); // pushは新しいユニークIDを生成してデータを追加
    // または、特定のキーで上書きする場合は .set() や .update() を使用
    // await dbRef.child("specificKey").set(dataToSave);
    res.redirect('/'); // 保存後にトップページなどにリダイレクト
  } catch (error) {
    console.error("Error saving data to Realtime DB:", error);
    next(error);
  }
});


// キャラクター作成処理 (戦績フィールド追加)
router.post('/create-character', async function(req, res, next) {
  try {
    // フォームからの入力を取得 (バリデーションは別途実装を推奨)
    const { charName, specialAbility, strength, intelligence, agility } = req.body;
    // ユーザーIDの取得（前回の例に基づき、ここではリクエストボディまたはクエリから取得）
    const userId = req.body.userId || req.query.userId || 'defaultUser'; // 適切なユーザー識別方法に置き換えてください

    const newCharacterData = {
      name: charName,
      ability: specialAbility,
      strength: parseInt(strength) || 0,
      intelligence: parseInt(intelligence) || 0,
      agility: parseInt(agility) || 0,
      wins: 0, // 初期勝利数
      losses: 0, // 初期敗北数
      createdAt: new Date().toISOString(), // 作成日時 (サーバータイムスタンプも利用可)
      // userId: userId // 必要であればキャラクターデータにユーザーIDも紐付ける
    };

    // Firebase Realtime Databaseに保存
    // 'characters' のパスは、ユーザーごとにデータを分ける場合は `users/${userId}/characters` のように変更
    const newCharRef = await req.db.ref(`users/${userId}/characters`).push(newCharacterData);
    // または、全ユーザー共通のキャラクターリストなら
    // const newCharRef = await req.db.ref("characters").push(newCharacterData);

    console.log("New character created with ID:", newCharRef.key);
    res.redirect(`/?userId=${encodeURIComponent(userId)}&success=char_created`); // 成功メッセージと共にリダイレクト
  } catch (error) {
    console.error("Error creating character:", error);
    const userId = req.body.userId || req.query.userId || 'defaultUser';
    // エラー発生時は、フォーム画面にエラーメッセージを表示するなどの処理
    // res.render('index', { error: 'キャラクターの作成に失敗しました。', userId: userId, /* 他の必要なデータ */ });
    next(error); // またはエラーハンドリングミドルウェアに渡す
  }
});



router.post('/battle', async function(req, res, next) {
  try {
    const { fighter1Id, fighter2Id } = req.body; // フォームから対戦するキャラのIDを取得
    // ユーザーIDの取得
    const userId = req.body.userId || req.query.userId || 'defaultUser';

    if (!fighter1Id || !fighter2Id || fighter1Id === fighter2Id) {
      // エラーハンドリング: 適切なキャラクターが選択されていない
      return res.status(400).send("対戦する2体の異なるキャラクターを選択してください。");
    }

    // キャラクターデータをDBから取得
    const fighter1Ref = req.db.ref(`users/${userId}/characters/${fighter1Id}`);
    const fighter2Ref = req.db.ref(`users/${userId}/characters/${fighter2Id}`);
    // または全ユーザー共通の場合
    // const fighter1Ref = req.db.ref(`characters/${fighter1Id}`);
    // const fighter2Ref = req.db.ref(`characters/${fighter2Id}`);


    const fighter1Snapshot = await fighter1Ref.once('value');
    const fighter2Snapshot = await fighter2Ref.once('value');

    if (!fighter1Snapshot.exists() || !fighter2Snapshot.exists()) {
      return res.status(404).send("指定されたキャラクターが見つかりません。");
    }

    const fighter1Data = fighter1Snapshot.val();
    const fighter2Data = fighter2Snapshot.val();

    // --- ここにGemini AIなどによる勝敗判定ロジックが入る ---
    // 仮にfighter1が勝利したとする
    let winnerId = fighter1Id;
    let loserId = fighter2Id;
    // let battleOutcome = await callGeminiToDetermineWinner(fighter1Data, fighter2Data);
    // winnerId = battleOutcome.winnerId; // Geminiからの結果を解析
    // loserId = battleOutcome.loserId;
    // --- 勝敗判定ロジックここまで ---

    // 戦績更新
    const winnerRef = req.db.ref(`users/${userId}/characters/${winnerId}/wins`);
    const loserRef = req.db.ref(`users/${userId}/characters/${loserId}/losses`);
    // または全ユーザー共通の場合
    // const winnerRef = req.db.ref(`characters/${winnerId}/wins`);
    // const loserRef = req.db.ref(`characters/${loserId}/losses`);

    // トランザクションを使って安全にインクリメントする (より堅牢)
    await winnerRef.transaction(currentWins => (currentWins || 0) + 1);
    await loserRef.transaction(currentLosses => (currentLosses || 0) + 1);

    console.log(`Battle result: ${winnerId} wins, ${loserId} loses. Stats updated.`);

    // 対戦結果を表示するページにリダイレクト、または結果をレンダリング
    res.render('battle_result', {
      winner: winnerId === fighter1Id ? fighter1Data.name : fighter2Data.name,
      loser: loserId === fighter1Id ? fighter1Data.name : fighter2Data.name,
      // ...他の結果情報
      userId: userId
    });

  } catch (error) {
    console.error("Error during battle:", error);
    next(error);
  }
});



// 既存のランダムページ生成ルートは、DBアクセスと共存可能
function randomPage(req, res) { //
  var seed = generateSeed(req.hostname + req.path); //

  var title = randomTitle(seed); //
  var paragraphs = randomParagraphs(seed); //
  var links = randomLinks(seed, req.hostname); //

  // この randomPage の中でDBからデータを取得してテンプレートに渡すことも可能
  // const dbDataSnapshot = await req.db.ref("some/other/path").once("value");
  // const dbData = dbDataSnapshot.val();

  res.render('random', {title: title, paragraphs: paragraphs, links: links /*, dbRelatedData: dbData */}); //
}

router.all('*', randomPage); //


module.exports = router;


app.get('/', (req, res) => res.send(lorem.generateParagraphs(7)))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

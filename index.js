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

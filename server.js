const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Google Maps API 金鑰
const GOOGLE_API_KEY = 'AIzaSyDtzCQsfABCh_mYLXxcuF7-1RBvR3EOJEY';

const app = express();
const port = 3000;

// 建立並連接 SQLite 資料庫
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) return console.error(err.message);
    console.log('✅ Connected to the users database.');
});

// 建立 users 表格（如果不存在）
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`);

// 中介軟體
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// 提供前端靜態檔案（HTML、CSS、JS）
app.use(express.static(path.join(__dirname, 'public')));

// ✅ 註冊 API
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '請輸入帳號與密碼' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: '這個帳號已經被使用' });
                }
                return res.status(500).json({ error: '伺服器錯誤' });
            }
            res.json({ message: '註冊成功' });
        });
    } catch (err) {
        res.status(500).json({ error: '註冊時發生錯誤' });
    }
});

// ✅ 登入 API
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '請輸入帳號與密碼' });
    }

    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, row) => {
        if (err) return res.status(500).json({ error: '伺服器錯誤' });
        if (!row) return res.status(400).json({ error: '查無此帳號' });

        const match = await bcrypt.compare(password, row.password);
        if (!match) return res.status(400).json({ error: '密碼錯誤' });

        res.json({ message: '登入成功' });
    });
});

// ✅ Google Maps API：取得附近餐廳
app.get('/api/restaurants', async (req, res) => {
    const { lat, lng, radius } = req.query;

    // 檢查必要參數是否存在且為數字
    if (!lat || !lng || !radius || isNaN(lat) || isNaN(lng) || isNaN(radius)) {
        console.warn('❌ 缺少或錯誤的參數：', { lat, lng, radius });
        return res.status(400).json({ error: '缺少 lat、lng 或 radius 參數，或格式錯誤' });
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=restaurant&key=${GOOGLE_API_KEY}`;

    try {
        const response = await axios.get(url);
        const results = response.data.results;

        if (!results || results.length === 0) {
            return res.status(200).json([]);
        }

        const restaurantNames = results.map(place => place.name);
        res.json(restaurantNames);
    } catch (error) {
        console.error('❌ 餐廳資料取得失敗:', error.message);
        res.status(500).json({ error: '無法取得餐廳資料' });
    }
});

// 啟動伺服器
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});

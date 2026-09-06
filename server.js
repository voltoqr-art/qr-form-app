const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database('data.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    socials TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const selectUserStmt = db.prepare('SELECT * FROM users WHERE uid = ?');
const upsertUserStmt = db.prepare(`
  INSERT INTO users (uid, name, phone, socials, updated_at)
  VALUES (@uid, @name, @phone, @socials, CURRENT_TIMESTAMP)
  ON CONFLICT(uid) DO UPDATE SET
    name = excluded.name,
    phone = excluded.phone,
    socials = excluded.socials,
    updated_at = CURRENT_TIMESTAMP
`);

app.get('/api/user/:uid', (req, res) => {
  try {
    const { uid } = req.params;
    const user = selectUserStmt.get(uid);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/user', (req, res) => {
  try {
    const { uid, name, phone, socials } = req.body;

    if (!uid || !name || !phone) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    upsertUserStmt.run({ uid, name, phone, socials: socials || '' });
    res.json({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/qr/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const targetUrl = `${req.protocol}://${req.get('host')}/?uid=${uid}`;
    res.setHeader('Content-Type', 'image/png');
    await QRCode.toFileStream(res, targetUrl);
  } catch (error) {
    res.status(500).send('Error generating QR code');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

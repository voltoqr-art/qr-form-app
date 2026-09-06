const express = require('express');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to Supabase (uses HTTP, compatible with Vercel)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.get('/api/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', uid)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/user', async (req, res) => {
  try {
    const { uid, name, phone, socials } = req.body;

    if (!uid || !name || !phone) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const { error } = await supabase
      .from('users')
      .upsert({ uid, name, phone, socials: socials || '' }, { onConflict: 'uid' });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

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

module.exports = app;

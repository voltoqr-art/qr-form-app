const express = require('express');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
    const { 
      uid, business_name, contact_name, phone, whatsapp, 
      facebook, instagram, tiktok, 
      google_maps, website, instapay, ewallet 
    } = req.body;

    if (!uid || !phone) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const payload = {
      uid,
      name: business_name || contact_name || 'Digital Card', // Fallback for legacy compatibility
      business_name: business_name || '',
      contact_name: contact_name || '',
      phone,
      whatsapp: whatsapp || '',
      facebook: facebook || '',
      instagram: instagram || '',
      tiktok: tiktok || '',
      google_maps: google_maps || '',
      website: website || '',
      instapay: instapay || '',
      ewallet: ewallet || ''
    };

    const { error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'uid' });

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

// 読む・学ぶ — Railway server
// Environment variables to set in Railway:
//   ANTHROPIC_API_KEY  — your Anthropic API key
//   APP_PASSWORD       — the password users must enter to access the app
//   SESSION_SECRET     — any long random string for signing session cookies

const express = require('express');
const session = require('express-session');
const path    = require('path');

const API_KEY        = process.env.ANTHROPIC_API_KEY || '';
const APP_PASSWORD   = process.env.APP_PASSWORD || 'yomu2024';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';
const PORT           = process.env.PORT || 3000;

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: false,
    sameSite: 'lax'
  }
}));

// ── Auth middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.redirect('/login');
}

// ── Login page ───────────────────────────────────────────────────────────────
app.get('/login', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>読む・学ぶ</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400&family=Crimson+Pro:ital,wght@0,300;1,300&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f5f0e8; font-family: 'Noto Serif JP', serif; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background-image: repeating-linear-gradient(0deg, transparent, transparent 31px, #d4ccb8 31px, #d4ccb8 32px); background-size: 100% 32px; }
  .box { background: white; border: 1px solid #d4ccb8; padding: 48px 40px; width: 100%; max-width: 360px; box-shadow: 3px 3px 0 #d4ccb8; text-align: center; }
  h1 { font-size: 1.8rem; font-weight: 300; letter-spacing: 0.3em; margin-bottom: 6px; }
  p { font-family: 'Crimson Pro', serif; font-style: italic; color: #8a7f6e; margin-bottom: 28px; }
  input { width: 100%; padding: 12px; border: 1px solid #d4ccb8; background: #f5f0e8; font-size: 1rem; margin-bottom: 12px; outline: none; }
  input:focus { border-color: #1a1410; }
  button { width: 100%; padding: 12px; background: #1a1410; color: #f5f0e8; border: none; cursor: pointer; font-family: 'Crimson Pro', serif; font-size: 1rem; letter-spacing: 0.05em; }
  .error { color: #9b2335; font-family: 'Crimson Pro', serif; font-style: italic; font-size: 0.9rem; margin-bottom: 12px; }
</style>
</head>
<body>
<div class="box">
  <h1>読む・学ぶ</h1>
  <p>Japanese Vocabulary Practice</p>
  ${req.query.error ? '<div class="error">Incorrect password — try again.</div>' : ''}
  <form method="POST" action="/login">
    <input type="password" name="password" placeholder="Password" autofocus />
    <button type="submit">Enter →</button>
  </form>
</div>
</body>
</html>`);
});

app.post('/login', (req, res) => {
  if (req.body.password === APP_PASSWORD) {
    req.session.authenticated = true;
    res.redirect('/');
  } else {
    res.redirect('/login?error=1');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ── API proxy ────────────────────────────────────────────────────────────────
app.post('/api/chat', requireAuth, async (req, res) => {
  if (!API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set on server.' });
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: req.body.messages
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Static files (index.html, practice.html) ─────────────────────────────────
app.use(requireAuth, express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => console.log(`読む・学ぶ running on port ${PORT}`));

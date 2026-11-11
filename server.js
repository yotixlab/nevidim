const express = require('express');
const path = require('path');
const { generateWallpaper } = require('./generator');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/wallpaper', async (req, res) => {
  try {
    const q = req.query;
    const canvas = await generateWallpaper({
      device: q.device || 'iphone-13',
      mode: q.mode || 'monthly',
      layout: q.layout || 'horizontal',
      theme: q.theme || 'light',
      shape: q.shape || 'circle',
      filled: q.filled === 'true',
      fillPast: q.fillPast === 'true',
      showNumbers: q.showNumbers === 'true',
      showBoth: q.showBoth === 'true',
      highlightToday: q.highlightToday === 'true',
      todayColor: q.todayColor || '#0ea5e9',
      dotOpacity: parseInt(q.dotOpacity) || 100,
      showLabels: q.showLabels === 'true',
      showCard: q.showCard === 'true',
      cardStyle: q.cardStyle || 'flat',
      cardOpacity: parseInt(q.cardOpacity) || 100,
      cardColor: q.cardColor || '',
      cardBorder: q.cardBorder === 'true',
      titleText: q.titleText || 'MEMENTO MORI',
      showLogo: q.showLogo === 'true',
      fill: q.fill || 'none',
      fillTop: parseInt(q.fillTop) || 0,
      fillBottom: parseInt(q.fillBottom) || 20,
      gridScale: parseInt(q.gridScale) || 100,
      shapeSize: parseInt(q.shapeSize) || 100,
      weekStart: q.weekStart || 'monday',
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(canvas.toBuffer('image/png'));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`✅ Server on http://localhost:${PORT}`));
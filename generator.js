const { createCanvas } = require('@napi-rs/canvas');

const THEMES = {
  light:     { bg: '#fafafa', past: '#2a2a2a', today: '#0ea5e9', future: '#e5e5e5', text: '#2a2a2a', cardBg: '#bae6fd', cardText: '#0c4a6e' },
  dark:      { bg: '#18181b', past: '#d4d4d8', today: '#0ea5e9', future: '#3f3f46', text: '#d4d4d8', cardBg: '#1e293b', cardText: '#e2e8f0' },
  blueprint: { bg: '#1e3a8a', past: '#60a5fa', today: '#fbbf24', future: '#172554', text: '#60a5fa', cardBg: '#172554', cardText: '#60a5fa' },
  matrix:    { bg: '#022c22', past: '#4ade80', today: '#fbbf24', future: '#064e3b', text: '#4ade80', cardBg: '#064e3b', cardText: '#4ade80' },
  slate:     { bg: '#0f172a', past: '#e2e8f0', today: '#60a5fa', future: '#1e293b', text: '#e2e8f0', cardBg: '#1e293b', cardText: '#e2e8f0' },
  nordic:    { bg: '#f8fafc', past: '#0f172a', today: '#3b82f6', future: '#cbd5e1', text: '#0f172a', cardBg: '#e2e8f0', cardText: '#0f172a' },
  luxury:    { bg: '#000000', past: '#fbbf24', today: '#fbbf24', future: '#262626', text: '#fbbf24', cardBg: '#171717', cardText: '#fbbf24' },
  wine:      { bg: '#450a0a', past: '#fecaca', today: '#fecaca', future: '#7f1d1d', text: '#fecaca', cardBg: '#5f0f0f', cardText: '#fecaca' },
};

const DEVICES = {
  'iphone-13': { w: 1170, h: 2532 },
  'iphone-14-pro': { w: 1179, h: 2556 },
};

function drawShape(ctx, x, y, size, shape, color, filled) {
  ctx.beginPath();
  const h = size / 2;
  switch (shape) {
    case 'square': ctx.rect(x - h, y - h, size, size); break;
    case 'rounded': ctx.roundRect(x - h, y - h, size, size, size * 0.25); break;
    case 'pill': ctx.roundRect(x - h, y - h * 0.5, size, size * 0.5, size * 0.25); break;
    case 'circle': default: ctx.arc(x, y, h, 0, Math.PI * 2);
  }
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, size * 0.1);
    ctx.stroke();
  }
}

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getMonthData(year, month, today, weekStart) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();
  let offset = firstDay === 0 ? 6 : firstDay - 1;
  if (weekStart === 'sunday') offset = firstDay;

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push({ state: 'empty' });
  
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  const currentDay = today.getDate();

  for (let i = 1; i <= daysInMonth; i++) {
    let state = 'future';
    if (isCurrentMonth) {
      state = i < currentDay ? 'past' : i === currentDay ? 'today' : 'future';
    } else if (year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth())) {
      state = 'past';
    }
    cells.push({ state, num: i });
  }
  return { cells, label: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][month] };
}

async function generateWallpaper(opts) {
  const cfg = {
    device: 'iphone-13',
    mode: 'monthly', layout: 'horizontal', shape: 'circle', theme: 'light',
    filled: true, fillPast: false, showNumbers: true, showBoth: false, highlightToday: true, todayColor: '#0ea5e9',
    dotOpacity: 100, showLabels: true, showProgress: true,
    showCard: true, cardStyle: 'flat', cardColor: '', cardOpacity: 50, cardRadius: 20, cardBorder: false,
    titleText: 'MEMENTO MORI', showLogo: true,
    fill: 'none', fillTop: 0, fillBottom: 20,
    gridScale: 100, shapeSize: 100, statsSize: 100,
    weekStart: 'monday',
    ...opts
  };

  const deviceSize = DEVICES[cfg.device] || DEVICES['iphone-13'];
  const theme = THEMES[cfg.theme] || THEMES.light;
  const colors = { ...theme, today: cfg.highlightToday ? cfg.todayColor : theme.past };
  const cardBgColor = cfg.cardColor || colors.cardBg;

  const canvas = createCanvas(deviceSize.w, deviceSize.h);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, deviceSize.w, deviceSize.h);

  const today = new Date();
  const blocks = [];

  // Формируем блоки
  if (cfg.mode === 'quarterly') {
    const startMonth = Math.floor(today.getMonth() / 3) * 3;
    for (let i = 0; i < 3; i++) blocks.push(getMonthData(today.getFullYear(), startMonth + i, today, cfg.weekStart));
  } else if (cfg.mode === 'yearly') {
    for (let i = 0; i < 12; i++) blocks.push(getMonthData(today.getFullYear(), i, today, cfg.weekStart));
  } else {
    blocks.push(getMonthData(today.getFullYear(), today.getMonth(), today, cfg.weekStart));
  }

  // Вычисляем виртуальную сетку
  const rowsPerBlock = Math.max(...blocks.map(b => Math.ceil(b.cells.length / 7)));
  const isHorizontal = cfg.layout === 'horizontal';
  const gap = 2; // Промежуток между блоками в ячейках

  let virtualCols = 7;
  let virtualRows = rowsPerBlock;

  if (isHorizontal) {
    virtualCols = (blocks.length * 7) + ((blocks.length - 1) * gap);
  } else {
    virtualRows = (blocks.length * rowsPerBlock) + ((blocks.length - 1) * gap);
  }

  // Отступы
  let paddingTop = deviceSize.h * 0.22;
  let paddingBottom = deviceSize.h * 0.22;
  let paddingX = 60;

  if (cfg.fill === 'top') { paddingTop = cfg.fillTop + 150; paddingBottom = deviceSize.h * 0.4; }
  else if (cfg.fill === 'bottom') { paddingTop = deviceSize.h * 0.15; paddingBottom = cfg.fillBottom + 150; }

  const availW = deviceSize.w - paddingX * 2;
  const availH = deviceSize.h - paddingTop - paddingBottom;

  const cellW = availW / virtualCols;
  const cellH = availH / virtualRows;
  const baseCell = Math.min(cellW, cellH);
  
  const finalCell = baseCell * (cfg.gridScale / 100);
  const gapSize = finalCell - (finalCell * 0.15);
  const finalSize = Math.max(4, gapSize * (cfg.shapeSize / 100));

  const totalW = virtualCols * finalCell;
  const totalH = virtualRows * finalCell;
  const offX = (deviceSize.w - totalW) / 2;
  const offY = paddingTop + (availH - totalH) / 2;

  // Рисуем блоки
  ctx.globalAlpha = cfg.dotOpacity / 100;
  
  blocks.forEach((block, bIdx) => {
    const startCol = isHorizontal ? bIdx * (7 + gap) : 0;
    const startRow = isHorizontal ? 0 : bIdx * (rowsPerBlock + gap);
    
    const blockOffX = offX + startCol * finalCell;
    const blockOffY = offY + startRow * finalCell;

    // Метка месяца
    if (cfg.showLabels) {
      ctx.fillStyle = colors.past;
      ctx.globalAlpha = 0.4 * (cfg.dotOpacity / 100);
      ctx.font = `600 ${Math.round(14 * (cfg.gridScale/100))}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(block.label, blockOffX + (7 * finalCell) / 2, blockOffY - 15);
      ctx.globalAlpha = cfg.dotOpacity / 100;
    }

    block.cells.forEach((c, i) => {
      if (c.state === 'empty') return;
      const col = i % 7, row = Math.floor(i / 7);
      const x = blockOffX + col * finalCell + finalCell / 2;
      const y = blockOffY + row * finalCell + finalCell / 2;
      
      let isFilled = cfg.filled;
      // Если включена заливка прошлых, но форма контурная
      if (!cfg.filled && cfg.fillPast && c.state === 'past') {
        isFilled = true;
      }

      let color = c.state === 'past' ? colors.past : c.state === 'today' ? colors.today : colors.future;
      let textColor = isFilled ? colors.bg : color;

      if (c.state === 'today') {
        drawShape(ctx, x, y, finalSize, cfg.shape, colors.today, true);
        textColor = '#ffffff';
      } else {
        drawShape(ctx, x, y, finalSize, cfg.shape, color, isFilled);
      }
      
      if (cfg.showNumbers) {
        if (isFilled && !cfg.showBoth && c.state !== 'today') return;
        ctx.fillStyle = textColor;
        ctx.font = `bold ${finalSize * 0.45}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.num, x, y + 1);
      }
    });
  });
  ctx.globalAlpha = 1;

  // Прогресс
  if (cfg.showProgress && cfg.mode !== 'yearly') {
    // Логика для квартала/месяца
    const totalDays = blocks.length * 30; // Приблизительно
    ctx.fillStyle = colors.today;
    ctx.textAlign = 'center';
    ctx.font = `600 ${Math.round(18 * (cfg.statsSize / 100))}px -apple-system, sans-serif`;
    ctx.fillText(`50d left · 46%`, deviceSize.w / 2, offY + totalH + 40); // Заглушка для визуала
  }

  // Карточка
  if (cfg.showCard) {
    const cardW = deviceSize.w - paddingX * 2;
    const cardH = 130;
    const cardX = paddingX;
    const cardY = deviceSize.h - cardH - 100;

    ctx.save();
    ctx.globalAlpha = cfg.cardOpacity / 100;
    ctx.fillStyle = cardBgColor;
    ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, cfg.cardRadius); ctx.fill();
    ctx.restore();

    if (cfg.cardBorder) {
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, cfg.cardRadius); ctx.stroke();
    }

    ctx.fillStyle = colors.cardText;
    ctx.textAlign = 'center';
    ctx.font = `700 24px -apple-system, sans-serif`;
    ctx.fillText(cfg.titleText, deviceSize.w / 2, cardY + cardH / 2 - (cfg.showLogo ? 5 : -10));

    if (cfg.showLogo) {
      ctx.fillStyle = colors.cardText;
      ctx.globalAlpha = 0.5;
      ctx.font = `600 12px -apple-system, sans-serif`;
      ctx.fillText('ONEDOT.TODAY', deviceSize.w / 2, cardY + cardH / 2 + 22);
      ctx.globalAlpha = 1;
    }
  }

  return canvas;
}

module.exports = { generateWallpaper };
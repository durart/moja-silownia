(function(root) {
  'use strict';
  const W = 1080, H = 1920;
  const C = {
    bg: '#101b2b', panel: '#1d3048', border: '#344c66',
    cyan: '#76bfff', text: '#f4f8fe', muted: '#b2c3d8',
    green: '#91e1b1', gold: '#f3cf79'
  };
  function font(ctx, size, weight) {
    ctx.font = (weight || 500) + ' ' + size + 'px system-ui, Arial, sans-serif';
  }
  function text(ctx, value, x, y, size, color, weight, maxWidth) {
    ctx.fillStyle = color || C.text;
    font(ctx, size, weight);
    let str = String(value ?? '—');
    if (maxWidth && ctx.measureText(str).width > maxWidth) {
      while (str.length > 1 && ctx.measureText(str + '…').width > maxWidth) str = str.slice(0, -1);
      str += '…';
    }
    ctx.fillText(str, x, y);
  }
  function roundBox(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }
  function metric(ctx, x, y, w, h, label, value, valueSize) {
    roundBox(ctx, x, y, w, h, 21, C.panel);
    text(ctx, label, x + 24, y + 18, 22, C.muted, 650, w - 48);
    text(ctx, value, x + 24, y + 58, valueSize || 39, C.text, 820, w - 46);
  }
  function fmt(n) {
    return Math.round(Number(n) || 0).toLocaleString('pl-PL');
  }
  async function draw(session, model, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw Error('Brak obsługi Canvas');
    ctx.textBaseline = 'top';
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    text(ctx, '🏋  MOJA SIŁOWNIA', 70, 57, 41, C.cyan, 800, 790);
    text(ctx, 'SPORT PERFORMANCE 2.0', 70, 117, 23, C.muted, 650);
    text(ctx, model.name, 70, 169, 62, C.text, 820, 935);
    text(ctx, model.date, 70, 257, 29, C.muted, 550);

    const firstY = 324, gap = 13, thirdW = (940 - 2 * gap) / 3;
    metric(ctx, 70, firstY, thirdW, 120, 'CZAS', model.duration, 34);
    metric(ctx, 70 + thirdW + gap, firstY, thirdW, 120, 'ĆWICZENIA', fmt(model.exerciseCount));
    metric(ctx, 70 + (thirdW + gap) * 2, firstY, thirdW, 120, 'SERIE', fmt(model.setCount));
    const half = (940 - gap) / 2;
    metric(ctx, 70, 455, half, 124, 'OBJĘTOŚĆ', fmt(model.volume) + ' kg', 38);
    metric(ctx, 70 + half + gap, 455, half, 124, 'KCAL AKTYWNE*',
      model.activeKcal == null ? '—' : fmt(model.activeKcal) + ' kcal', 38);

    roundBox(ctx, 70, 603, 940, 92, 19, '#203e35');
    text(ctx, '🏆', 95, 620, 44, C.gold, 700);
    text(ctx, model.prCount
      ? model.prCount + (model.prCount === 1 ? ' seria z rekordem' : ' serie z rekordami')
      : 'Podsumowanie bez nowych rekordów', 164, 623, 34, C.green, 790, 813);

    text(ctx, 'ZAANGAŻOWANE MIĘŚNIE', 70, 730, 32, C.text, 800);
    if (typeof options.drawAnatomy === 'function' && model.setCount) {
      try {
        await options.drawAnatomy(ctx, session, 230, 795, 620);
      } catch (error) {
        console.warn('Karta: nie udało się narysować mapy mięśni', error);
        roundBox(ctx, 230, 795, 620, 526, 21, C.panel);
        text(ctx, 'Mapa mięśni niedostępna', 290, 1000, 35, C.muted, 650, 500);
      }
    } else {
      roundBox(ctx, 230, 795, 620, 526, 21, C.panel);
      text(ctx, 'Mapa mięśni niedostępna', 290, 1000, 35, C.muted, 650, 500);
    }
    text(ctx, 'CZERWONY: GŁÓWNE      ŻÓŁTY: POMOCNICZE', 70, 1342, 23, C.muted, 580);

    text(ctx, 'WYKONANE ĆWICZENIA', 70, 1403, 32, C.text, 800);
    const visible = model.groups.slice(0, 5);
    for (let i = 0; i < visible.length; i++) {
      const group = visible[i];
      const y = 1457 + i * 72;
      roundBox(ctx, 70, y, 940, 64, 13, C.panel);
      text(ctx, group.name, 87, y + 12, 29, C.text, 750, group.timedSeconds?600:670);
      const series = group.timedSeconds?group.count+' ser. · '+fmt(group.timedSeconds)+' s':group.count+' ser.';
      text(ctx, series, group.timedSeconds?755:855, y + 15, 25, C.green, 750, group.timedSeconds?235:130);
      if (group.records) text(ctx, 'PR', group.timedSeconds?695:798, y + 15, 23, C.gold, 800);
    }
    const hidden = model.groups.length - visible.length;
    if (hidden > 0) {
      text(ctx, '+ ' + hidden + ' pozostałych ćwiczeń w pełnym raporcie', 80, 1837, 25, C.muted, 550, 880);
    }
    text(ctx, '* Kalorie szacunkowe · Mapa mięśni jest orientacyjna', 70, 1884, 22, C.muted, 500, 930);
    return canvas;
  }
  async function exportCard(session, model, options) {
    if (!session || !model) throw Error('Brak danych treningu do eksportu');
    const canvas = await draw(session, model, options);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw Error('Nie udało się utworzyć obrazu PNG');
    const filename = 'moja-silownia-sport-' + model.fileDate + '.png';
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Mój trening — Moja Siłownia' });
        return { shared: true };
      } catch (error) {
        if (error?.name === 'AbortError') return { cancelled: true };
      }
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    return { downloaded: true };
  }
  root.SportSummaryExport = Object.freeze({ draw, exportCard });
})(window);

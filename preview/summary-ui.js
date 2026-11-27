(function (root) {
  'use strict';
  let currentSession = null;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
  const number = n => Math.round(Number(n) || 0).toLocaleString('pl-PL');
  function metric(label, value) {
    return '<div class="sp2-metric"><small>' + esc(label) + '</small><strong>' +
      esc(value) + '</strong></div>';
  }
  function exerciseRow(group) {
    if(group.measurementType==='cardio'){
      const details=root.MojaCardioUI.activityLabel(group.activity);
      return '<details class="sp2-exercise"><summary><span class="sp2-exercise-name">'+esc(group.name)+'</span><span class="sp2-exercise-count">Kardio · '+esc(root.MojaCardioUI.clock(group.durationSeconds))+'</span><span class="sp2-chevron">⌄</span></summary><p class="sp2-sets">'+esc(details)+'</p></details>';
    }
    const min = number(group.minWeight);
    const max = number(group.maxWeight);
    const weights = min === max ? min + ' kg' : min + '–' + max + ' kg';
    const sets = group.sets.map((set, index) => {
      const rir = set.rir == null ? '' : ' · RIR ' + number(set.rir);
      const pr = set.records.length ? '<span class="sp2-record">🏆 PR</span>' : '';
      const side=set.programSet?.side?' · '+esc(set.programSet.side)+' strona':'';
      const result=set.measurementType==='duration'?(set.durationSeconds?number(set.durationSeconds)+' s':'Brak prawidłowego czasu')+(set.weight?' · '+number(set.weight)+' kg dodatkowo':''):(set.programSet?number(set.reps)+' powt.'+(set.programSet.perSide?' / stronę':''):number(set.weight)+' kg × '+number(set.reps)+' powt.'+rir);
      const position=set.programSet?'Blok '+number(set.programSet.block)+' · runda '+number(set.programSet.round):String(index+1)+'.';
      return '<li><span>'+position+' · '+result+side+'</span>'+pr+'</li>';
    }).join('');
    return '<details class="sp2-exercise"><summary><span class="sp2-exercise-name">' +
      esc(group.name) + '</span><span class="sp2-exercise-count">' +
      group.count + ' ser. · ' + (group.timedSeconds?number(group.timedSeconds)+(group.program?' s na czas':' s izometrii'):group.program?'masa ciała':weights) + '</span><span class="sp2-chevron">⌄</span></summary>' +
      '<ol class="sp2-sets">' + sets + '</ol></details>';
  }
  function render(session) {
    const model = root.SportSummaryCore?.build(session, {
      estimateCalories: typeof estimateCalories === 'function' ? estimateCalories : null
    });
    const container = document.getElementById('summaryContent');
    if (!container || !model) return;
    let anatomy = '<div class="sp2-map-empty">Brak mapy dla tego treningu</div>';
    try {
      if (typeof anatomySVG === 'function' && model.setCount) anatomy = anatomySVG(session, 640);
    } catch (error) {
      console.warn('Podsumowanie: mapa mięśni', error);
    }
    container.innerHTML = '<article class="sp2" aria-label="Podsumowanie zakończonego treningu">' +
      '<div class="sp2-headline"><span class="sp2-brand">🏋 MOJA SIŁOWNIA</span>' +
      '<span class="sp2-eyebrow">SPORT PERFORMANCE 2.0</span></div>' +
      '<div class="sp2-eyebrow" style="margin-top:21px">TRENING ZAKOŃCZONY</div>' +
      '<h2 class="sp2-title">' + esc(model.name) + '</h2>' +
      '<p class="sp2-date">' + esc(model.date) + '</p>' +
      '<div class="sp2-metrics">' +
      metric('CZAS', model.duration) + metric('ĆWICZENIA', model.exerciseCount) +
      metric('SERIE', model.setCount) + '</div>' +
      '<div class="sp2-metrics sp2-metrics-secondary">' +
      (model.program?metric('POWTÓRZENIA',number(model.reps)):metric('OBJĘTOŚĆ', number(model.volume) + ' kg')) + (model.timedSeconds?metric(model.program?'CZAS ĆWICZEŃ':'CZAS IZOMETRII',number(model.timedSeconds)+' s'):'') +
      metric('KCAL AKTYWNE*', model.activeKcal == null ? '—' : number(model.activeKcal) + ' kcal') + (model.cardioSeconds?metric('CZAS KARDIO',root.MojaCardioUI.clock(model.cardioSeconds)):'') + (model.cardioActiveKcal!=null?metric('KCAL KARDIO*',number(model.cardioActiveKcal)+' kcal'):'') +
      '</div>' +
      (model.prCount ? '<div class="sp2-pr"><span class="sp2-pr-ico">🏆</span><span><strong>' +
        model.prCount + ' ' + (model.prCount === 1 ? 'seria z rekordem' : 'serie z rekordami') +
        '</strong><small>Rekordy osobiste zapisane w treningu</small></span></div>' : '') +
      '<div class="sp2-body">' +
      '<section><h3 class="sp2-section-title">Zaangażowane mięśnie (siłowe)</h3>' +
      '<div class="sp2-map">' + anatomy + '</div>' +
      '<div class="sp2-legend"><span><i class="sp2-dot" style="background:#f25d5d"></i>Główne</span>' +
      '<span><i class="sp2-dot" style="background:#efbd50"></i>Pomocnicze</span></div></section>' +
      '<section><h3 class="sp2-section-title">Wykonane ćwiczenia (' + model.exerciseCount + ')</h3>' +
      (model.groups.length ? model.groups.map(exerciseRow).join('') :
        '<p class="sp2-disclaimer">Brak zapisanych serii.</p>') + '</section></div>' +
      '<div class="sp2-actions"><button type="button" class="sp2-main-action" data-sp2="card">📷 Karta PNG</button>' +
      '<button type="button" data-sp2="full">📋 Pełny PNG</button>' +
      '<button type="button" data-sp2="history">Historia treningów</button>'+(model.program?'<button type="button" data-sp2="program">Dalej do programu</button>':'')+'</div>' +
      '<p class="sp2-disclaimer">* Kalorie są szacunkiem, nie pomiarem. Mapa pokazuje orientacyjne zaangażowanie mięśni, a nie pomiar EMG. Zapisane serie i historia pozostają bez zmian.</p>' +
      '<p class="sp2-status" role="status" aria-live="polite"></p></article>';
  }
  function open(id) {
    const session = state.sessions.find(s => String(s.id) === String(id));
    if (!session) {
      if (typeof note === 'function') note('Nie znaleziono zapisanego treningu.');
      return false;
    }
    currentSession = session;
    tab('summary');
    render(session);
    return true;
  }
  async function handleAction(button) {
    const action = button.dataset.sp2;
    if(action==='program'){tab('plans');showPlansPanel('programs');return;}
    if (action === 'history') {
      tab('history');
      return;
    }
    if (!currentSession) return;
    const status = document.querySelector('#summaryContent .sp2-status');
    button.disabled = true;
    if (status) status.textContent = 'Przygotowuję plik…';
    try {
      if (action === 'card') {
        if (!root.SportSummaryExport) throw Error('Moduł eksportu nie został załadowany');
        const model = root.SportSummaryCore.build(currentSession, {
          estimateCalories: typeof estimateCalories === 'function' ? estimateCalories : null
        });
        await root.SportSummaryExport.exportCard(currentSession, model, {
          drawAnatomy: typeof drawAnatomyPNG === 'function' ? drawAnatomyPNG : null
        });
      } else if (action === 'full') {
        await exportWorkoutPNG(currentSession.id);
      }
      if (status) status.textContent = 'Plik przygotowany do udostępnienia lub pobrania.';
    } catch (error) {
      console.error('Błąd eksportu podsumowania:', error);
      if (status) status.textContent = 'Nie udało się przygotować pliku: ' + (error?.message || 'błąd');
    } finally {
      button.disabled = false;
    }
  }
  document.getElementById('summary')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-sp2]');
    if (button) void handleAction(button);
  });
  root.SportSummary = Object.freeze({ open, render });
  root.openSportSummary = open;
  root.openSportSummaryByIndex = index => {
    const s = state.sessions[index];
    if (s) open(s.id);
  };
})(window);

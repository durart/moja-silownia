/* User profile presentation and writes for isolated v1.9.0 staging. */
(function() {
  'use strict';
  const core = window.ProfileCore;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const format = (value, precision = 1) => Number(value).toLocaleString('pl-PL', {
    minimumFractionDigits: 0, maximumFractionDigits: precision
  });
  const today = () => {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')].join('-');
  };
  let editingId = null;
  let selectedExerciseId = '';

  function profile() {
    return core.normalizeProfile(state.profile);
  }

  function renderStrength(currentKg) {
    const el = document.getElementById('profileStrength');
    if (!el) return;
    if (currentKg === null) {
      el.innerHTML = '<p class="profile-small">Dodaj pomiar masy ciała, aby obliczyć siłę względną.</p>';
      return;
    }
    const allIds = [...new Set((state.sessions || []).flatMap(session =>
      (session.sets || []).map(set => set.exerciseId).filter(Boolean)))];
    const choices = allIds.filter(id => core.relativeStrength(state.sessions, id, currentKg));
    if (!choices.length) {
      el.innerHTML = '<p class="profile-small">Zapisz serię roboczą z obciążeniem, aby zobaczyć porównanie.</p>';
      return;
    }
    if (!choices.includes(selectedExerciseId)) selectedExerciseId = choices[0];
    const result = core.relativeStrength(state.sessions, selectedExerciseId, currentKg);
    const name = id => state.exercises.find(exercise => exercise.id === id)?.name || id;
    el.innerHTML =
      '<label>Ćwiczenie<select id="profileStrengthExercise" onchange="profileSelectStrength(this.value)">' +
      choices.map(id => '<option value="' + escapeHtml(id) + '"' +
        (id === selectedExerciseId ? ' selected' : '') + '>' + escapeHtml(name(id)) + '</option>').join('') +
      '</select></label>' +
      '<div class="profile-metrics"><div class="profile-metric"><small>Największy ciężar roboczy</small><strong>' +
      format(result.bestLoadKg) + ' kg</strong></div><div class="profile-metric"><small>Ciężar / masa ciała</small><strong>' +
      format(result.relativeLoad, 2) + '×</strong></div></div>' +
      '<p>Szacowany 1RM: <strong>' + (result.estimatedOneRmKg === null ? 'brak wiarygodnej serii' :
      format(result.estimatedOneRmKg) + ' kg (' + format(result.relativeOneRm, 2) +
      '× masy ciała)') + '</strong></p>' +
      '<p class="profile-small">Obliczenia dla wybranego ćwiczenia; tylko serie robocze. e1RM wyliczony wzorem Epleya z RIR do 12 efektywnych powtórzeń. ' +
      'Ciężary na różnych maszynach nie są bezpośrednio porównywalne. Jest to wskaźnik treningowy, nie pomiar siły maksymalnej.</p>';
  }

  function renderUserProfile() {
    const root = document.getElementById('profileContent');
    if (!root) return;
    let data;
    try { data = profile(); } catch (error) {
      root.textContent = 'Nieprawidłowy zapis profilu. Zachowaj kopię JSON i sprawdź dane.';
      return;
    }
    const weight = core.currentWeight(data);
    const rows = data.weightHistory.map(entry =>
      '<div class="profile-measurement"><div><strong>' + format(entry.weightKg) + ' kg</strong>' +
      '<div class="profile-small">' + escapeHtml(entry.date) + '</div></div>' +
      '<div class="profile-measurement-actions">' +
      '<button class="secondary" type="button" data-measurement-id="' + escapeHtml(entry.id) +
      '" onclick="editUserWeight(this.dataset.measurementId)">Edytuj</button>' +
      '<button class="danger" type="button" data-measurement-id="' + escapeHtml(entry.id) +
      '" onclick="deleteUserWeight(this.dataset.measurementId)">Usuń</button></div></div>').join('');
    root.innerHTML =
      '<div class="card"><h2>Profil użytkownika</h2>' +
      '<p class="profile-small">Twoje dane są zapisane lokalnie i dołączane do kopii JSON. Nie są wysyłane do serwera.</p>' +
      '<div class="profile-metrics"><div class="profile-metric"><small>Ostatni zapisany pomiar</small><strong>' +
      (weight === null ? 'Brak' : format(weight) + ' kg') +
      '</strong></div><div class="profile-metric"><small>Wzrost</small><strong>' +
      (data.heightCm === null ? 'Brak' : format(data.heightCm, 0) + ' cm') +
      '</strong></div></div>' +
      '<form onsubmit="event.preventDefault();saveUserHeight()"><label>Wzrost (cm)' +
      '<input id="profileHeight" type="number" inputmode="numeric" min="80" max="250" step="1" value="' +
      (data.heightCm ?? '') + '" placeholder="np. 179"></label>' +
      '<button type="submit">Zapisz wzrost</button></form></div>' +
      '<div class="card"><h2>Historia masy ciała</h2>' +
      '<p class="profile-small">Jeden pomiar na datę. Zmiana wagi w profilu wpływa na kolejne treningi, nie zmienia już zapisanych kalorii.</p>' +
      '<form id="profileWeightForm" onsubmit="event.preventDefault();saveUserWeight()">' +
      '<div class="profile-form-row"><label>Data pomiaru<input id="profileWeightDate" type="date" required max="' +
      today() + '" value="' + today() + '"></label>' +
      '<label>Masa ciała (kg)<input id="profileWeightKg" type="number" inputmode="decimal" ' +
      'min="20" max="350" step="0.1" required placeholder="np. 99.1"></label></div>' +
      '<button id="profileWeightSave" type="submit">Zapisz pomiar</button> ' +
      '<button class="secondary" type="button" onclick="resetUserWeightEditor()">Wyczyść</button></form>' +
      '<div class="profile-measurements">' + (rows ||
      '<p class="profile-small">Nie masz jeszcze zapisanych pomiarów. Wartość domyślna 100,6 kg z wcześniejszych wersji nie jest traktowana jako pomiar.</p>') +
      '</div></div>' +
      '<div class="card"><h2>Siła względna</h2><p class="profile-small">Porównanie ciężaru roboczego i oszacowanej siły do ostatnio zapisanej masy ciała.</p>' +
      '<div id="profileStrength"></div></div>' +
      '<div class="card"><h2>Kopia zapasowa</h2>' +
      '<p class="profile-small">Profil oraz pełna historia pomiarów są dołączane do standardowej kopii JSON razem z treningami, planami i ustawieniami.</p>' +
      '<button type="button" class="secondary" onclick="tab(\'history\')">Przejdź do eksportu / importu JSON</button></div>';
    renderStrength(weight);
    window.MojaTrainerWorkoutUI?.renderSettings(root);
  }

  function persistProfile(next, confirmation) {
    const previous = state.profile;
    state.profile = next;
    if (!save()) {
      state.profile = previous;
      note('Nie udało się zapisać profilu. Dane pozostały bez zmian.');
      return false;
    }
    editingId = null;
    renderUserProfile();
    note(confirmation);
    return true;
  }

  window.saveUserHeight = function() {
    const raw = document.getElementById('profileHeight').value.trim();
    const value = raw ? Number(raw) : null;
    if (value !== null && (!core.validHeight(value) || !Number.isInteger(value))) {
      note('Podaj wzrost w cm (80–250).');
      return;
    }
    const next = profile();
    next.heightCm = value;
    persistProfile(next, 'Wzrost zapisany');
  };

  window.saveUserWeight = function() {
    const date = document.getElementById('profileWeightDate').value;
    const raw = document.getElementById('profileWeightKg').value.trim();
    const weight = Number(raw);
    if (!raw || !core.validDate(date) || date > today() || !core.validWeight(weight)) {
      note('Sprawdź datę i masę ciała (20–350 kg).');
      return;
    }
    const current = profile();
    const existing = current.weightHistory.find(entry => entry.date === date);
    if (existing && existing.id !== editingId &&
        !confirm('Pomiar z tej daty już istnieje. Zastąpić tylko ten pomiar?')) return;
    const id = editingId || 'weight-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    try {
      const next = core.upsertWeight(current, { id, date, weightKg: weight });
      persistProfile(next, 'Pomiar zapisany');
    } catch (error) {
      note(error.message);
    }
  };

  window.editUserWeight = function(id) {
    const item = profile().weightHistory.find(entry => entry.id === id);
    if (!item) return;
    editingId = id;
    document.getElementById('profileWeightDate').value = item.date;
    document.getElementById('profileWeightKg').value = item.weightKg;
    document.getElementById('profileWeightSave').textContent = 'Zapisz zmianę';
    document.getElementById('profileWeightKg').focus();
  };

  window.deleteUserWeight = function(id) {
    const item = profile().weightHistory.find(entry => entry.id === id);
    if (!item || !confirm('Usunąć pomiar ' + item.date + '? Treningi i ich wyniki pozostaną bez zmian.')) return;
    persistProfile(core.removeWeight(profile(), id), 'Pomiar usunięty');
  };

  window.resetUserWeightEditor = function() {
    editingId = null;
    document.getElementById('profileWeightDate').value = today();
    document.getElementById('profileWeightKg').value = '';
    document.getElementById('profileWeightSave').textContent = 'Zapisz pomiar';
  };

  window.profileSelectStrength = function(id) {
    selectedExerciseId = id;
    renderStrength(core.currentWeight(profile()));
  };

  window.importGarminWeight = function(measurement) {
    if (!measurement || !core.validDate(measurement.date) ||
        measurement.date > today() || !core.validWeight(measurement.weightKg)) return false;
    const current = profile();
    if (current.weightHistory.some(row => row.date === measurement.date)) return false;
    const next = core.upsertWeight(current, {
      id: 'garmin-weight-' + measurement.date,
      date: measurement.date,
      weightKg: measurement.weightKg
    });
    if (!persistProfile(next, 'Dodano pomiar masy ciała z Garmin'))
      throw new Error('Nie udało się zapisać pomiaru Garmin.');
    return true;
  };

  window.renderUserProfile = renderUserProfile;
})();

      // ─── CARD TIMERS ─────────────────────────────────────────────────────────────
      const cardTimers = {};

      function toggleCardTimer(id, examType) {
        const box = document.getElementById('timer-card-' + id);
        box.classList.toggle('hidden');
        const secs = examType === 'B' ? 360 : 150;
        if (!cardTimers[id]) {
          cardTimers[id] = {
            total: secs,
            remaining: secs,
            running: false,
            interval: null,
          };
          updateCardTimerDisplay(id);
        }
      }

      function cardTimerStart(id) {
        const t = cardTimers[id];
        if (!t || t.running) return;
        t.running = true;
        t.interval = setInterval(() => {
          t.remaining--;
          updateCardTimerDisplay(id);
          if (t.remaining <= 0) {
            clearInterval(t.interval);
            t.running = false;
          }
        }, 1000);
      }

      function cardTimerPause(id) {
        const t = cardTimers[id];
        if (!t) return;
        t.running = false;
        clearInterval(t.interval);
      }

      function cardTimerReset(id, examType) {
        const t = cardTimers[id];
        if (!t) return;
        clearInterval(t.interval);
        const secs = (examType || 'A') === 'B' ? 360 : 150;
        t.remaining = secs;
        t.total = secs;
        t.running = false;
        updateCardTimerDisplay(id);
      }

      function updateCardTimerDisplay(id) {
        const t = cardTimers[id];
        if (!t) return;
        const m = Math.floor(t.remaining / 60);
        const s = t.remaining % 60;
        const disp = document.getElementById('ctd-' + id);
        const fill = document.getElementById('ctf-' + id);
        if (!disp) return;
        disp.textContent = `${m}:${String(s).padStart(2, '0')}`;
        const pct = (t.remaining / t.total) * 100;
        if (fill) fill.style.width = pct + '%';
        const warning = t.remaining <= 30;
        disp.className = 'timer-display' + (warning ? ' warning' : '');
        if (fill) fill.className = 'timer-fill' + (warning ? ' warning' : '');
      }

      // ─── EXAM GUIDE TIMERS ────────────────────────────────────────────────────────
      const examTimers = {
        A: { total: 150, remaining: 150, running: false, interval: null },
        B: { total: 360, remaining: 360, running: false, interval: null },
      };

      function timerStart(key) {
        const t = examTimers[key];
        if (!t || t.running) return;
        t.running = true;
        t.interval = setInterval(() => {
          t.remaining--;
          updateExamTimerDisplay(key);
          if (t.remaining <= 0) {
            clearInterval(t.interval);
            t.running = false;
          }
        }, 1000);
      }
      function timerPause(key) {
        const t = examTimers[key];
        t.running = false;
        clearInterval(t.interval);
      }
      function timerReset(key) {
        const t = examTimers[key];
        clearInterval(t.interval);
        t.remaining = t.total;
        t.running = false;
        updateExamTimerDisplay(key);
      }
      function updateExamTimerDisplay(key) {
        const t = examTimers[key];
        const m = Math.floor(t.remaining / 60),
          s = t.remaining % 60;
        const disp = document.getElementById('timer' + key + '-display');
        const fill = document.getElementById('timer' + key + '-fill');
        if (!disp) return;
        disp.textContent = `${m}:${String(s).padStart(2, '0')}`;
        const pct = (t.remaining / t.total) * 100;
        if (fill) fill.style.width = pct + '%';
        const warn = t.remaining <= 30;
        disp.className = 'timer-display' + (warn ? ' warning' : '');
        if (fill) fill.className = 'timer-fill' + (warn ? ' warning' : '');
      }


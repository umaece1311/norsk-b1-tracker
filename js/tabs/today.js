      // ─── TODAY ────────────────────────────────────────────────────────────────────
      // Returns 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
      function isDayOff(dow) { return dow === 0 || dow === 1 || dow === 6; }

      function getOrCreateTodayIds() {
        const today = new Date().toDateString();
        if (
          state.todayDate === today &&
          state.todayIds !== undefined
        ) {
          return state.todayIds;
        }
        const dow = new Date().getDay(); // 0=Sun…6=Sat
        const qs = allQuestions();

        if (isDayOff(dow)) {
          // Rest day (Mon/Sat/Sun) — no new question, return empty
          state.todayIds = [];
          state.todayDate = today;
          saveState();
          return [];
        }

        // Active day (Tue–Fri): pick exactly 1 next unanswered question
        const answered = new Set(
          Object.keys(state.answers).filter(k => state.answers[k]?.trim()).map(Number)
        );
        // Pick the first question not yet answered
        const next = qs.find(q => !answered.has(q.id));
        const picked = next ? [next.id] : [];
        state.todayIds = picked;
        state.todayDate = today;
        saveState();
        return picked;
      }

      function refreshToday() {
        state.todayDate = null;
        state.todayIds = [];
        renderToday();
      }

      // ─── WEEKLY GOAL TRACKER BANNER ───────────────────────────────────────────────
      function renderWeekTracker() {
        const container = document.getElementById('weekGoalTracker');
        if (!container) return;

        const today    = new Date();
        const todayStr = today.toISOString().slice(0, 10);

        // Monday of current week
        const dow0    = today.getDay();
        const monday  = new Date(today);
        monday.setDate(today.getDate() - ((dow0 + 6) % 7));

        // Build Mon→Sun
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          return d;
        });

        // Map: YYYY-MM-DD → questions answered that day
        const dateToQs = {};
        Object.entries(state.timestamps || {}).forEach(([idStr, ts]) => {
          if (!ts) return;
          const dateStr = ts.slice(0, 10);
          const id = Number(idStr);
          const q  = allQuestions().find(q => q.id === id);
          if (q && state.answers[id]?.trim()) {
            if (!dateToQs[dateStr]) dateToQs[dateStr] = [];
            dateToQs[dateStr].push(q);
          }
        });

        const DAY  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const MON  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        const cells = days.map(d => {
          const dStr      = d.toISOString().slice(0, 10);
          const isToday   = dStr === todayStr;
          const isPast    = d < today && !isToday;
          const dow       = d.getDay();
          const answeredQs = dateToQs[dStr] || [];
          const done      = answeredQs.length > 0;
          const dLabel    = `${DAY[dow]} ${d.getDate()} ${MON[d.getMonth()]}`;

          let icon, statusLabel, goalLabel, cardCls;

          if (dow === 1) {                          // Monday — rest
            icon = '🥳'; statusLabel = 'Rest day'; goalLabel = 'Rest';
            cardCls = isToday ? 'wgt-today' : 'wgt-rest';
          } else if (dow === 0 || dow === 6) {      // Sat / Sun — revision
            if (isToday)      { icon = '🔄'; statusLabel = 'Revision day'; goalLabel = 'Revision'; cardCls = 'wgt-today'; }
            else if (isPast)  { icon = '📅'; statusLabel = 'Revision day'; goalLabel = 'Revision'; cardCls = 'wgt-revision'; }
            else              { icon = '⏳'; statusLabel = 'Upcoming';      goalLabel = 'Revision'; cardCls = 'wgt-upcoming'; }
          } else {                                  // Tue–Fri — active
            if (done)         { icon = '✅'; statusLabel = 'Done!';    goalLabel = 'Goal: 1 Q'; cardCls = isToday ? 'wgt-today wgt-done' : 'wgt-done'; }
            else if (isPast)  { icon = '❌'; statusLabel = 'Missed';   goalLabel = 'Goal: 1 Q'; cardCls = 'wgt-missed'; }
            else if (isToday) { icon = '📝'; statusLabel = 'Practice'; goalLabel = 'Goal: 1 Q'; cardCls = 'wgt-today'; }
            else              { icon = '⏳'; statusLabel = 'Upcoming'; goalLabel = 'Goal: 1 Q'; cardCls = 'wgt-upcoming'; }
          }

          const qText = done && answeredQs[0] ? answeredQs[0].q : '';
          return `
            <div class="wgt-day ${cardCls}">
              <div class="wgt-day-header">
                <div class="wgt-date">${dLabel}</div>
                ${isToday ? '<div class="wgt-today-badge">TODAY</div>' : ''}
              </div>
              <div class="wgt-icon">${icon}</div>
              <div class="wgt-status">${statusLabel}</div>
              <div class="wgt-goal">${goalLabel}</div>
              ${qText ? `<div class="wgt-q">${qText}</div>` : ''}
            </div>`;
        }).join('');

        container.innerHTML = `
          <div class="wgt-wrapper">
            <div class="wgt-title">&#128197; This Week's Goal Tracker</div>
            <div class="wgt-legend">
              <span>&#128221; Weekdays (Tue&ndash;Fri): Learn 1 question/day</span>
              <span>&#128197; Weekend (Sat&ndash;Sun): Revision</span>
              <span>&#129395; Monday: Rest</span>
            </div>
            <div class="wgt-grid">${cells}</div>
          </div>`;
      }

      function renderToday() {
        const now = new Date();
        document.getElementById('todayDate').textContent =
          now.toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

        const dow = now.getDay();
        const qs = allQuestions();
        const total = qs.length;
        const done = qs.filter(q => state.answers[q.id]?.trim()).length;
        const pct = Math.round((done / total) * 100);
        const remaining = total - done;

        renderWeekTracker();

        document.getElementById('todayStats').innerHTML = `
    <div class="stat-card"><div class="stat-num">${done}</div><div class="stat-label">Answered ✅</div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div></div>
    <div class="stat-card"><div class="stat-num">${remaining}</div><div class="stat-label">Remaining</div></div>
    <div class="stat-card"><div class="stat-num">${pct}%</div><div class="stat-label">Progress</div></div>
  `;

        if (isDayOff(dow)) {
          // Rest day: show review of questions answered this week
          const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const reviewQs = qs.filter(
            q => state.timestamps[q.id] && state.timestamps[q.id] >= oneWeekAgo && state.answers[q.id]?.trim()
          );
          const dayName = now.toLocaleDateString('en-GB', { weekday: 'long' });
          const restMsg = dow === 1
            ? '📅 Monday — Rest day. Review questions you practised this week.'
            : '🌿 Weekend — Rest day. Repeat & reinforce this week questions.';

          document.getElementById('todayCards').innerHTML = `
    <div style="background:#fef9ec;border:1.5px solid #fde68a;border-radius:12px;padding:18px 20px;margin-bottom:16px">
      <div style="font-size:1rem;font-weight:700;color:#92400e;margin-bottom:4px">${restMsg}</div>
      <div style="font-size:0.83rem;color:#78350f">${reviewQs.length ? reviewQs.length + ' question' + (reviewQs.length > 1 ? 's' : '') + ' to review from this week.' : 'No questions answered this week yet — start on Tuesday!'}</div>
    </div>
    ${reviewQs.map(q => renderCard(q, { showTimer: true })).join('')}
    ${!reviewQs.length ? '<p style="color:#9ca3af;text-align:center;padding:40px">Practice questions on Tue–Fri and they will appear here for review.</p>' : ''}
  `;
        } else {
          // Active day (Tue–Fri): show today's 1 question
          const ids = getOrCreateTodayIds();
          const todayQs = ids.map(id => qs.find(q => q.id === id)).filter(Boolean);
          document.getElementById('todayCards').innerHTML = todayQs.length
            ? todayQs.map(q => renderCard(q, { showTimer: true })).join('')
            : '<p style="color:#9ca3af;text-align:center;padding:40px">🎉 All questions answered! Great work.</p>';
        }
      }


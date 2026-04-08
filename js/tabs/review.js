      // ─── WEEKLY REVIEW ────────────────────────────────────────────────────────────
      function renderReview() {
        const allQs = allQuestions();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find Monday of the current week
        const dow = today.getDay(); // 0=Sun..6=Sat
        const diffToMon = (dow === 0 ? -6 : 1 - dow);
        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMon);

        // Build date objects for Mon–Sun
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          return d;
        });

        // Map each answered question to the date it was answered
        const qsByDate = {};
        allQs.forEach(q => {
          if (state.timestamps[q.id] && state.answers[q.id]?.trim()) {
            const d = new Date(state.timestamps[q.id]);
            d.setHours(0, 0, 0, 0);
            const key = d.toDateString();
            if (!qsByDate[key]) qsByDate[key] = [];
            qsByDate[key].push(q);
          }
        });

        // Day config: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
        const dayConfig = {
          0: { type: 'revision', label: 'Sun', emoji: '🔄', note: 'Revision' },
          1: { type: 'rest',     label: 'Mon', emoji: '😴', note: 'Rest' },
          2: { type: 'learn',    label: 'Tue', emoji: '📝', note: 'Goal: 1 Q' },
          3: { type: 'learn',    label: 'Wed', emoji: '📝', note: 'Goal: 1 Q' },
          4: { type: 'learn',    label: 'Thu', emoji: '📝', note: 'Goal: 1 Q' },
          5: { type: 'learn',    label: 'Fri', emoji: '📝', note: 'Goal: 1 Q' },
          6: { type: 'revision', label: 'Sat', emoji: '🔄', note: 'Revision' },
        };

        // ── Section 1: Weekly goal tracker grid ──
        const gridHTML = weekDays.map(d => {
          const cfg = dayConfig[d.getDay()];
          const dateKey = d.toDateString();
          const isToday = d.toDateString() === today.toDateString();
          const isFuture = d > today;
          const doneQs = qsByDate[dateKey] || [];
          const dayNum = d.getDate();
          const monthStr = d.toLocaleDateString('en-GB', { month: 'short' });

          let statusIcon, statusText, bg, border;
          if (cfg.type === 'rest') {
            statusIcon = '😴'; statusText = 'Rest day';
            bg = '#f8fafc'; border = '#e2e8f0';
          } else if (cfg.type === 'revision') {
            statusIcon = doneQs.length ? '✅' : (isFuture ? '⏳' : '🔄');
            statusText = doneQs.length ? `${doneQs.length} reviewed` : (isFuture ? 'Upcoming' : 'Revision day');
            bg = '#f0fdf4'; border = '#bbf7d0';
          } else {
            // learn day
            if (doneQs.length >= 1) {
              statusIcon = '✅'; statusText = 'Done!';
              bg = '#f0fdf4'; border = '#86efac';
            } else if (isFuture) {
              statusIcon = '⏳'; statusText = 'Upcoming';
              bg = '#f8fafc'; border = '#e2e8f0';
            } else {
              statusIcon = '❌'; statusText = 'Missed';
              bg = '#fef2f2'; border = '#fecaca';
            }
          }

          const qPreview = doneQs[0]
            ? `<div style="font-size:0.72rem;color:#475569;margin-top:5px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${doneQs[0].q}</div>`
            : '';

          return `
            <div style="background:${bg};border:2px solid ${border};border-radius:12px;padding:10px 10px 8px;min-width:0;flex:1;
              ${isToday ? 'box-shadow:0 0 0 3px #2563eb44;border-color:#2563eb;' : ''}">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:0.75rem;font-weight:700;color:#64748b">${cfg.label} ${dayNum} ${monthStr}</span>
                ${isToday ? '<span style="font-size:0.62rem;background:#2563eb;color:#fff;border-radius:20px;padding:1px 6px;font-weight:700">TODAY</span>' : ''}
              </div>
              <div style="font-size:1.1rem;margin-bottom:2px">${statusIcon}</div>
              <div style="font-size:0.72rem;font-weight:700;color:#374151">${statusText}</div>
              <div style="font-size:0.68rem;color:#94a3b8;margin-top:1px">${cfg.note}</div>
              ${qPreview}
            </div>`;
        }).join('');

        // ── Section 2: Questions answered this week (for review) ──
        const oneWeekAgo = new Date(monday).toISOString();
        const weekQs = allQs.filter(
          q => state.timestamps[q.id] && state.timestamps[q.id] >= oneWeekAgo && state.answers[q.id]?.trim()
        );

        // Separate learn-day questions vs revision-day questions
        const learnQs = weekQs.filter(q => {
          const d = new Date(state.timestamps[q.id]);
          return [2,3,4,5].includes(d.getDay()); // Tue-Fri
        });
        const revisionQs = weekQs.filter(q => {
          const d = new Date(state.timestamps[q.id]);
          return [0,6].includes(d.getDay()); // Sat-Sun
        });

        function reviewCardHTML(q) {
          const ans = state.answers[q.id] || '';
          const ts = new Date(state.timestamps[q.id]).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' });
          return `
            <div class="review-card">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px">
                <div>
                  <span class="cat-badge ${catClass(q.cat)}" style="margin-right:6px">${catLabel(q.cat)}</span>
                  ${q.examType ? `<span class="exam-badge badge-${q.examType}">Type ${q.examType}</span>` : ''}
                </div>
                <span style="font-size:0.78rem;color:#aaa">${ts}</span>
              </div>
              <div style="font-family:'Fraunces',serif;font-size:0.98rem;margin-bottom:8px">${q.q}</div>
              ${ans ? `<div style="font-size:0.87rem;color:#334155;background:#f5f7fa;border-radius:8px;padding:10px;margin-bottom:8px">${ans}</div>` : ''}
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn btn-ghost" onclick="speakText(${q.id},'q')">🔊 Question</button>
                ${ans ? `<button class="btn btn-ghost" onclick="speakText(${q.id},'a')">🔊 My Answer</button>` : ''}
                <button class="btn btn-ghost" onclick="showTab('questions')">✏️ Edit</button>
              </div>
            </div>`;
        }

        document.getElementById('reviewList').innerHTML = `
          <!-- Weekly tracker -->
          <div style="margin-bottom:24px">
            <h3 style="font-family:'Fraunces',serif;font-size:1.1rem;margin-bottom:12px">📅 This Week's Goal Tracker</h3>
            <div style="font-size:0.8rem;color:#64748b;margin-bottom:10px;display:flex;gap:16px;flex-wrap:wrap">
              <span>📝 Weekdays (Tue–Fri): Learn 1 question/day</span>
              <span>🔄 Weekend (Sat–Sun): Revision</span>
              <span>😴 Monday: Rest</span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">${gridHTML}</div>
          </div>

          <!-- Weekday questions done -->
          <div style="margin-bottom:24px">
            <h3 style="font-family:'Fraunces',serif;font-size:1.1rem;margin-bottom:4px">📝 Weekday Learning — What I've Done</h3>
            <p style="font-size:0.83rem;color:#64748b;margin-bottom:12px">Questions you answered on Tue–Fri this week.</p>
            ${learnQs.length
              ? learnQs.map(reviewCardHTML).join('')
              : '<div style="text-align:center;padding:24px;color:#94a3b8;font-size:0.88rem;background:#f8fafc;border-radius:12px">No weekday questions answered yet this week.</div>'}
          </div>

          <!-- Weekend revision -->
          <div>
            <h3 style="font-family:'Fraunces',serif;font-size:1.1rem;margin-bottom:4px">🔄 Weekend Revision</h3>
            <p style="font-size:0.83rem;color:#64748b;margin-bottom:12px">
              All questions from this week to revise on Saturday &amp; Sunday.
            </p>
            ${weekQs.length
              ? weekQs.map(reviewCardHTML).join('')
              : '<div style="text-align:center;padding:24px;color:#94a3b8;font-size:0.88rem;background:#f0fdf4;border-radius:12px;border:1.5px dashed #bbf7d0">Practice questions Tue–Fri and they will appear here for weekend revision.</div>'}
          </div>`;
      }


      // ─── PROGRESS ─────────────────────────────────────────────────────────────────
      function renderProgress() {
        const qs = allQuestions();
        const total = qs.length;
        const done = qs.filter(q => state.answers[q.id]?.trim()).length;
        const pct = Math.round((done / total) * 100);

        document.getElementById('progressStats').innerHTML = `
    <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">Total Questions</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#22c55e">${done}</div><div class="stat-label">Done ✅</div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:#22c55e"></div></div></div>
    <div class="stat-card"><div class="stat-num">${total - done}</div><div class="stat-label">Remaining</div></div>
    <div class="stat-card"><div class="stat-num">${pct}%</div><div class="stat-label">Completion</div></div>
  `;

        const catHTML = CATS.map(cat => {
          const catQs = qs.filter(q => q.cat === cat.id);
          if (!catQs.length) return '';
          const catDone = catQs.filter(q => state.answers[q.id]?.trim()).length;
          const catPct = Math.round((catDone / catQs.length) * 100);
          return `
    <div class="card" style="padding:14px 18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <span class="cat-badge ${catClass(cat.id)}">${cat.emoji} ${cat.label}</span>
        <span style="font-size:0.82rem;color:#888">${catDone}/${catQs.length} done</span>
        <span style="font-size:0.82rem;font-weight:700;color:#2563eb">${catPct}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${catPct}%"></div></div>
    </div>`;
        }).join('');

        const typeHTML = ['A', 'B', 'C']
          .map(t => {
            const tQs = qs.filter(q => q.examType === t);
            const tDone = tQs.filter(q => state.answers[q.id]?.trim()).length;
            const tPct = tQs.length
              ? Math.round((tDone / tQs.length) * 100)
              : 0;
            const label = {
              A: 'Oppgave A — Describe',
              B: 'Oppgave B — Discuss',
              C: 'Oppgave C — Opinion',
            }[t];
            return `
    <div class="card" style="padding:14px 18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <span class="exam-badge badge-${t}" style="font-size:0.85rem;padding:4px 12px">${label}</span>
        <span style="font-size:0.82rem;color:#888">${tDone}/${tQs.length} done</span>
        <span style="font-size:0.82rem;font-weight:700;color:#2563eb">${tPct}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${tPct}%"></div></div>
    </div>`;
          })
          .join('');

        document.getElementById('catProgress').innerHTML = `
    <h3 style="font-family:'Fraunces',serif;font-size:1.1rem;margin:16px 0 10px">By Exam Type</h3>
    ${typeHTML}
    <h3 style="font-family:'Fraunces',serif;font-size:1.1rem;margin:16px 0 10px">By Category</h3>
    ${catHTML}
  `;
      }


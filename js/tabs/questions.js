      // ─── ALL QUESTIONS ─────────────────────────────────────────────────────────────
      function setExamFilter(val, el) {
        state.activeExamType = val;
        document
          .querySelectorAll('[data-exam]')
          .forEach(e => e.classList.remove('active'));
        el.classList.add('active');
        renderQuestions();
      }
      function setStatusFilter(val, el) {
        state.activeStatus = val;
        document
          .querySelectorAll('[data-status]')
          .forEach(e => e.classList.remove('active'));
        el.classList.add('active');
        renderQuestions();
      }

      function renderCatFilters() {
        const el = document.getElementById('catFilters');
        if (!el.children.length) {
          const chips = [
            `<span style="font-size:0.8rem;color:#888;font-weight:600;align-self:center">Category:</span>`,
            `<span class="filter-chip active" data-cat="all" onclick="setCatFilter('all',this)">All</span>`,
            ...CATS.map(
              c =>
                `<span class="filter-chip" data-cat="${c.id}" onclick="setCatFilter('${c.id}',this)">${c.emoji} ${c.label}</span>`
            ),
          ];
          el.innerHTML = chips.join('');
        }
      }

      function setCatFilter(val, el) {
        state.activeCat = val;
        document
          .querySelectorAll('[data-cat]')
          .forEach(e => e.classList.remove('active'));
        el.classList.add('active');
        renderQuestions();
      }

      function renderQuestions() {
        renderCatFilters();
        const search = (
          document.getElementById('searchInput')?.value || ''
        ).toLowerCase();
        let qs = allQuestions();

        if (state.activeCat !== 'all')
          qs = qs.filter(q => q.cat === state.activeCat);
        if (state.activeExamType !== 'all')
          qs = qs.filter(q => q.examType === state.activeExamType);
        if (state.activeStatus !== 'all') {
          qs = qs.filter(q => {
            const s = state.status[q.id] || 'new';
            return s === state.activeStatus;
          });
        }
        if (search)
          qs = qs.filter(
            q =>
              q.q.toLowerCase().includes(search) ||
              (q.a || '').toLowerCase().includes(search)
          );

        document.getElementById('questionsList').innerHTML = qs.length
          ? qs.map(q => renderCard(q, { showTimer: true })).join('')
          : '<p style="color:#888;text-align:center;padding:40px">No questions match your filters.</p>';
      }

      // ─── STATUS & ANSWER ──────────────────────────────────────────────────────────
      function setStatus(id, status) {
        state.status[id] = status;
        state.timestamps[id] = new Date().toISOString();
        saveState();
        // Update card UI
        const card = document.getElementById('card-' + id);
        if (!card) return;
        card.querySelectorAll('.status-btn').forEach(btn => {
          btn.className = 'status-btn';
          if (btn.textContent.includes('New') && status === 'new')
            btn.classList.add('active-new');
          if (btn.textContent.includes('Learning') && status === 'learning')
            btn.classList.add('active-learning');
          if (btn.textContent.includes('Done') && status === 'done')
            btn.classList.add('active-done');
        });
      }

      let autoSaveTimers = {};
      function autoSaveAnswer(id) {
        clearTimeout(autoSaveTimers[id]);
        autoSaveTimers[id] = setTimeout(() => saveAnswer(id, true), 1500);
      }
      function saveAnswer(id, silent = false) {
        const el = document.getElementById('ans-' + id);
        if (!el) return;
        const text = el.value;
        state.answers[id] = text;
        if (text.trim()) {
          state.timestamps[id] = new Date().toISOString();
          // Auto-mark done when answer is saved
          if (state.status[id] !== 'done') {
            state.status[id] = 'done';
            const card = document.getElementById('card-' + id);
            if (card) {
              card.querySelectorAll('.status-btn').forEach(btn => {
                btn.className = 'status-btn';
                if (btn.textContent.includes('Done'))
                  btn.classList.add('active-done');
              });
            }
            updateBadges();
          }
        }
        saveState();
        if (!silent) {
          el.style.borderColor = '#22c55e';
          setTimeout(() => (el.style.borderColor = ''), 1000);
        }
      }


      function togglePdfAnswer(id, toggleEl) {
        const box = document.getElementById('pdf-ans-' + id);
        if (!box) return;
        const isHidden = box.classList.contains('hidden');
        box.classList.toggle('hidden', !isHidden);
        const arrow = toggleEl.querySelector('span:last-child');
        if (arrow) arrow.textContent = isHidden ? '▲' : '▼';
      }

      // ─── PDF EXPORT (Q&A for current category filter) ───────────────────────────
      const PDF_MOTIVATION = [
        'Hver setning du skriver, bringer deg n&aelig;rmere flyt. Fortsett &aring; &oslash;ve! 💪',
        'Du l&aelig;rer et nytt spr&aring;k &mdash; det er ikke lett, men du klarer det! 🌟',
        'Sm&aring; steg hver dag f&oslash;rer til store resultater. Bra jobbet s&aring; langt! 🚀',
        'Feil er en del av l&aelig;ring. Hver &oslash;velse gj&oslash;r deg sterkere! 🔥',
        'Du er n&aelig;rmere B1-eksamen enn du tror. Fortsett &aring; tro p&aring; deg selv! ✨',
      ];

      function downloadQuestionsPdf() {
        const qs = allQuestions();
        const cats =
          state.activeCat === 'all'
            ? CATS
            : CATS.filter(c => c.id === state.activeCat);
        const title =
          state.activeCat === 'all'
            ? 'All Categories'
            : catLabel(state.activeCat);

        const scopeQs =
          state.activeCat === 'all'
            ? qs
            : qs.filter(q => q.cat === state.activeCat);
        const totalCount = scopeQs.length;
        const doneCount = scopeQs.filter(q => state.answers[q.id]?.trim()).length;
        const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
        const motivation =
          PDF_MOTIVATION[doneCount % PDF_MOTIVATION.length];

        const sectionsHTML = cats.map(cat => {
          const catQs = qs.filter(q => q.cat === cat.id);
          if (!catQs.length) return '';

          const itemsHTML = catQs.map(q => {
            const myAnswer = state.answers[q.id]?.trim();
            const answerHTML = myAnswer
              ? escapeHtml(myAnswer)
              : '<span class="pdf-noanswer">✏️ Not answered yet &mdash; give it a try today!</span>';
            return `
      <div class="pdf-item">
        <div class="pdf-question"><span class="pdf-qnum">${q.id}</span> ${escapeHtml(q.q)}</div>
        <div class="pdf-answer ${myAnswer ? 'pdf-answer-done' : 'pdf-answer-empty'}">${answerHTML}</div>
      </div>`;
          }).join('');

          return `
    <div class="pdf-section">
      <h2>${cat.emoji} ${escapeHtml(cat.label)}</h2>
      ${itemsHTML}
    </div>`;
        }).join('');

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Norsk B1 — My Questions &amp; Answers</title>
<style>
  body { font-family: 'DM Sans', Arial, sans-serif; color: #1a2235; padding: 24px 32px; max-width: 800px; margin: 0 auto; }
  h1 { font-family: Georgia, serif; font-size: 1.7rem; margin-bottom: 4px; color: #1a2235; }
  h1 .flag { font-size: 1.4rem; }
  .pdf-meta { color: #666; font-size: 0.85rem; margin-bottom: 16px; }
  .pdf-motivation {
    background: linear-gradient(135deg, #eff6ff, #f0fdf4);
    border: 1.5px solid #93c5fd;
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 20px;
    font-weight: 700;
    color: #1d4ed8;
    font-size: 1rem;
    line-height: 1.5;
  }
  .pdf-progress-row { display: flex; align-items: center; gap: 14px; margin-bottom: 26px; flex-wrap: wrap; }
  .pdf-progress-chip {
    display: inline-block; font-weight: 700; font-size: 0.85rem;
    padding: 5px 12px; border-radius: 20px;
  }
  .pdf-progress-chip.total { background: #eef2ff; color: #4338ca; }
  .pdf-progress-chip.done { background: #dcfce7; color: #15803d; }
  .pdf-progress-chip.pct { background: #fef9c3; color: #92400e; }
  .pdf-section { margin-bottom: 26px; page-break-inside: avoid; }
  .pdf-section h2 { font-size: 1.15rem; font-weight: 700; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 4px; margin-bottom: 12px; }
  .pdf-item { margin-bottom: 14px; page-break-inside: avoid; }
  .pdf-question { font-weight: 700; margin-bottom: 4px; color: #1a2235; }
  .pdf-qnum {
    display: inline-block; background: #2563eb; color: #fff; font-weight: 700;
    font-size: 0.75rem; border-radius: 50%; width: 20px; height: 20px;
    text-align: center; line-height: 20px; margin-right: 4px;
  }
  .pdf-answer { white-space: pre-wrap; border-left: 3px solid #e5e7eb; padding-left: 10px; }
  .pdf-answer-done { color: #14532d; border-left-color: #22c55e; font-weight: 600; }
  .pdf-answer-empty { border-left-color: #fca5a5; }
  .pdf-noanswer { color: #dc2626; font-style: italic; font-weight: 600; }
  .pdf-footer {
    margin-top: 30px; padding-top: 16px; border-top: 2px dashed #93c5fd;
    text-align: center; font-weight: 700; color: #7c3aed; font-size: 0.95rem;
  }
  @media print {
    body { padding: 0; }
    .pdf-section { break-inside: avoid; }
  }
</style>
</head>
<body>
  <h1><span class="flag">&#127475;&#127476;</span> Norsk B1 &mdash; My Questions &amp; Answers</h1>
  <div class="pdf-meta">${escapeHtml(title)} &middot; Exported ${new Date().toLocaleDateString()}</div>
  <div class="pdf-motivation">${motivation}</div>
  <div class="pdf-progress-row">
    <span class="pdf-progress-chip total">📚 ${totalCount} questions</span>
    <span class="pdf-progress-chip done">✅ ${doneCount} answered</span>
    <span class="pdf-progress-chip pct">🔥 ${pct}% complete</span>
  </div>
  ${sectionsHTML}
  <div class="pdf-footer">Du klarer dette! Keep practicing every day &mdash; lykke til p&aring; eksamen! 🎉</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`);
        printWindow.document.close();
      }


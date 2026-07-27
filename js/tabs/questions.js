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

        const sectionsHTML = cats.map(cat => {
          const catQs = qs.filter(q => q.cat === cat.id);
          if (!catQs.length) return '';

          const itemsHTML = catQs.map(q => {
            const myAnswer = state.answers[q.id]?.trim();
            const answerHTML = myAnswer
              ? escapeHtml(myAnswer)
              : '<span class="pdf-noanswer">No answer written yet.</span>';
            return `
      <div class="pdf-item">
        <div class="pdf-question">${q.id}. ${escapeHtml(q.q)}</div>
        <div class="pdf-answer">${answerHTML}</div>
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
  h1 { font-family: Georgia, serif; font-size: 1.6rem; margin-bottom: 4px; }
  .pdf-meta { color: #666; font-size: 0.85rem; margin-bottom: 28px; }
  .pdf-section { margin-bottom: 26px; page-break-inside: avoid; }
  .pdf-section h2 { font-size: 1.15rem; border-bottom: 2px solid #2563eb; padding-bottom: 4px; margin-bottom: 12px; }
  .pdf-item { margin-bottom: 14px; page-break-inside: avoid; }
  .pdf-question { font-weight: 700; margin-bottom: 4px; }
  .pdf-answer { color: #333; white-space: pre-wrap; border-left: 3px solid #e5e7eb; padding-left: 10px; }
  .pdf-noanswer { color: #aaa; font-style: italic; }
  @media print {
    body { padding: 0; }
    .pdf-section { break-inside: avoid; }
  }
</style>
</head>
<body>
  <h1>&#127475;&#127476; Norsk B1 — My Questions &amp; Answers</h1>
  <div class="pdf-meta">${escapeHtml(title)} &middot; Exported ${new Date().toLocaleDateString()}</div>
  ${sectionsHTML}
  <script>window.onload = () => window.print();</script>
</body>
</html>`);
        printWindow.document.close();
      }


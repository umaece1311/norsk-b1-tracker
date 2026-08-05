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

        ensureVocabInState();
        const EXAM_TYPE_LABEL = { A: 'Oppgave A — Describe', B: 'Oppgave B — Discuss', C: 'Oppgave C — Opinion' };

        // ── Table of contents: one row per category, linking to its anchor ────────
        const tocRowsHTML = cats
          .map(cat => {
            const catQs = qs.filter(q => q.cat === cat.id);
            if (!catQs.length) return '';
            const catDone = catQs.filter(q => state.answers[q.id]?.trim()).length;
            return `
      <tr>
        <td><a href="#cat-${cat.id}">${cat.emoji} ${escapeHtml(cat.label)}</a></td>
        <td>${catQs.length}</td>
        <td>${catDone}/${catQs.length}</td>
      </tr>`;
          })
          .join('');

        // ── Per-question vocabulary (dedupe within that question's own text) ──────
        function vocabHTMLFor(q) {
          const words = new Set();
          extractWords(q.q).forEach(w => words.add(w));
          if (q.a) extractWords(q.a).forEach(w => words.add(w));
          const myAnswer = state.answers[q.id];
          if (myAnswer) extractWords(myAnswer).forEach(w => words.add(w));
          if (!words.size) return '';

          const chips = [...words].sort().map(w => {
            const en = state.vocab[w]?.en;
            return `<span class="pdf-vocab-chip"><b>${escapeHtml(w)}</b>${en ? ' &ndash; ' + escapeHtml(en) : ''}</span>`;
          }).join('');
          return `
        <div class="pdf-vocab-box">
          <div class="pdf-vocab-label">📖 Vocabulary</div>
          <div class="pdf-vocab-chips">${chips}</div>
        </div>`;
        }

        // ── Answer text -> bullet-point <li> markup ────────────────────────────────
        // Each <li> gets a data-sentence index and each word its own <span> so the
        // playback script can highlight along as speechSynthesis speaks it.
        function answerBulletsHTML(answerText, playId) {
          if (!answerText) return '<span class="pdf-noanswer">✏️ Not answered yet &mdash; give it a try today!</span>';
          const sentences = answerText
            .split(/(?<=[.!?])\s+/)
            .map(s => s.trim())
            .filter(Boolean);
          return `<ul class="pdf-answer-list" id="ans-list-${playId}">` +
            sentences
              .map((s, si) => {
                const wordsHTML = s
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((w, wi) => `<span class="pdf-word" data-s="${si}" data-w="${wi}">${escapeHtml(w)}</span>`)
                  .join(' ');
                return `<li data-sentence="${si}" data-text="${escapeHtml(s)}">${wordsHTML}</li>`;
              })
              .join('') +
            '</ul>';
        }

        // ── Follow-up questions attached to a main question ────────────────────────
        function followUpsHTMLFor(q) {
          const items = state.followUps?.[q.id] || [];
          if (!items.length) return '';
          return `
        <div class="pdf-followups">
          ${items.map((fu, i) => {
            const fuId = `${q.id}-f${i}`;
            const myAnswer = state.answers[fuId]?.trim();
            return `
          <div class="pdf-followup-item" id="play-${fuId}" data-q="${escapeHtml(fu.q)}">
            <div class="pdf-followup-q">🔁 ${escapeHtml(fu.q)}
              <button class="pdf-listen-btn" onclick="pdfPlayItem('${fuId}')" title="Listen">🔊</button>
            </div>
            <div class="pdf-answer ${myAnswer ? 'pdf-answer-done' : 'pdf-answer-empty'}">${answerBulletsHTML(myAnswer, fuId)}</div>
          </div>`;
          }).join('')}
        </div>`;
        }

        // ── Q&A sections: grouped by category, then by exam type A/B/C ────────────
        const sectionsHTML = cats.map(cat => {
          const catQs = qs.filter(q => q.cat === cat.id);
          if (!catQs.length) return '';

          const typeGroupsHTML = ['A', 'B', 'C'].map(t => {
            const typeQs = catQs.filter(q => q.examType === t);
            if (!typeQs.length) return '';

            const itemsHTML = typeQs.map(q => {
              const myAnswer = state.answers[q.id]?.trim();
              return `
      <div class="pdf-item" id="play-${q.id}" data-q="${escapeHtml(q.q)}">
        <div class="pdf-question" id="q-${q.id}">
          <span class="pdf-qnum">${q.id}</span> ${escapeHtml(q.q)}
          <button class="pdf-listen-btn" onclick="pdfPlayItem('${q.id}')" title="Listen">🔊</button>
        </div>
        <div class="pdf-answer ${myAnswer ? 'pdf-answer-done' : 'pdf-answer-empty'}">${answerBulletsHTML(myAnswer, q.id)}</div>
        ${vocabHTMLFor(q)}
        ${followUpsHTMLFor(q)}
      </div>`;
            }).join('');

            return `
      <div class="pdf-type-group">
        <h3 class="pdf-type-${t}">${EXAM_TYPE_LABEL[t]}</h3>
        ${itemsHTML}
      </div>`;
          }).join('');

          return `
    <div class="pdf-section" id="cat-${cat.id}">
      <h2>${cat.emoji} ${escapeHtml(cat.label)}</h2>
      ${typeGroupsHTML}
    </div>`;
        }).join('');

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          showToast('⚠️ Popup blocked — allow popups for this site to open the PDF page.');
          return;
        }
        printWindow.document.write(`
<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Norsk B1 — My Questions &amp; Answers</title>
<style>
  body { font-family: 'DM Sans', Arial, sans-serif; color: #1a2235; padding: 24px 32px; max-width: 800px; margin: 0 auto; font-size: 1.05rem; }
  @media (max-width: 600px) {
    body { padding: 14px 16px; font-size: 1rem; }
    h1 { font-size: 1.3rem; }
    .pdf-toc { overflow-x: auto; }
    .pdf-toc table { font-size: 0.85rem; }
    .pdf-controls { position: static; gap: 8px; }
    .pdf-controls button { flex: 1 1 auto; padding: 10px 8px; font-size: 0.85rem; min-height: 40px; }
    .pdf-question { font-size: 1.05rem; }
    .pdf-answer, .pdf-answer-list li { font-size: 1rem; }
  }
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
  .pdf-toc { margin-bottom: 30px; page-break-after: always; }
  .pdf-toc h2 { font-size: 1.2rem; font-weight: 700; color: #2563eb; margin-bottom: 10px; }
  .pdf-toc table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
  .pdf-toc th { text-align: left; color: #666; font-size: 0.78rem; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; padding: 6px 8px; }
  .pdf-toc td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
  .pdf-toc td:nth-child(2), .pdf-toc td:nth-child(3) { text-align: center; color: #666; }
  .pdf-toc a { color: #2563eb; font-weight: 700; text-decoration: none; }
  .pdf-section { margin-bottom: 30px; }
  .pdf-section h2 { font-size: 1.3rem; font-weight: 700; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 5px; margin-bottom: 14px; }
  .pdf-type-group { margin-bottom: 18px; }
  .pdf-type-group h3 { font-size: 1rem; font-weight: 700; display: inline-block; padding: 3px 12px; border-radius: 20px; margin-bottom: 12px; }
  .pdf-type-A { background: #dbeafe; color: #1d4ed8; }
  .pdf-type-B { background: #dcfce7; color: #15803d; }
  .pdf-type-C { background: #fef3c7; color: #92400e; }
  .pdf-item { margin-bottom: 20px; page-break-inside: avoid; }
  .pdf-question { font-weight: 700; margin-bottom: 6px; color: #1a2235; font-size: 1.15rem; }
  .pdf-qnum {
    display: inline-block; background: #2563eb; color: #fff; font-weight: 700;
    font-size: 0.8rem; border-radius: 50%; width: 22px; height: 22px;
    text-align: center; line-height: 22px; margin-right: 4px;
  }
  .pdf-answer { border-left: 3px solid #e5e7eb; padding-left: 12px; font-size: 1.05rem; line-height: 1.55; }
  .pdf-answer-list { margin: 0; padding-left: 18px; }
  .pdf-answer-list li { margin-bottom: 4px; }
  .pdf-answer-done { border-left-color: #22c55e; }
  .pdf-answer-done .pdf-answer-list li { color: #14532d; font-weight: 600; }
  .pdf-answer-empty { border-left-color: #fca5a5; }
  .pdf-noanswer { color: #dc2626; font-style: italic; font-weight: 600; }
  .pdf-vocab-box { margin: 10px 0 0 12px; padding: 8px 12px; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; }
  .pdf-vocab-label { font-size: 0.75rem; font-weight: 700; color: #7c3aed; text-transform: uppercase; margin-bottom: 6px; }
  .pdf-vocab-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .pdf-vocab-chip { font-size: 0.85rem; background: #fff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 3px 8px; color: #4b5563; }
  .pdf-vocab-chip b { color: #7c3aed; }
  .pdf-followups { margin: 12px 0 0 12px; padding-left: 12px; border-left: 2px dashed #fca5a5; }
  .pdf-followup-item { margin-bottom: 12px; page-break-inside: avoid; }
  .pdf-followup-q { font-weight: 700; color: #991b1b; font-size: 1rem; margin-bottom: 4px; }
  .pdf-footer {
    margin-top: 30px; padding-top: 16px; border-top: 2px dashed #93c5fd;
    text-align: center; font-weight: 700; color: #7c3aed; font-size: 0.95rem;
  }
  .pdf-controls {
    position: sticky; top: 0; z-index: 10; display: flex; gap: 10px; flex-wrap: wrap;
    align-items: center; background: #fff; padding: 10px 0; margin-bottom: 10px;
    border-bottom: 1px solid #e5e7eb;
  }
  .pdf-controls button {
    font-family: inherit; font-weight: 700; font-size: 0.9rem; cursor: pointer;
    border-radius: 8px; padding: 8px 14px; border: none;
  }
  #pdfPlayAllBtn { background: #2563eb; color: #fff; }
  #pdfPlayAllBtn.playing { background: #d97706; }
  #pdfPrintBtn { background: #eef2ff; color: #4338ca; }
  #pdfStopBtn { background: #fee2e2; color: #dc2626; }
  .pdf-seek-row { display: flex; align-items: center; gap: 10px; margin: -4px 0 14px; }
  .pdf-seek-row input[type="range"] { flex: 1; }
  .pdf-seek-row span { font-size: 0.78rem; color: #888; white-space: nowrap; min-width: 70px; text-align: right; }
  .pdf-seek-row.hidden { display: none; }
  .pdf-listen-btn {
    font-size: 0.85rem; border: none; background: none; cursor: pointer;
    margin-left: 4px; vertical-align: middle; opacity: 0.7;
    padding: 6px 8px; min-width: 32px; min-height: 32px;
  }
  .pdf-listen-btn:hover { opacity: 1; }
  .pdf-word { transition: background 0.1s; border-radius: 3px; padding: 0 1px; }
  .pdf-word.speaking { background: #fde047; }
  .pdf-item.playing, .pdf-followup-item.playing { outline: 2px solid #2563eb; outline-offset: 4px; border-radius: 8px; }
  @media (max-width: 600px) {
    .pdf-listen-btn { font-size: 1.1rem; }
  }
  @media print {
    body { padding: 0; }
    .pdf-item { break-inside: avoid; }
    .pdf-controls, .pdf-listen-btn { display: none; }
  }
</style>
</head>
<body>
  <div class="pdf-controls">
    <button id="pdfPlayAllBtn" onclick="pdfPlayAll()">▶ Play All</button>
    <button id="pdfStopBtn" onclick="pdfStop()">⏹ Stop</button>
    <button id="pdfPrintBtn" onclick="window.print()">🖨 Print / Save PDF</button>
  </div>
  <div id="pdfSeekRow" class="pdf-seek-row hidden">
    <input type="range" id="pdfSeekBar" min="0" max="0" value="0"
      oninput="pdfSeekPreview(this.value)" onchange="pdfSeekTo(this.value)">
    <span id="pdfSeekLabel">0 / 0</span>
  </div>
  <h1><span class="flag">&#127475;&#127476;</span> Norsk B1 &mdash; My Questions &amp; Answers</h1>
  <div class="pdf-meta">${escapeHtml(title)} &middot; Exported ${new Date().toLocaleDateString()}</div>
  <div class="pdf-motivation">${motivation}</div>
  <div class="pdf-progress-row">
    <span class="pdf-progress-chip total">📚 ${totalCount} questions</span>
    <span class="pdf-progress-chip done">✅ ${doneCount} answered</span>
    <span class="pdf-progress-chip pct">🔥 ${pct}% complete</span>
  </div>

  <div class="pdf-toc">
    <h2>📑 Contents &mdash; jump to a category</h2>
    <table>
      <tr><th>Category</th><th>Questions</th><th>Answered</th></tr>
      ${tocRowsHTML}
    </table>
  </div>

  ${sectionsHTML}

  <div class="pdf-footer">Du klarer dette! Keep practicing every day &mdash; lykke til p&aring; eksamen! 🎉</div>
  <script>${pdfPlaybackScript()}</script>
</body>
</html>`);
        printWindow.document.close();
      }

      // ── Playback engine injected into the PDF-preview window ──────────────────
      // Speaks each question + its answer sentences, highlighting the current word
      // span via SpeechSynthesisUtterance.onboundary (karaoke-style).
      function pdfPlaybackScript() {
        return `
  const SLNC_WORD = 250, SLNC_WORD_REPEAT = 150, SLNC_LINE = 550, SLNC_SECTION = 1200, RATE = 0.42;
  let queue = [], index = 0, stopped = true, paused = false, runId = 0;

  function pause(ms, id) {
    return new Promise(resolve => setTimeout(() => resolve(id === runId), ms));
  }

  function clearHighlights() {
    document.querySelectorAll('.pdf-word.speaking').forEach(el => el.classList.remove('speaking'));
    document.querySelectorAll('.playing').forEach(el => el.classList.remove('playing'));
  }

  // Builds one flat, seekable queue across every question/follow-up item on
  // the page: label steps (plain text) and one step per WORD in each answer
  // sentence, so playback reads deliberately with a pause after every word.
  function buildQueue() {
    const q = [];
    document.querySelectorAll('[id^="play-"]').forEach(wrap => {
      const playId = wrap.id.replace('play-', '');
      const qText = wrap.getAttribute('data-q');
      if (qText) q.push({ playId, type: 'plain', text: qText, pause: SLNC_SECTION });

      const list = document.getElementById('ans-list-' + playId);
      const sentences = list ? [...list.querySelectorAll('li')] : [];
      for (let pass = 0; pass < 2 && sentences.length; pass++) {
        const wordPause = pass === 0 ? SLNC_WORD : SLNC_WORD_REPEAT;
        sentences.forEach((li, si) => {
          const isLastSentence = si === sentences.length - 1;
          const words = [...li.querySelectorAll('.pdf-word')];
          words.forEach((wordEl, wi) => {
            const isLastWord = wi === words.length - 1;
            const stepPause = isLastWord ? (isLastSentence ? SLNC_SECTION : SLNC_LINE) : wordPause;
            q.push({ playId, type: 'word', wordEl, pause: stepPause });
          });
        });
      }
    });
    return q;
  }

  function speakStep(step, id) {
    return new Promise(resolve => {
      if (step.type === 'word') {
        document.querySelectorAll('.pdf-word.speaking').forEach(el => el.classList.remove('speaking'));
        step.wordEl.classList.add('speaking');
      }
      const text = step.type === 'word' ? step.wordEl.textContent : step.text;
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'nb-NO';
      utt.rate = RATE;
      utt.onend = () => resolve(id === runId);
      utt.onerror = () => resolve(id === runId);
      window.speechSynthesis.speak(utt);
    });
  }

  let currentPlayId = null;

  function highlightCard(playId) {
    if (playId === currentPlayId) return;
    currentPlayId = playId;
    document.querySelectorAll('.playing').forEach(el => el.classList.remove('playing'));
    const wrap = document.getElementById('play-' + playId);
    if (!wrap) return;
    wrap.classList.add('playing');
    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function runQueue(id) {
    while (index < queue.length) {
      if (stopped || paused || id !== runId) return;
      const step = queue[index];
      highlightCard(step.playId);
      updateSeekBar();
      const okAfterSpeak = await speakStep(step, id);
      if (!okAfterSpeak || stopped || paused) return;
      const okAfterPause = await pause(step.pause || SLNC_LINE, id);
      if (!okAfterPause || stopped || paused) return;
      index++;
    }
    if (id === runId) pdfStop();
  }

  function updateButtons() {
    const btn = document.getElementById('pdfPlayAllBtn');
    if (btn) {
      btn.textContent = stopped ? '▶ Play All' : paused ? '▶ Resume' : '⏸ Pause';
      btn.classList.toggle('playing', !stopped && !paused);
    }
    const seekRow = document.getElementById('pdfSeekRow');
    if (seekRow) seekRow.classList.toggle('hidden', stopped);
  }

  function updateSeekBar() {
    const bar = document.getElementById('pdfSeekBar');
    const label = document.getElementById('pdfSeekLabel');
    if (bar) {
      bar.max = Math.max(0, queue.length - 1);
      bar.value = index;
    }
    if (label) label.textContent = (queue.length ? index + 1 : 0) + ' / ' + queue.length;
  }

  // Updates only the seek bar's displayed label while dragging, without
  // interrupting playback — the actual jump happens on release.
  function pdfSeekPreview(previewIndex) {
    const label = document.getElementById('pdfSeekLabel');
    if (label) label.textContent = (+previewIndex + 1) + ' / ' + queue.length;
  }

  function pdfSeekTo(newIndex) {
    if (stopped || !queue.length) return;
    index = Math.max(0, Math.min(queue.length - 1, +newIndex));
    runId++;
    const thisRunId = runId;
    window.speechSynthesis.cancel();
    updateSeekBar();
    // speak() called synchronously right after cancel() can be silently
    // dropped in some browsers (notably Chrome) — defer to the next tick.
    if (!paused) setTimeout(() => runQueue(thisRunId), 50);
  }

  function pdfPlayItem(playId) {
    queue = buildQueue().filter(s => s.playId === playId);
    index = 0;
    stopped = false;
    paused = false;
    runId++;
    updateButtons();
    updateSeekBar();
    window.speechSynthesis.cancel();
    runQueue(runId);
  }

  function pdfPlayAll() {
    if (!stopped) {
      if (paused) { paused = false; runId++; updateButtons(); runQueue(runId); }
      else { paused = true; runId++; window.speechSynthesis.cancel(); updateButtons(); }
      return;
    }
    queue = buildQueue();
    index = 0;
    stopped = false;
    paused = false;
    runId++;
    updateButtons();
    updateSeekBar();
    window.speechSynthesis.cancel();
    runQueue(runId);
  }

  function pdfStop() {
    stopped = true;
    paused = false;
    index = 0;
    queue = [];
    runId++;
    currentPlayId = null;
    window.speechSynthesis.cancel();
    clearHighlights();
    updateButtons();
    updateSeekBar();
  }
`;
      }


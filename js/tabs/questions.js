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
        if (el.dataset.catCount !== catsSignature()) {
          const chips = [
            `<span style="font-size:0.8rem;color:#888;font-weight:600;align-self:center">Category:</span>`,
            `<span class="filter-chip ${state.activeCat === 'all' ? 'active' : ''}" data-cat="all" onclick="setCatFilter('all',this)">All</span>`,
            ...allCats().map(
              c =>
                `<span class="filter-chip ${state.activeCat === c.id ? 'active' : ''}" data-cat="${c.id}" onclick="setCatFilter('${c.id}',this)">${c.emoji} ${c.label}</span>`
            ),
          ];
          el.innerHTML = chips.join('');
          el.dataset.catCount = catsSignature();
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
          ? qs.map(q => renderCard(q, { showTimer: true, allowReorder: true })).join('')
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

      // Pass `questionsOverride` (e.g. favouriteQuestions()) to export exactly that
      // list instead of the current category filter — used by the Favourites tab.
      // Each question, follow-up and answer sentence is shown with its English
      // translation alongside. Translations are cached in localStorage so repeat
      // exports are instant and don't hit the free translation APIs again.
      const PDF_EN_CACHE_KEY = 'norsk-b1-pdf-en';

      function pdfSplitSentences(text) {
        return (text || '')
          .split(/(?<=[.!?])\s+/)
          .map(s => s.trim())
          .filter(Boolean);
      }

      // Returns { norwegianText: englishText } for every string in `texts`.
      // Strings that fail to translate are simply left out of the map.
      async function pdfTranslateAll(texts, onProgress) {
        let cache = {};
        try {
          cache = JSON.parse(localStorage.getItem(PDF_EN_CACHE_KEY) || '{}');
        } catch (e) {}
        const unique = [...new Set(texts.filter(t => t && t.trim()))];
        const todo = unique.filter(t => !cache[t]);
        let done = unique.length - todo.length;
        onProgress(done, unique.length);

        let next = 0;
        const worker = async () => {
          while (next < todo.length) {
            const t = todo[next++];
            try {
              cache[t] = (await freeTranslate(t, 'no', 'en')).text;
            } catch (e) {}
            onProgress(++done, unique.length);
          }
        };
        await Promise.all(Array.from({ length: 4 }, worker));

        try {
          localStorage.setItem(PDF_EN_CACHE_KEY, JSON.stringify(cache));
        } catch (e) {}
        return cache;
      }

      async function downloadQuestionsPdf(questionsOverride, titleOverride) {
        // Must open synchronously (inside the click) or popup blockers kick in.
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          showToast('⚠️ Popup blocked — allow popups for this site to open the PDF page.');
          return;
        }
        const setLoading = msg => {
          printWindow.document.open();
          printWindow.document.write(
            `<!doctype html><title>Norsk B1</title><body style="font-family:Arial,sans-serif;padding:40px;color:#1a2235"><h2>🌐 ${msg}</h2><p>Translating Norwegian → English. This only takes long the first time.</p></body>`
          );
          printWindow.document.close();
        };
        setLoading('Preparing your PDF…');

        const qs = questionsOverride || allQuestions();
        const cats = questionsOverride
          ? allCats().filter(c => qs.some(q => q.cat === c.id))
          : state.activeCat === 'all'
            ? allCats()
            : allCats().filter(c => c.id === state.activeCat);
        const title =
          titleOverride ||
          (state.activeCat === 'all' ? 'All Categories' : catLabel(state.activeCat));

        const scopeQs =
          questionsOverride || state.activeCat === 'all'
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

        // ── Collect every Norwegian string and translate it up front ──────────────
        const toTranslate = [];
        qs.forEach(q => {
          toTranslate.push(q.q);
          pdfSplitSentences(state.answers[q.id]?.trim()).forEach(t => toTranslate.push(t));
          (state.followUps?.[q.id] || []).forEach((fu, i) => {
            toTranslate.push(fu.q);
            pdfSplitSentences(state.answers[`${q.id}-f${i}`]?.trim()).forEach(t => toTranslate.push(t));
          });
        });
        const EN = await pdfTranslateAll(toTranslate, (n, total) =>
          setLoading(`Translating ${n} / ${total}…`)
        );
        const enOf = t => (EN[t] ? escapeHtml(EN[t]) : '');

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
          const sentences = pdfSplitSentences(answerText);
          // "Important" = the same content words the Vocabulary tab collects.
          const keyWords = new Set(extractWords(answerText));
          return `<ul class="pdf-answer-list" id="ans-list-${playId}">` +
            sentences
              .map((s, si) => {
                const wordsHTML = s
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((w, wi) => {
                    const key = w.toLowerCase().replace(/[.,!?;:«»""''()\[\]{}\-–—\/\\]/g, '');
                    const isKey = keyWords.has(key);
                    const en = isKey ? state.vocab[key]?.en : '';
                    const tip = en ? ` title="${escapeHtml(en)}"` : '';
                    return `<span class="pdf-word${isKey ? ' pdf-key' : ''}"${tip} data-s="${si}" data-w="${wi}">${escapeHtml(w)}</span>`;
                  })
                  .join(' ');
                return `<li data-sentence="${si}" data-text="${escapeHtml(s)}"><span class="pdf-no">${wordsHTML}<span class="pdf-sent-btns"><button class="pdf-sent-btn" onclick="pdfPlaySentence('${playId}',${si},false)" title="Play this sentence">▶</button><button class="pdf-sent-btn" onclick="pdfPlaySentence('${playId}',${si},true)" title="Repeat this sentence until stopped">🔁</button></span></span><span class="pdf-en">${enOf(s)}</span></li>`;
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
            <div class="pdf-row pdf-followup-q">
              <span>🔁 ${escapeHtml(fu.q)}
                <button class="pdf-listen-btn" onclick="pdfPlayItem('${fuId}')" title="Listen">🔊</button>
              </span>
              <span class="pdf-en">${enOf(fu.q)}</span>
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

          // Keep the user's (drag-and-drop) order; show the exam type as a per-question tag
          // instead of regrouping by A/B/C, which would scramble the chosen order.
          const typeGroupsHTML = catQs.map(q => {
              const myAnswer = state.answers[q.id]?.trim();
              const t = q.examType;
              const typeTag = EXAM_TYPE_LABEL[t]
                ? `<h3 class="pdf-type-${t}" style="margin:0 0 6px;font-size:0.8rem">${EXAM_TYPE_LABEL[t]}</h3>`
                : '';
              return `
      <div class="pdf-item" id="play-${q.id}" data-q="${escapeHtml(q.q)}">
        ${typeTag}
        <div class="pdf-row pdf-question" id="q-${q.id}">
          <span><span class="pdf-qnum">${catPosition(q)}</span> ${escapeHtml(q.q)}
            <button class="pdf-listen-btn" onclick="pdfPlayItem('${q.id}')" title="Listen">🔊</button>
          </span>
          <span class="pdf-en">${enOf(q.q)}</span>
        </div>
        <div class="pdf-answer ${myAnswer ? 'pdf-answer-done' : 'pdf-answer-empty'}">${answerBulletsHTML(myAnswer, q.id)}</div>
        ${vocabHTMLFor(q)}
        ${followUpsHTMLFor(q)}
      </div>`;
          }).join('');

          return `
    <div class="pdf-section" id="cat-${cat.id}">
      <h2>${cat.emoji} ${escapeHtml(cat.label)}</h2>
      <div class="pdf-colhead"><span>🇳🇴 Norsk</span><span>🇬🇧 English</span></div>
      ${typeGroupsHTML}
    </div>`;
        }).join('');

        printWindow.document.open();
        printWindow.document.write(`
<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Norsk B1 — My Questions &amp; Answers</title>
<style>
  body { font-family: 'DM Sans', Arial, sans-serif; color: #1a2235; padding: 24px 32px; max-width: 800px; margin: 0 auto; font-size: 1.05rem; }
  body { max-width: 1000px; }
  @media (max-width: 600px) {
    body { padding: 14px 16px; font-size: 1rem; }
    h1 { font-size: 1.3rem; }
    .pdf-toc { overflow-x: auto; }
    .pdf-toc table { font-size: 0.85rem; }
    .pdf-controls { position: static; gap: 8px; }
    .pdf-controls button { flex: 1 1 auto; padding: 10px 8px; font-size: 0.85rem; min-height: 40px; }
    .pdf-question { font-size: 1.05rem; }
    .pdf-answer, .pdf-answer-list li { font-size: 1rem; }
    .pdf-row, .pdf-answer-list li, .pdf-colhead { gap: 10px; }
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
  .pdf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .pdf-answer-list { margin: 0; padding-left: 0; list-style: none; }
  .pdf-answer-list li { margin-bottom: 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .pdf-sent-btns { margin-left: 6px; white-space: nowrap; }
  .pdf-sent-btn { font-size: 0.8rem; border: none; background: #eef2ff; border-radius: 6px; cursor: pointer; padding: 2px 6px; margin-right: 3px; opacity: 0.75; }
  .pdf-sent-btn:hover { opacity: 1; }
  #pdfPrevBtn, #pdfNextBtn { background: #eef2ff; color: #4338ca; }
  #pdfLoopBtn { background: #f1f5f9; color: #475569; }
  #pdfLoopBtn.on { background: #16a34a; color: #fff; }
  .pdf-controls select { font-family: inherit; font-size: 0.85rem; padding: 7px 6px; border-radius: 8px; border: 1px solid #cbd5e1; }
  .pdf-en { color: #475569; font-weight: 400; font-style: italic; }
  .pdf-question .pdf-en, .pdf-followup-q .pdf-en { font-weight: 600; }
  .pdf-answer-done .pdf-answer-list li .pdf-en { color: #475569; font-weight: 400; }
  .pdf-colhead { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 14px; }
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
  .pdf-word.pdf-key { background: #f3e8ff; color: #6b21a8; font-weight: 700; border-bottom: 2px solid #c084fc; }
  .pdf-word { transition: background 0.1s; border-radius: 3px; padding: 0 1px; }
  .pdf-word.speaking, .pdf-word.pdf-key.speaking { background: #fde047; }
  .pdf-item.playing, .pdf-followup-item.playing { outline: 2px solid #2563eb; outline-offset: 4px; border-radius: 8px; }
  @media (max-width: 600px) {
    .pdf-listen-btn { font-size: 1.1rem; }
  }
  @media print {
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { padding: 0; }
    .pdf-item { break-inside: avoid; }
    .pdf-controls, .pdf-listen-btn, .pdf-sent-btns { display: none; }
  }
</style>
</head>
<body>
  <div class="pdf-controls">
    <button id="pdfPlayAllBtn" onclick="pdfPlayAll()">▶ Play All</button>
    <button id="pdfPrevBtn" onclick="pdfJumpSentence(-1)" title="Back to the start of this sentence (press again for the previous one)">⏮ Sentence</button>
    <button id="pdfNextBtn" onclick="pdfJumpSentence(1)" title="Skip to the next sentence">Sentence ⏭</button>
    <button id="pdfLoopBtn" onclick="pdfToggleLoop()" title="Repeat the current sentence until you turn this off">🔁 Repeat: off</button>
    <select id="pdfSpeed" onchange="pdfSetSpeed(this.value)" title="Speech speed">
      <option value="0.3">0.3× slower</option>
      <option value="0.42" selected>Normal</option>
      <option value="0.6">Faster</option>
      <option value="0.8">Fastest</option>
    </select>
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
  <div class="pdf-meta">Key vocabulary in your answers is <span class="pdf-word pdf-key">highlighted</span> &mdash; hover a word to see its English meaning.</div>
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
  const SLNC_WORD = 250, SLNC_WORD_REPEAT = 150, SLNC_LINE = 550, SLNC_SECTION = 1200;
  let RATE = 0.42, loopSentence = false;
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
            q.push({ playId, type: 'word', wordEl, pause: stepPause, pass, si, first: wi === 0, last: isLastWord });
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
      if (loopSentence && step.type === 'word' && step.last) {
        // Repeat: jump back to the first word of this sentence.
        let j = index;
        while (j > 0 && !queue[j].first) j--;
        index = j;
        continue;
      }
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

  function pdfSetSpeed(v) { RATE = +v; }

  function setLoop(on) {
    loopSentence = on;
    const b = document.getElementById('pdfLoopBtn');
    if (b) {
      b.textContent = '🔁 Repeat: ' + (on ? 'on' : 'off');
      b.classList.toggle('on', on);
    }
  }
  function pdfToggleLoop() { setLoop(!loopSentence); }

  // Plays a single answer sentence (word by word, highlighted). With loop=true it
  // turns Repeat on, so the sentence keeps replaying until stopped or toggled off.
  function pdfPlaySentence(playId, si, loop) {
    const steps = buildQueue().filter(
      s => s.playId === playId && s.type === 'word' && s.pass === 0 && s.si === si
    );
    if (!steps.length) return;
    if (loop) setLoop(true);
    queue = steps;
    index = 0;
    stopped = false;
    paused = false;
    runId++;
    const thisRunId = runId;
    updateButtons();
    updateSeekBar();
    window.speechSynthesis.cancel();
    setTimeout(() => runQueue(thisRunId), 50);
  }

  // dir -1: restart the current sentence, or step back to the previous one if
  // already at its start. dir +1: skip to the next sentence.
  function pdfJumpSentence(dir) {
    if (stopped || !queue.length) return;
    const starts = [];
    queue.forEach((s, i) => { if (s.type !== 'word' || s.first) starts.push(i); });
    const curStart = [...starts].reverse().find(i => i <= index);
    let target;
    if (dir < 0) {
      if (index > curStart) target = curStart;
      else {
        const prev = [...starts].reverse().find(i => i < curStart);
        target = prev === undefined ? 0 : prev;
      }
    } else {
      target = starts.find(i => i > index);
      if (target === undefined) return;
    }
    pdfSeekTo(target);
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


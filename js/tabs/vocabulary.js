      // ═══════════════════════════════════════════════════════════════════════════════
      // ─── VOCABULARY PAGE ──────────────────────────────────────────────────────────
      // state.vocab = { [word]: { en, example, source, added, status } }
      // ═══════════════════════════════════════════════════════════════════════════════

      const NO_STOP = new Set([
        'jeg',
        'du',
        'han',
        'hun',
        'vi',
        'de',
        'det',
        'den',
        'ei',
        'en',
        'et',
        'og',
        'i',
        'på',
        'til',
        'av',
        'for',
        'med',
        'som',
        'at',
        'men',
        'om',
        'så',
        'når',
        'da',
        'her',
        'der',
        'seg',
        'sin',
        'sitt',
        'sine',
        'fra',
        'er',
        'var',
        'har',
        'hadde',
        'ikke',
        'kan',
        'vil',
        'skal',
        'må',
        'bør',
        'kunne',
        'ville',
        'skulle',
        'måtte',
        'burde',
        'bli',
        'blitt',
        'ble',
        'noen',
        'noe',
        'alle',
        'mange',
        'mye',
        'litt',
        'veldig',
        'også',
        'bare',
        'eller',
        'hva',
        'hvem',
        'hvor',
        'dette',
        'disse',
        'jo',
        'rett',
        'nok',
        'ganske',
        'helt',
        'aldri',
        'alltid',
        'ofte',
        'nå',
        'igjen',
        'allerede',
        'inn',
        'ut',
        'opp',
        'ned',
        'etter',
        'under',
        'over',
        'mot',
        'rundt',
        'siden',
        'fordi',
        'derfor',
        'andre',
        'selv',
        'blant',
        'fleste',
        'både',
        'enten',
        'mens',
        'verken',
        'heller',
        'mine',
        'dine',
        'hans',
        'hennes',
        'vår',
        'deres',
        'mitt',
        'ditt',
        'vårt',
        'sa',
        'sier',
        'vet',
        'synes',
        'liker',
        'gjøre',
        'sette',
        'stå',
        'legge',
        'med',
        'om',
      ]);

      function extractWords(text) {
        return [
          ...new Set(
            text
              .toLowerCase()
              .replace(/[.,!?;:«»""''()\[\]{}\-–—\/\\]/g, ' ')
              .split(/\s+/)
              .filter(
                w => w.length >= 4 && !NO_STOP.has(w) && /^[a-zæøå]+$/.test(w)
              )
          ),
        ];
      }

      function scanAnswersForVocab() {
        const found = new Set();
        Object.values(state.answers || {}).forEach(ans => {
          if (ans && ans.trim()) extractWords(ans).forEach(w => found.add(w));
        });
        return [...found].sort();
      }

      function ensureVocabInState() {
        if (!state.vocab) state.vocab = {};
      }

      async function addVocabWord(word, source) {
        ensureVocabInState();
        word = word.toLowerCase().trim();
        if (!word || state.vocab[word]) return false;
        state.vocab[word] = {
          en: null,
          example: null,
          source: source || 'manual',
          added: new Date().toISOString().slice(0, 10),
          status: 'new',
        };
        saveState();
        return true;
      }

      function deleteVocabWord(word) {
        ensureVocabInState();
        delete state.vocab[word];
        saveState();
        renderVocab();
      }

      function cycleVocabStatus(word) {
        ensureVocabInState();
        if (!state.vocab[word]) return;
        const cycle = { new: 'learning', learning: 'known', known: 'new' };
        state.vocab[word].status = cycle[state.vocab[word].status] || 'new';
        saveState();
        renderVocabTable();
      }

      async function translateVocabWord(word) {
        ensureVocabInState();
        const entry = state.vocab[word];
        if (!entry || entry.en) return;
        try {
          const { text: en } = await freeTranslate(word, 'no', 'en');
          entry.en = en;
          const exSrc = allQuestions().find(q =>
            (q.a || '').toLowerCase().includes(word)
          );
          if (exSrc) {
            const sentences = exSrc.a
              .split(/[.!?]+/)
              .filter(s => s.toLowerCase().includes(word));
            if (sentences[0]) {
              const ex = sentences[0].trim();
              const { text: exEn } = await freeTranslate(ex, 'no', 'en');
              entry.example = { no: ex, en: exEn };
            }
          }
          saveState();
        } catch (_) {}
      }

      let _scanRunning = false;
      async function scanAndImport() {
        if (_scanRunning) return;
        _scanRunning = true;
        const btn = document.getElementById('vocab-scan-btn');
        if (btn) {
          btn.disabled = true;
          btn.textContent = '⏳ Scanning…';
        }
        ensureVocabInState();
        const words = scanAnswersForVocab();
        let added = 0;
        for (const w of words) {
          if (!state.vocab[w]) {
            await addVocabWord(w, 'answer');
            added++;
          }
        }
        saveState();
        _scanRunning = false;
        if (btn) {
          btn.disabled = false;
          btn.textContent = '🔍 Scan My Answers';
        }
        showToast(
          `✅ Added ${added} new word${added !== 1 ? 's' : ''} from your answers!`
        );
        renderVocab();
      }

      let _batchRunning = false;
      async function translateAllVocab() {
        if (_batchRunning) return;
        _batchRunning = true;
        ensureVocabInState();
        const untranslated = Object.keys(state.vocab).filter(
          w => !state.vocab[w].en
        );
        if (!untranslated.length) {
          showToast('✅ All words already translated!');
          _batchRunning = false;
          return;
        }
        const btn = document.getElementById('vocab-translate-all-btn');
        if (btn) {
          btn.disabled = true;
        }
        for (let i = 0; i < untranslated.length; i++) {
          await translateVocabWord(untranslated[i]);
          if (btn) btn.textContent = `⏳ ${i + 1}/${untranslated.length}…`;
          await new Promise(r => setTimeout(r, 260));
        }
        _batchRunning = false;
        if (btn) {
          btn.disabled = false;
          btn.textContent = '🌐 Translate All';
        }
        showToast('✅ All words translated!');
        renderVocabTable();
      }

      let _vocabFilter = 'all';
      let _vocabSearch = '';
      let _fcQueue = [],
        _fcIdx = 0,
        _fcFlipped = false;

      function getFilteredVocab() {
        ensureVocabInState();
        return Object.entries(state.vocab)
          .filter(([w, e]) => {
            if (_vocabFilter !== 'all' && e.status !== _vocabFilter)
              return false;
            if (
              _vocabSearch &&
              !w.includes(_vocabSearch) &&
              !(e.en || '').toLowerCase().includes(_vocabSearch)
            )
              return false;
            return true;
          })
          .sort((a, b) => a[0].localeCompare(b[0]));
      }

      function renderVocab() {
        const root = document.getElementById('vocab-page-root');
        if (!root) return;
        ensureVocabInState();
        const all = Object.keys(state.vocab).length;
        const known = Object.values(state.vocab).filter(
          e => e.status === 'known'
        ).length;
        const learning = Object.values(state.vocab).filter(
          e => e.status === 'learning'
        ).length;
        const newW = Object.values(state.vocab).filter(
          e => e.status === 'new'
        ).length;
        const translated = Object.values(state.vocab).filter(e => e.en).length;

        root.innerHTML = `
          <h2 style="font-size:1.5rem;margin-bottom:6px">📖 Vocabulary</h2>
          <p style="font-size:0.86rem;color:#64748b;margin-bottom:18px">
            Words extracted from your answers — Norwegian &amp; English columns, with example sentences.
            All translations are <strong>free</strong> (no API key).
          </p>
          <div class="vocab-stats-row">
            <div class="vocab-stat"><div class="vocab-stat-num" style="color:#2563eb">${all}</div><div class="vocab-stat-lbl">Total</div></div>
            <div class="vocab-stat"><div class="vocab-stat-num" style="color:#16a34a">${known}</div><div class="vocab-stat-lbl">✅ Known</div></div>
            <div class="vocab-stat"><div class="vocab-stat-num" style="color:#d97706">${learning}</div><div class="vocab-stat-lbl">📚 Learning</div></div>
            <div class="vocab-stat"><div class="vocab-stat-num" style="color:#64748b">${newW}</div><div class="vocab-stat-lbl">🆕 New</div></div>
            <div class="vocab-stat"><div class="vocab-stat-num" style="color:#7c3aed">${translated}</div><div class="vocab-stat-lbl">🌐 Translated</div></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center">
            <button class="scan-btn" id="vocab-scan-btn" onclick="scanAndImport()">🔍 Scan My Answers</button>
            <button class="scan-btn" id="vocab-translate-all-btn" onclick="translateAllVocab()" style="background:#7c3aed">🌐 Translate All</button>
            <button class="scan-btn" onclick="startFlashcards()" style="background:#0891b2">🃏 Flashcard Quiz</button>
            <button class="scan-btn" onclick="exportVocab()" style="background:#475569">⬇ Export CSV</button>
          </div>
          <div class="vocab-add-row">
            <input id="vocab-add-no" placeholder="Norwegian word…" onkeydown="if(event.key==='Enter')addVocabManual()">
            <input id="vocab-add-en" placeholder="English meaning (auto-translates if blank)">
            <input id="vocab-add-ex" placeholder="Example sentence (optional)">
            <button class="btn btn-primary" onclick="addVocabManual()">➕ Add</button>
          </div>
          <div class="vocab-toolbar">
            <input class="vocab-search" id="vocab-search-inp" placeholder="🔎 Search words or translations…"
              value="${_vocabSearch}"
              oninput="_vocabSearch=this.value.toLowerCase();renderVocabTable()">
            ${['all', 'new', 'learning', 'known']
              .map(
                f =>
                  `<span class="vocab-filter-chip${_vocabFilter === f ? ' active' : ''}"
                onclick="_vocabFilter='${f}';document.querySelectorAll('.vocab-filter-chip').forEach(c=>c.classList.remove('active'));this.classList.add('active');renderVocabTable()">
                ${{ all: 'All', new: '🆕 New', learning: '📚 Learning', known: '✅ Known' }[f]}
              </span>`
              )
              .join('')}
          </div>
          <div id="vocab-table-container"></div>
          <div id="vocab-fc-area" class="hidden"></div>`;

        renderVocabTable();
      }

      function renderVocabTable() {
        const container = document.getElementById('vocab-table-container');
        if (!container) return;
        const entries = getFilteredVocab();
        if (!entries.length) {
          container.innerHTML = `<div style="text-align:center;padding:44px;color:#94a3b8;font-size:0.9rem">
            ${
              Object.keys(state.vocab || {}).length === 0
                ? '📭 No vocabulary yet.<br>Click <strong>🔍 Scan My Answers</strong> to auto-import words, or add words manually above.'
                : '🔎 No words match your current filter.'
            }
          </div>`;
          return;
        }
        const sLabel = {
          new: '🆕 New',
          learning: '📚 Learning',
          known: '✅ Known',
        };
        const sCls = {
          new: 'vs-new',
          learning: 'vs-learning',
          known: 'vs-known',
        };
        container.innerHTML = `
          <div class="vocab-table-wrap">
            <table class="vocab-table">
              <thead><tr>
                <th>#</th>
                <th>🇳🇴 Norwegian</th>
                <th>🇬🇧 English</th>
                <th>📝 Example — Norwegian</th>
                <th>📝 Example — English</th>
                <th>Source</th>
                <th>Status</th>
                <th></th>
              </tr></thead>
              <tbody>${entries
                .map(
                  ([word, e], i) => `
                <tr>
                  <td style="color:#94a3b8;font-size:0.72rem">${i + 1}</td>
                  <td><span class="vocab-no">${word}</span></td>
                  <td>${
                    e.en
                      ? `<span class="vocab-en">${e.en}</span>`
                      : `<button class="btn btn-ghost" style="font-size:0.72rem;padding:3px 9px"
                         onclick="translateOneVocab('${word.replace(/'/g, "\\'")}')">🌐 Translate</button>`
                  }
                  </td>
                  <td class="vocab-ex">${e.example?.no ? `<em>${e.example.no}</em>` : '<span style="color:#cbd5e1">—</span>'}</td>
                  <td class="vocab-ex" style="color:#2563eb">${e.example?.en || '<span style="color:#cbd5e1">—</span>'}</td>
                  <td><span class="vocab-src">${e.source === 'answer' ? '✏️ answer' : e.source === 'manual' ? '👤 manual' : e.source}</span></td>
                  <td><button class="vocab-status-btn ${sCls[e.status]}"
                        onclick="cycleVocabStatus('${word.replace(/'/g, "\\'")}')">
                        ${sLabel[e.status]}</button></td>
                  <td><button class="vocab-del-btn" onclick="deleteVocabWord('${word.replace(/'/g, "\\'")}')">🗑</button></td>
                </tr>`
                )
                .join('')}
              </tbody>
            </table>
          </div>
          <div style="font-size:0.74rem;color:#94a3b8;margin-top:6px">
            ${entries.length} word${entries.length !== 1 ? 's' : ''} shown.
            Click <strong>Status</strong> to cycle: 🆕 New → 📚 Learning → ✅ Known.
          </div>`;
      }

      async function translateOneVocab(word) {
        await translateVocabWord(word);
        renderVocabTable();
      }

      async function addVocabManual() {
        const wEl = document.getElementById('vocab-add-no');
        const eEl = document.getElementById('vocab-add-en');
        const xEl = document.getElementById('vocab-add-ex');
        const word = wEl?.value.trim().toLowerCase();
        if (!word) {
          showToast('⚠️ Enter a Norwegian word.');
          return;
        }
        ensureVocabInState();
        if (state.vocab[word]) {
          showToast(`"${word}" already exists.`);
          return;
        }
        state.vocab[word] = {
          en: eEl?.value.trim() || null,
          example: xEl?.value.trim()
            ? { no: xEl.value.trim(), en: null }
            : null,
          source: 'manual',
          added: new Date().toISOString().slice(0, 10),
          status: 'new',
        };
        if (!state.vocab[word].en) {
          showToast('🌐 Auto-translating…', 1500);
          await translateVocabWord(word);
        }
        saveState();
        if (wEl) wEl.value = '';
        if (eEl) eEl.value = '';
        if (xEl) xEl.value = '';
        showToast(`✅ "${word}" added!`);
        renderVocab();
      }

      function exportVocab() {
        ensureVocabInState();
        const rows = [
          [
            'Norwegian',
            'English',
            'Example (NO)',
            'Example (EN)',
            'Source',
            'Status',
            'Added',
          ],
        ];
        Object.entries(state.vocab).forEach(([w, e]) => {
          rows.push([
            w,
            e.en || '',
            e.example?.no || '',
            e.example?.en || '',
            e.source,
            e.status,
            e.added,
          ]);
        });
        const csv = rows
          .map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))
          .join('\n');
        const blob = new Blob(['\uFEFF' + csv], {
          type: 'text/csv;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'norsk-b1-vocabulary.csv';
        a.click();
        URL.revokeObjectURL(url);
        showToast('⬇ CSV downloaded!');
      }

      function startFlashcards() {
        ensureVocabInState();
        _fcQueue = Object.entries(state.vocab)
          .filter(([, e]) => e.en && e.status !== 'known')
          .map(([w]) => w)
          .sort(() => Math.random() - 0.5);
        if (!_fcQueue.length) {
          showToast('🎉 All known or none translated yet!', 3000);
          return;
        }
        _fcIdx = 0;
        _fcFlipped = false;
        const tbl = document.getElementById('vocab-table-container');
        if (tbl) tbl.classList.add('hidden');
        const fc = document.getElementById('vocab-fc-area');
        if (fc) fc.classList.remove('hidden');
        renderFlashcard();
      }

      function renderFlashcard() {
        const fc = document.getElementById('vocab-fc-area');
        if (!fc) return;
        if (_fcIdx >= _fcQueue.length) {
          fc.innerHTML = `<div style="text-align:center;padding:40px">
            <div style="font-size:2.5rem;margin-bottom:12px">🎉</div>
            <div style="font-size:1.2rem;font-weight:700;color:#1a2235;margin-bottom:8px">Round complete!</div>
            <div style="font-size:0.9rem;color:#64748b;margin-bottom:20px">You went through ${_fcQueue.length} words.</div>
            <button class="scan-btn" onclick="startFlashcards()">🔁 Shuffle Again</button>
            <button class="scan-btn" onclick="exitFlashcards()" style="background:#475569;margin-left:8px">⬅ Back to Table</button>
          </div>`;
          return;
        }
        const word = _fcQueue[_fcIdx];
        const entry = state.vocab[word] || {};
        _fcFlipped = false;
        fc.innerHTML = `
          <div class="fc-progress">Card ${_fcIdx + 1} of ${_fcQueue.length}</div>
          <div class="flashcard-wrap">
            <div class="flashcard" id="fc-card" onclick="flipFlashcard()">
              <div class="flashcard-face flashcard-front">
                <div class="flashcard-word">${word}</div>
                <div class="flashcard-hint">🇳🇴 Norwegian · tap to reveal English →</div>
              </div>
              <div class="flashcard-face flashcard-back">
                <div class="flashcard-trans">${entry.en || '?'}</div>
                ${entry.example?.no ? `<div class="flashcard-ex"><em>"${entry.example.no}"</em>${entry.example.en ? `<br><span style="opacity:0.8">→ "${entry.example.en}"</span>` : ''}</div>` : ''}
              </div>
            </div>
          </div>
          <div class="flashcard-controls" id="fc-controls" style="display:none">
            <button class="fc-btn fc-knew"  onclick="fcAnswer('known')">✅ Knew it!</button>
            <button class="fc-btn fc-again" onclick="fcAnswer('learning')">🔁 Again</button>
            <button class="fc-btn fc-skip"  onclick="fcAnswer(null)">⏭ Skip</button>
          </div>
          <div style="text-align:center;margin-top:10px">
            <button class="btn btn-ghost" style="font-size:0.78rem" onclick="exitFlashcards()">⬅ Exit quiz</button>
          </div>`;
      }

      function flipFlashcard() {
        const card = document.getElementById('fc-card');
        if (card) card.classList.toggle('flipped');
        _fcFlipped = !_fcFlipped;
        if (_fcFlipped) {
          const ctrl = document.getElementById('fc-controls');
          if (ctrl) ctrl.style.display = 'flex';
        }
      }

      function fcAnswer(newStatus) {
        const word = _fcQueue[_fcIdx];
        if (newStatus && state.vocab[word]) {
          state.vocab[word].status = newStatus;
          saveState();
        }
        _fcIdx++;
        renderFlashcard();
      }

      function exitFlashcards() {
        const tbl = document.getElementById('vocab-table-container');
        if (tbl) tbl.classList.remove('hidden');
        const fc = document.getElementById('vocab-fc-area');
        if (fc) {
          fc.innerHTML = '';
          fc.classList.add('hidden');
        }
        renderVocabTable();
      }


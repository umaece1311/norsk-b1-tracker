      // ═══════════════════════════════════════════════════════════════════════════════
      // ─── VOCABULARY PAGE ──────────────────────────────────────────────────────────
      // state.vocab = { [word]: { en, example, source, added, status,
      //                          present, past, ppres, ppart } }
      // ═══════════════════════════════════════════════════════════════════════════════

      const NO_STOP = new Set([
        'jeg','du','han','hun','vi','de','det','den','ei','en','et','og','i',
        'på','til','av','for','med','som','at','men','om','så','når','da',
        'her','der','seg','sin','sitt','sine','fra','er','var','har','hadde',
        'ikke','kan','vil','skal','må','bør','kunne','ville','skulle','måtte',
        'burde','bli','blitt','ble','noen','noe','alle','mange','mye','litt',
        'veldig','også','bare','eller','hva','hvem','hvor','dette','disse',
        'jo','rett','nok','ganske','helt','aldri','alltid','ofte','nå','igjen',
        'allerede','inn','ut','opp','ned','etter','under','over','mot','rundt',
        'siden','fordi','derfor','andre','selv','blant','fleste','både','enten',
        'mens','verken','heller','mine','dine','hans','hennes','vår','deres',
        'mitt','ditt','vårt','sa','sier','vet','synes','liker','gjøre','sette',
        'stå','legge','med','om',
      ]);

      // ── Irregular / common Norwegian verb conjugation lookup ─────────────────────
      // Keys are infinitives (without å). Values: present, past, ppres, ppart.
      const IRREG_VERBS = {
        'være':     { present:'er',        past:'var',       ppres:'værende',      ppart:'vært' },
        'ha':       { present:'har',       past:'hadde',     ppres:'havende',      ppart:'hatt' },
        'si':       { present:'sier',      past:'sa',        ppres:'siende',       ppart:'sagt' },
        'gjøre':    { present:'gjør',      past:'gjorde',    ppres:'gjørende',     ppart:'gjort' },
        'gå':       { present:'går',       past:'gikk',      ppres:'gående',       ppart:'gått' },
        'komme':    { present:'kommer',    past:'kom',       ppres:'kommende',     ppart:'kommet' },
        'ta':       { present:'tar',       past:'tok',       ppres:'takende',      ppart:'tatt' },
        'få':       { present:'får',       past:'fikk',      ppres:'fående',       ppart:'fått' },
        'se':       { present:'ser',       past:'så',        ppres:'seende',       ppart:'sett' },
        'vite':     { present:'vet',       past:'visste',    ppres:'vitende',      ppart:'visst' },
        'gi':       { present:'gir',       past:'ga',        ppres:'givende',      ppart:'gitt' },
        'bli':      { present:'blir',      past:'ble',       ppres:'blivende',     ppart:'blitt' },
        'legge':    { present:'legger',    past:'la',        ppres:'leggende',     ppart:'lagt' },
        'sette':    { present:'setter',    past:'satte',     ppres:'settende',     ppart:'satt' },
        'stå':      { present:'står',      past:'sto',       ppres:'stående',      ppart:'stått' },
        'skrive':   { present:'skriver',   past:'skrev',     ppres:'skrivende',    ppart:'skrevet' },
        'lese':     { present:'leser',     past:'leste',     ppres:'lesende',      ppart:'lest' },
        'spise':    { present:'spiser',    past:'spiste',    ppres:'spisende',     ppart:'spist' },
        'kjøre':    { present:'kjører',    past:'kjørte',    ppres:'kjørende',     ppart:'kjørt' },
        'bo':       { present:'bor',       past:'bodde',     ppres:'boende',       ppart:'bodd' },
        'snakke':   { present:'snakker',   past:'snakket',   ppres:'snakkende',    ppart:'snakket' },
        'arbeide':  { present:'arbeider',  past:'arbeidet',  ppres:'arbeidende',   ppart:'arbeidet' },
        'bruke':    { present:'bruker',    past:'brukte',    ppres:'brukende',     ppart:'brukt' },
        'like':     { present:'liker',     past:'likte',     ppres:'likende',      ppart:'likt' },
        'høre':     { present:'hører',     past:'hørte',     ppres:'hørende',      ppart:'hørt' },
        'svare':    { present:'svarer',    past:'svarte',    ppres:'svarende',     ppart:'svart' },
        'hjelpe':   { present:'hjelper',   past:'hjalp',     ppres:'hjelpende',    ppart:'hjulpet' },
        'betale':   { present:'betaler',   past:'betalte',   ppres:'betalende',    ppart:'betalt' },
        'fortelle': { present:'forteller', past:'fortalte',  ppres:'fortellende',  ppart:'fortalt' },
        'forstå':   { present:'forstår',   past:'forstod',   ppres:'forstående',   ppart:'forstått' },
        'skje':     { present:'skjer',     past:'skjedde',   ppres:'skjende',      ppart:'skjedd' },
        'trenge':   { present:'trenger',   past:'trengte',   ppres:'trengende',    ppart:'trengt' },
        'tenke':    { present:'tenker',    past:'tenkte',    ppres:'tenkende',     ppart:'tenkt' },
        'vente':    { present:'venter',    past:'ventet',    ppres:'ventende',     ppart:'ventet' },
        'åpne':     { present:'åpner',     past:'åpnet',     ppres:'åpnende',      ppart:'åpnet' },
        'lukke':    { present:'lukker',    past:'lukket',    ppres:'lukkende',     ppart:'lukket' },
        'møte':     { present:'møter',     past:'møtte',     ppres:'møtende',      ppart:'møtt' },
        'prøve':    { present:'prøver',    past:'prøvde',    ppres:'prøvende',     ppart:'prøvd' },
        'leve':     { present:'lever',     past:'levde',     ppres:'levende',      ppart:'levd' },
        'ønske':    { present:'ønsker',    past:'ønsket',    ppres:'ønskende',     ppart:'ønsket' },
        'bety':     { present:'betyr',     past:'betydde',   ppres:'betydende',    ppart:'betydd' },
        'flytte':   { present:'flytter',   past:'flyttet',   ppres:'flyttende',    ppart:'flyttet' },
        'kjenne':   { present:'kjenner',   past:'kjente',    ppres:'kjennende',    ppart:'kjent' },
        'lære':     { present:'lærer',     past:'lærte',     ppres:'lærende',      ppart:'lært' },
        'starte':   { present:'starter',   past:'startet',   ppres:'startende',    ppart:'startet' },
        'stoppe':   { present:'stopper',   past:'stoppet',   ppres:'stoppende',    ppart:'stoppet' },
        'spørre':   { present:'spør',      past:'spurte',    ppres:'spørrende',    ppart:'spurt' },
        'finne':    { present:'finner',    past:'fant',      ppres:'finnende',     ppart:'funnet' },
        'sende':    { present:'sender',    past:'sendte',    ppres:'sendende',     ppart:'sendt' },
        'følge':    { present:'følger',    past:'fulgte',    ppres:'følgende',     ppart:'fulgt' },
        'velge':    { present:'velger',    past:'valgte',    ppres:'velgende',     ppart:'valgt' },
        'drikke':   { present:'drikker',   past:'drakk',     ppres:'drikkende',    ppart:'drukket' },
        'kjøpe':    { present:'kjøper',    past:'kjøpte',    ppres:'kjøpende',     ppart:'kjøpt' },
        'selge':    { present:'selger',    past:'solgte',    ppres:'selgende',     ppart:'solgt' },
        'hete':     { present:'heter',     past:'het',       ppres:'hetende',      ppart:'hett' },
        'vise':     { present:'viser',     past:'viste',     ppres:'visende',      ppart:'vist' },
        'spille':   { present:'spiller',   past:'spilte',    ppres:'spillende',    ppart:'spilt' },
        'skrive':   { present:'skriver',   past:'skrev',     ppres:'skrivende',    ppart:'skrevet' },
        'reise':    { present:'reiser',    past:'reiste',    ppres:'reisende',     ppart:'reist' },
        'vokse':    { present:'vokser',    past:'vokste',    ppres:'voksende',     ppart:'vokst' },
        'føle':     { present:'føler',     past:'følte',     ppres:'følende',      ppart:'følt' },
        'lete':     { present:'leter',     past:'lette',     ppres:'letende',      ppart:'lett' },
        'kalle':    { present:'kaller',    past:'kalte',     ppres:'kallende',     ppart:'kalt' },
        'handle':   { present:'handler',   past:'handlet',   ppres:'handlede',     ppart:'handlet' },
        'forklare': { present:'forklarer', past:'forklarte', ppres:'forklarende',  ppart:'forklart' },
        'besøke':   { present:'besøker',   past:'besøkte',   ppres:'besøkende',    ppart:'besøkt' },
        'delta':    { present:'deltar',    past:'deltok',    ppres:'deltaende',    ppart:'deltatt' },
        'løpe':     { present:'løper',     past:'løp',       ppres:'løpende',      ppart:'løpt' },
        'sove':     { present:'sover',     past:'sov',       ppres:'sovende',      ppart:'sovet' },
        'falle':    { present:'faller',    past:'falt',      ppres:'fallende',     ppart:'falt' },
        'holde':    { present:'holder',    past:'holdt',     ppres:'holdende',     ppart:'holdt' },
        'nå':       { present:'når',       past:'nådde',     ppres:'nående',       ppart:'nådd' },
        'betyde':   { present:'betyr',     past:'betydde',   ppres:'betydende',    ppart:'betydd' },
      };

      // ── Simple group-1 heuristic for regular -e verbs ─────────────────────────────
      function getAutoConjugation(word) {
        if (IRREG_VERBS[word]) return IRREG_VERBS[word];
        // Group 1: most regular verbs ending in consonant + e (e.g. snakke, arbeide)
        if (word.length >= 5 && word.endsWith('e')) {
          const stem = word.slice(0, -1);
          return {
            present: stem + 'r',
            past: stem + 't',
            ppres: word + 'nde',
            ppart: stem + 't',
          };
        }
        return null;
      }

      // ── Word extraction ───────────────────────────────────────────────────────────
      function extractWords(text) {
        return [
          ...new Set(
            text
              .toLowerCase()
              .replace(/[.,!?;:«»""''()\[\]{}\-–—\/\\]/g, ' ')
              .split(/\s+/)
              .filter(w => w.length >= 4 && !NO_STOP.has(w) && /^[a-zæøå]+$/.test(w))
          ),
        ];
      }

      function scanAnswersForVocab() {
        const found = new Set();
        // From user answers
        Object.values(state.answers || {}).forEach(ans => {
          if (ans && ans.trim()) extractWords(ans).forEach(w => found.add(w));
        });
        // Also from question text and sample answers
        allQuestions().forEach(q => {
          if (q.a) extractWords(q.a).forEach(w => found.add(w));
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
        const conj = getAutoConjugation(word);
        state.vocab[word] = {
          en: null,
          example: null,
          source: source || 'manual',
          added: new Date().toISOString().slice(0, 10),
          status: 'new',
          present: conj?.present || null,
          past:    conj?.past    || null,
          ppres:   conj?.ppres   || null,
          ppart:   conj?.ppart   || null,
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

      // ── TTS for a single vocabulary word ─────────────────────────────────────────
      function speakVocabWord(word) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(word);
        utt.lang = 'nb-NO';
        utt.rate = 0.8;
        const voices = window.speechSynthesis.getVoices();
        const norVoice = voices.find(v => v.lang.startsWith('nb') || v.lang.startsWith('no'));
        if (norVoice) utt.voice = norVoice;
        window.speechSynthesis.speak(utt);
      }

      // ── Inline conjugation editing ────────────────────────────────────────────────
      function editConjCell(word, field) {
        ensureVocabInState();
        const entry = state.vocab[word];
        if (!entry) return;
        const cellId = 'vconj-' + field + '-' + word.replace(/[^a-z]/g, '_');
        const cell = document.getElementById(cellId);
        if (!cell) return;
        const current = entry[field] || '';
        cell.innerHTML = `<input class="vconj-input" value="${escapeHtml(current)}"
          onblur="saveConjCell('${word.replace(/'/g,"\\'")}','${field}',this.value)"
          onkeydown="if(event.key==='Enter')this.blur();if(event.key==='Escape'){renderVocabTable();}"
          autofocus style="width:90px">`;
        cell.querySelector('input').focus();
      }

      function saveConjCell(word, field, value) {
        ensureVocabInState();
        if (!state.vocab[word]) return;
        state.vocab[word][field] = value.trim() || null;
        saveState();
        renderVocabTable();
      }

      // ── Translation ───────────────────────────────────────────────────────────────
      async function translateVocabWord(word) {
        ensureVocabInState();
        const entry = state.vocab[word];
        if (!entry || entry.en) return;
        try {
          const { text: en } = await freeTranslate(word, 'no', 'en');
          entry.en = en;
          const exSrc = allQuestions().find(q => (q.a || '').toLowerCase().includes(word));
          if (exSrc) {
            const sentences = exSrc.a.split(/[.!?]+/).filter(s => s.toLowerCase().includes(word));
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
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Scanning…'; }
        ensureVocabInState();
        const words = scanAnswersForVocab();
        let added = 0;
        for (const w of words) {
          if (!state.vocab[w]) { await addVocabWord(w, 'answer'); added++; }
        }
        saveState();
        _scanRunning = false;
        if (btn) { btn.disabled = false; btn.textContent = '🔍 Scan My Answers'; }
        showToast(`✅ Added ${added} new word${added !== 1 ? 's' : ''} from your answers!`);
        renderVocab();
      }

      let _batchRunning = false;
      async function translateAllVocab() {
        if (_batchRunning) return;
        _batchRunning = true;
        ensureVocabInState();
        const untranslated = Object.keys(state.vocab).filter(w => !state.vocab[w].en);
        if (!untranslated.length) {
          showToast('✅ All words already translated!');
          _batchRunning = false;
          return;
        }
        const btn = document.getElementById('vocab-translate-all-btn');
        if (btn) btn.disabled = true;
        for (let i = 0; i < untranslated.length; i++) {
          await translateVocabWord(untranslated[i]);
          if (btn) btn.textContent = `⏳ ${i + 1}/${untranslated.length}…`;
          await new Promise(r => setTimeout(r, 260));
        }
        _batchRunning = false;
        if (btn) { btn.disabled = false; btn.textContent = '🌐 Translate All'; }
        showToast('✅ All words translated!');
        renderVocabTable();
      }

      // ── Filters ───────────────────────────────────────────────────────────────────
      let _vocabFilter = 'all';
      let _vocabSearch = '';

      function getFilteredVocab() {
        ensureVocabInState();
        return Object.entries(state.vocab)
          .filter(([w, e]) => {
            if (_vocabFilter !== 'all' && e.status !== _vocabFilter) return false;
            if (_vocabSearch && !w.includes(_vocabSearch) && !(e.en || '').toLowerCase().includes(_vocabSearch)) return false;
            return true;
          })
          .sort((a, b) => a[0].localeCompare(b[0]));
      }

      // ── Main render ───────────────────────────────────────────────────────────────
      function renderVocab() {
        const root = document.getElementById('vocab-page-root');
        if (!root) return;
        ensureVocabInState();
        const all      = Object.keys(state.vocab).length;
        const known    = Object.values(state.vocab).filter(e => e.status === 'known').length;
        const learning = Object.values(state.vocab).filter(e => e.status === 'learning').length;
        const newW     = Object.values(state.vocab).filter(e => e.status === 'new').length;
        const translated = Object.values(state.vocab).filter(e => e.en).length;

        root.innerHTML = `
          <h2 style="font-size:1.5rem;margin-bottom:6px">📖 Vocabulary</h2>
          <p style="font-size:0.86rem;color:#64748b;margin-bottom:18px">
            Unique words from your answers. Conjugation columns are auto-filled for known verbs —
            click any cell to edit. Audio plays Norwegian pronunciation.
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
            <button class="scan-btn" onclick="startVocabPractice()" style="background:#0891b2">🎤 Pronunciation Practice</button>
            <button class="scan-btn" onclick="startFlashcards()" style="background:#0f766e">🃏 Flashcard Quiz</button>
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
            ${['all','new','learning','known'].map(f =>
              `<span class="vocab-filter-chip${_vocabFilter===f?' active':''}"
                onclick="_vocabFilter='${f}';document.querySelectorAll('.vocab-filter-chip').forEach(c=>c.classList.remove('active'));this.classList.add('active');renderVocabTable()">
                ${{all:'All',new:'🆕 New',learning:'📚 Learning',known:'✅ Known'}[f]}
              </span>`
            ).join('')}
          </div>
          <div id="vocab-table-container"></div>
          <div id="vocab-fc-area" class="hidden"></div>
          <div id="vocab-prac-area" class="hidden"></div>`;

        renderVocabTable();
      }

      function renderVocabTable() {
        const container = document.getElementById('vocab-table-container');
        if (!container) return;
        const entries = getFilteredVocab();
        if (!entries.length) {
          container.innerHTML = `<div style="text-align:center;padding:44px;color:#94a3b8;font-size:0.9rem">
            ${Object.keys(state.vocab || {}).length === 0
              ? '📭 No vocabulary yet.<br>Click <strong>🔍 Scan My Answers</strong> to auto-import words, or add words manually above.'
              : '🔎 No words match your current filter.'}
          </div>`;
          return;
        }
        const sLabel = { new:'🆕 New', learning:'📚 Learning', known:'✅ Known' };
        const sCls   = { new:'vs-new', learning:'vs-learning', known:'vs-known' };

        container.innerHTML = `
          <div class="vocab-table-wrap">
            <table class="vocab-table">
              <thead><tr>
                <th>#</th>
                <th>🇳🇴 Word</th>
                <th>🔊</th>
                <th>Present tense</th>
                <th>Past tense</th>
                <th>Pres. participle</th>
                <th>Past participle</th>
                <th>🇬🇧 English</th>
                <th>📝 Example</th>
                <th>Status</th>
                <th></th>
              </tr></thead>
              <tbody>${entries.map(([word, e], i) => {
                const esc = word.replace(/'/g,"\\'");
                const conjCell = (field) => {
                  const cellId = 'vconj-' + field + '-' + word.replace(/[^a-z]/g,'_');
                  const val = e[field];
                  return `<td id="${cellId}" class="vconj-cell" onclick="editConjCell('${esc}','${field}')" title="Click to edit">${
                    val ? `<span class="vconj-val">${escapeHtml(val)}</span>` : `<span class="vconj-empty">+ add</span>`
                  }</td>`;
                };
                return `
                <tr>
                  <td style="color:#94a3b8;font-size:0.72rem">${i+1}</td>
                  <td><span class="vocab-no">${word}</span></td>
                  <td><button class="vocab-audio-btn" onclick="speakVocabWord('${esc}')" title="Hear pronunciation">🔊</button></td>
                  ${conjCell('present')}
                  ${conjCell('past')}
                  ${conjCell('ppres')}
                  ${conjCell('ppart')}
                  <td>${e.en
                    ? `<span class="vocab-en">${e.en}</span>`
                    : `<button class="btn btn-ghost" style="font-size:0.72rem;padding:3px 9px"
                        onclick="translateOneVocab('${esc}')">🌐 Translate</button>`}
                  </td>
                  <td class="vocab-ex">${e.example?.no ? `<em>${e.example.no}</em>${e.example.en?`<br><span style="color:#2563eb;font-style:normal">${e.example.en}</span>`:''}` : '<span style="color:#cbd5e1">—</span>'}</td>
                  <td><button class="vocab-status-btn ${sCls[e.status]}"
                      onclick="cycleVocabStatus('${esc}')">${sLabel[e.status]}</button></td>
                  <td><button class="vocab-del-btn" onclick="deleteVocabWord('${esc}')">🗑</button></td>
                </tr>`;
              }).join('')}
              </tbody>
            </table>
          </div>
          <div style="font-size:0.74rem;color:#94a3b8;margin-top:6px">
            ${entries.length} word${entries.length!==1?'s':''} shown.
            Click any conjugation cell to edit. Click <strong>Status</strong> to cycle: 🆕 New → 📚 Learning → ✅ Known.
          </div>`;
      }

      // ── Individual translate ───────────────────────────────────────────────────────
      async function translateOneVocab(word) {
        await translateVocabWord(word);
        renderVocabTable();
      }

      // ── Manual add ────────────────────────────────────────────────────────────────
      async function addVocabManual() {
        const wEl = document.getElementById('vocab-add-no');
        const eEl = document.getElementById('vocab-add-en');
        const xEl = document.getElementById('vocab-add-ex');
        const word = wEl?.value.trim().toLowerCase();
        if (!word) { showToast('⚠️ Enter a Norwegian word.'); return; }
        ensureVocabInState();
        if (state.vocab[word]) { showToast(`"${word}" already exists.`); return; }
        const conj = getAutoConjugation(word);
        state.vocab[word] = {
          en:      eEl?.value.trim() || null,
          example: xEl?.value.trim() ? { no: xEl.value.trim(), en: null } : null,
          source:  'manual',
          added:   new Date().toISOString().slice(0,10),
          status:  'new',
          present: conj?.present || null,
          past:    conj?.past    || null,
          ppres:   conj?.ppres   || null,
          ppart:   conj?.ppart   || null,
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

      // ── Export CSV ────────────────────────────────────────────────────────────────
      function exportVocab() {
        ensureVocabInState();
        const rows = [['Norwegian','Present','Past','Pres.Participle','Past Participle','English','Example (NO)','Example (EN)','Source','Status','Added']];
        Object.entries(state.vocab).forEach(([w, e]) => {
          rows.push([w, e.present||'', e.past||'', e.ppres||'', e.ppart||'', e.en||'', e.example?.no||'', e.example?.en||'', e.source, e.status, e.added]);
        });
        const csv = rows.map(r => r.map(c=>`"${(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'norsk-b1-vocabulary.csv'; a.click();
        URL.revokeObjectURL(url);
        showToast('⬇ CSV downloaded!');
      }

      // ═══════════════════════════════════════════════════════════════════════════════
      // ─── VOCABULARY PRONUNCIATION PRACTICE ───────────────────────────────────────
      // ═══════════════════════════════════════════════════════════════════════════════

      let _vpState = null; // { queue, idx, rec, mediaRec, stream, audioCtx, analyser, animFrame, transcript }

      function startVocabPractice() {
        ensureVocabInState();
        // Build queue from non-known words (prioritise ones with translations)
        const queue = Object.entries(state.vocab)
          .filter(([,e]) => e.status !== 'known')
          .map(([w]) => w)
          .sort(() => Math.random() - 0.5);
        if (!queue.length) {
          // Fall back to all words
          const all = Object.keys(state.vocab);
          if (!all.length) { showToast('📭 No vocabulary to practise yet!', 3000); return; }
          queue.push(...all.sort(() => Math.random() - 0.5));
        }
        // Hide table, show practice area
        const tbl = document.getElementById('vocab-table-container');
        if (tbl) tbl.classList.add('hidden');
        const fc = document.getElementById('vocab-fc-area');
        if (fc) fc.classList.add('hidden');
        const prac = document.getElementById('vocab-prac-area');
        if (prac) prac.classList.remove('hidden');

        _vpState = { queue, idx: 0, transcript: '' };
        renderVocabPractice();
      }

      function renderVocabPractice() {
        const prac = document.getElementById('vocab-prac-area');
        if (!prac || !_vpState) return;
        if (_vpState.idx >= _vpState.queue.length) {
          prac.innerHTML = `
            <div style="text-align:center;padding:48px 24px;background:#fff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
              <div style="font-size:3rem;margin-bottom:12px">🎉</div>
              <div style="font-family:'Fraunces',serif;font-size:1.4rem;font-weight:700;color:#1a2235;margin-bottom:8px">Round complete!</div>
              <div style="font-size:0.9rem;color:#64748b;margin-bottom:24px">You practised ${_vpState.queue.length} word${_vpState.queue.length!==1?'s':''}.</div>
              <button class="scan-btn" onclick="startVocabPractice()">🔁 New Round</button>
              <button class="scan-btn" onclick="exitVocabPractice()" style="background:#475569;margin-left:8px">⬅ Back to Table</button>
            </div>`;
          return;
        }
        const word = _vpState.queue[_vpState.idx];
        const entry = state.vocab[word] || {};
        prac.innerHTML = `
          <div class="vp-card">
            <div class="vp-progress">Word ${_vpState.idx+1} of ${_vpState.queue.length}</div>
            <div class="vp-word-display">
              <div class="vp-word">${word}</div>
              ${entry.en ? `<div class="vp-trans">${entry.en}</div>` : ''}
              ${(entry.present||entry.past) ? `
                <div class="vp-conj-row">
                  ${entry.present ? `<span class="vp-conj-chip">Pres: <strong>${entry.present}</strong></span>` : ''}
                  ${entry.past    ? `<span class="vp-conj-chip">Past: <strong>${entry.past}</strong></span>` : ''}
                  ${entry.ppres   ? `<span class="vp-conj-chip">Pres.Part: <strong>${entry.ppres}</strong></span>` : ''}
                  ${entry.ppart   ? `<span class="vp-conj-chip">Past Part: <strong>${entry.ppart}</strong></span>` : ''}
                </div>` : ''}
            </div>
            <div class="vp-controls">
              <button class="btn btn-ghost" onclick="speakVocabWord('${word.replace(/'/g,"\\'")}')">🔊 Hear Word</button>
              <button class="btn btn-green" id="vp-rec-btn" onclick="vpStartRecording()">⏺ Record</button>
              <button class="btn btn-danger hidden" id="vp-stop-btn" onclick="vpStopRecording()">⏹ Stop &amp; Score</button>
              <button class="btn btn-gray" onclick="vpSkip()">⏭ Skip</button>
              <button class="btn btn-gray" onclick="exitVocabPractice()">⬅ Exit</button>
            </div>
            <div class="vp-status" id="vp-status">Press ⏺ Record, then say the word in Norwegian</div>
            <div class="vp-interim" id="vp-interim"></div>
            <div class="vp-waveform hidden" id="vp-waveform">
              <canvas id="vp-canvas" height="50"></canvas>
            </div>
            <div id="vp-result"></div>
            <div class="vp-next hidden" id="vp-next">
              <button class="scan-btn" onclick="vpNext()">Next Word ›</button>
            </div>
          </div>`;
      }

      async function vpStartRecording() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(getMicConstraints());
        } catch (err) {
          document.getElementById('vp-status').textContent = '❌ Mic access denied. Please allow microphone.';
          return;
        }
        _vpState.transcript = '';
        _vpState.stream = stream;

        // MediaRecorder
        const mr = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
        });
        _vpState.mediaRec = mr;
        const chunks = [];
        mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          vpStopWaveform();
          vpShowResult(_vpState.transcript);
        };
        mr.start(100);

        // Waveform
        vpStartWaveform(stream);

        // SpeechRecognition
        if (SR) {
          const rec = new SR();
          rec.lang = 'nb-NO';
          rec.continuous = true;
          rec.interimResults = true;
          _vpState.rec = rec;
          rec.onresult = e => {
            let interim = '', final = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const t = e.results[i][0].transcript;
              if (e.results[i].isFinal) final += t + ' ';
              else interim += t;
            }
            _vpState.transcript += final;
            const el = document.getElementById('vp-interim');
            if (el) el.textContent = (_vpState.transcript + interim).trim() || '…listening';
          };
          rec.onerror = () => {};
          try { rec.start(); } catch(e) {}
        }

        const recBtn  = document.getElementById('vp-rec-btn');
        const stopBtn = document.getElementById('vp-stop-btn');
        if (recBtn) recBtn.classList.add('hidden');
        if (stopBtn) stopBtn.classList.remove('hidden');
        document.getElementById('vp-status').textContent = '🔴 Recording… say the word. Press Stop when done.';
        document.getElementById('vp-result').innerHTML = '';
        const nx = document.getElementById('vp-next');
        if (nx) nx.classList.add('hidden');
      }

      function vpStopRecording() {
        if (_vpState?.rec) { try { _vpState.rec.stop(); } catch(e){} }
        if (_vpState?.mediaRec && _vpState.mediaRec.state !== 'inactive') {
          _vpState.mediaRec.stop();
        }
        const recBtn  = document.getElementById('vp-rec-btn');
        const stopBtn = document.getElementById('vp-stop-btn');
        if (recBtn)  recBtn.classList.remove('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');
        document.getElementById('vp-status').textContent = '⏳ Scoring…';
      }

      function vpShowResult(spoken) {
        const word  = _vpState?.queue[_vpState.idx] || '';
        const score = spoken.trim()
          ? Math.round(wordSim(spoken.trim().toLowerCase(), word.toLowerCase()) * 100)
          : 0;

        const color = score >= 80 ? '#16a34a' : score >= 55 ? '#d97706' : '#dc2626';
        const msg   = score >= 80 ? '🎉 Excellent pronunciation!'
                    : score >= 55 ? '👍 Good — keep practising!'
                    : '💪 Keep going — you can do it!';

        const resultEl = document.getElementById('vp-result');
        if (resultEl) {
          resultEl.innerHTML = `
            <div class="vp-score-box">
              <div class="vp-score-num" style="color:${color}">${score}%</div>
              <div class="vp-score-bar-wrap">
                <div class="vp-score-bar"><div class="vp-score-fill" style="width:${score}%;background:${color}"></div></div>
                <div style="font-size:0.8rem;font-weight:600;color:${color};margin-top:4px">${msg}</div>
              </div>
            </div>
            ${spoken ? `<div class="vp-you-said">You said: <strong>${spoken.trim()}</strong></div>` : ''}`;
        }
        document.getElementById('vp-status').textContent = score >= 80 ? '✅ Great job!' : '🔁 Try again or move on';

        // Auto-update status if score high
        if (score >= 85 && state.vocab[word] && state.vocab[word].status === 'new') {
          state.vocab[word].status = 'learning';
          saveState();
        }

        const nx = document.getElementById('vp-next');
        if (nx) nx.classList.remove('hidden');
      }

      function vpSkip() {
        if (_vpState) { _vpState.idx++; renderVocabPractice(); }
      }

      function vpNext() {
        if (_vpState) { _vpState.idx++; renderVocabPractice(); }
      }

      function exitVocabPractice() {
        // Stop any active recording
        if (_vpState?.rec) { try { _vpState.rec.stop(); } catch(e){} }
        if (_vpState?.mediaRec) { try { _vpState.mediaRec.stop(); } catch(e){} }
        if (_vpState?.stream) { _vpState.stream.getTracks().forEach(t=>t.stop()); }
        vpStopWaveform();
        _vpState = null;
        const prac = document.getElementById('vocab-prac-area');
        if (prac) { prac.innerHTML = ''; prac.classList.add('hidden'); }
        const tbl = document.getElementById('vocab-table-container');
        if (tbl) tbl.classList.remove('hidden');
        renderVocabTable();
      }

      function vpStartWaveform(stream) {
        const wrap   = document.getElementById('vp-waveform');
        const canvas = document.getElementById('vp-canvas');
        if (!wrap || !canvas) return;
        wrap.classList.remove('hidden');
        canvas.width = wrap.offsetWidth || 340;
        const ctx      = canvas.getContext('2d');
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        _vpState.audioCtx  = audioCtx;
        _vpState.analyser  = analyser;
        const bufLen = analyser.frequencyBinCount;
        const dataArr = new Uint8Array(bufLen);
        function draw() {
          _vpState.animFrame = requestAnimationFrame(draw);
          analyser.getByteTimeDomainData(dataArr);
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.lineWidth = 2; ctx.strokeStyle = '#38bdf8'; ctx.beginPath();
          const sliceW = canvas.width / bufLen;
          let x = 0;
          for (let i = 0; i < bufLen; i++) {
            const v = dataArr[i] / 128;
            const y = (v * canvas.height) / 2;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            x += sliceW;
          }
          ctx.lineTo(canvas.width, canvas.height/2); ctx.stroke();
        }
        draw();
      }

      function vpStopWaveform() {
        if (!_vpState) return;
        if (_vpState.animFrame) cancelAnimationFrame(_vpState.animFrame);
        if (_vpState.audioCtx) { try { _vpState.audioCtx.close(); } catch(e){} }
        const wrap = document.getElementById('vp-waveform');
        if (wrap) wrap.classList.add('hidden');
      }

      // ═══════════════════════════════════════════════════════════════════════════════
      // ─── FLASHCARD QUIZ ───────────────────────────────────────────────────────────
      // ═══════════════════════════════════════════════════════════════════════════════

      let _fcQueue = [], _fcIdx = 0, _fcFlipped = false;

      function startFlashcards() {
        ensureVocabInState();
        _fcQueue = Object.entries(state.vocab)
          .filter(([,e]) => e.en && e.status !== 'known')
          .map(([w]) => w)
          .sort(() => Math.random() - 0.5);
        if (!_fcQueue.length) { showToast('🎉 All known or none translated yet!', 3000); return; }
        _fcIdx = 0; _fcFlipped = false;
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
        const word  = _fcQueue[_fcIdx];
        const entry = state.vocab[word] || {};
        _fcFlipped  = false;
        fc.innerHTML = `
          <div class="fc-progress">Card ${_fcIdx+1} of ${_fcQueue.length}</div>
          <div class="flashcard-wrap">
            <div class="flashcard" id="fc-card" onclick="flipFlashcard()">
              <div class="flashcard-face flashcard-front">
                <div class="flashcard-word">${word}</div>
                <div class="flashcard-hint">🇳🇴 Norwegian · tap to reveal English →</div>
              </div>
              <div class="flashcard-face flashcard-back">
                <div class="flashcard-trans">${entry.en||'?'}</div>
                ${entry.example?.no ? `<div class="flashcard-ex"><em>"${entry.example.no}"</em>${entry.example.en?`<br><span style="opacity:0.8">→ "${entry.example.en}"</span>`:''}</div>` : ''}
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
        if (newStatus && state.vocab[word]) { state.vocab[word].status = newStatus; saveState(); }
        _fcIdx++;
        renderFlashcard();
      }

      function exitFlashcards() {
        const tbl = document.getElementById('vocab-table-container');
        if (tbl) tbl.classList.remove('hidden');
        const fc = document.getElementById('vocab-fc-area');
        if (fc) { fc.innerHTML = ''; fc.classList.add('hidden'); }
        renderVocabTable();
      }

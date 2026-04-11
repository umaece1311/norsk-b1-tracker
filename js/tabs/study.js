      // ═══════════════════════════════════════════════════════════════════════════════
      // ─── STUDY MODE — Sentence Bank only ──────────────────────────────────────────
      // ═══════════════════════════════════════════════════════════════════════════════

      // ── Main render ───────────────────────────────────────────────────────────────
      function renderStudy() {
        const root = document.getElementById('study-page-root');
        if (!root) return;
        root.innerHTML = '<div id="sb-root"></div>';
        renderSentenceBank();
      }

      // ══════════════════════════════════════════════════════════════════════════════
      // ── SENTENCE BANK ─────────────────────────────────────────────────────────────
      // Browse + practice 200 standalone B1+ Norwegian sentences.
      // ══════════════════════════════════════════════════════════════════════════════

      let _sbIdx    = 0;
      let _sbCat    = 'all';
      let _sbRec    = {};   // recording state for sentence bank

      function _sbQueue() {
        if (typeof SENTENCES_B1 === 'undefined') return [];
        if (_sbCat === 'all') return SENTENCES_B1;
        return SENTENCES_B1.filter(s => s.cat === _sbCat);
      }

      function setSbCat(cat) {
        _sbCat = cat;
        _sbIdx = 0;
        renderSentenceBank();
      }

      function sbPrev() { if (_sbIdx > 0)                    { _sbIdx--; renderSentenceBank(); } }
      function sbNext() { if (_sbIdx < _sbQueue().length - 1) { _sbIdx++; renderSentenceBank(); } }

      function renderSentenceBank() {
        const root = document.getElementById('sb-root');
        if (!root) return;

        const queue = _sbQueue();
        if (!queue.length) {
          root.innerHTML = `<p style="text-align:center;color:#94a3b8;padding:40px">No sentences found.</p>`;
          return;
        }
        if (_sbIdx >= queue.length) _sbIdx = queue.length - 1;

        const sent = queue[_sbIdx];

        const catBtns = [{ id: 'all', label: 'All', emoji: '🌐' }, ...CATS].map(c => {
          const id    = c.id || 'all';
          const label = c.label || 'All';
          const emoji = c.emoji || '🌐';
          const count = id === 'all'
            ? (typeof SENTENCES_B1 !== 'undefined' ? SENTENCES_B1.length : 0)
            : (typeof SENTENCES_B1 !== 'undefined' ? SENTENCES_B1.filter(s => s.cat === id).length : 0);
          return `<button class="filter-chip${_sbCat===id?' active':''}" onclick="setSbCat('${id}')">${emoji} ${label} <span style="font-size:0.7em;opacity:0.7">${count}</span></button>`;
        }).join('');

        root.innerHTML = `
          <div class="sb-nav-row">
            <button class="btn btn-gray" onclick="sbPrev()" ${_sbIdx===0?'disabled':''}>‹ Prev</button>
            <span class="study-counter">${_sbIdx+1} / ${queue.length}</span>
            <button class="btn btn-gray" onclick="sbNext()" ${_sbIdx===queue.length-1?'disabled':''}>Next ›</button>
          </div>

          <div class="sb-cat-row">${catBtns}</div>

          <div class="card">
            <!-- Header: badge + question -->
            <div class="card-header">
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
                  <span class="cat-badge ${catClass(sent.cat)}">${catLabel(sent.cat)}</span>
                  <span class="q-num">#${_sbIdx+1}</span>
                  <span class="sb-qen-badge">${sent.qEn}</span>
                </div>
                <div class="q-text">${sent.q}</div>
              </div>
            </div>

            <!-- Spoken answer area (mirrors textarea) -->
            <div class="sb-spoken-area" id="sb-spoken-${sent.id}">
              <span class="sb-spoken-placeholder">Press 🎤 Record Answer — speak in Norwegian…</span>
            </div>

            <!-- Sample answer (collapsible, always available) -->
            <div class="pdf-answer-box">
              <div class="pdf-answer-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <span>📖</span> <span>Sample Answer</span> <span style="margin-left:auto;font-size:1rem">▼</span>
              </div>
              <div class="pdf-answer-content hidden">
                <div style="margin-bottom:6px">${sent.no}</div>
                <div style="font-size:0.82rem;color:#2563eb;font-style:italic">${sent.en}</div>
                <button class="btn btn-ghost" style="font-size:0.76rem;margin-top:8px" onclick="sbSpeak(${sent.id})">🔊 Hear Sample Answer</button>
              </div>
            </div>

            <!-- Action row -->
            <div class="action-row">
              <button class="btn btn-ghost"  onclick="sbSpeakQuestion(${sent.id})">🔊 Question</button>
              <button class="btn btn-green"  id="sb-rec-${sent.id}"  onclick="sbRecord(${sent.id})">🎤 Record Answer</button>
              <button class="btn btn-danger hidden" id="sb-stop-${sent.id}" onclick="sbStop(${sent.id})">⏹ Stop</button>
            </div>

            <div class="st-prac-status" id="sb-status-${sent.id}"></div>
            <div id="sb-result-${sent.id}"></div>
          </div>`;
      }

      function _sbSpeakText(text) {
        window.speechSynthesis.cancel();
        const utt      = new SpeechSynthesisUtterance(text);
        utt.lang       = 'nb-NO';
        utt.rate       = 0.8;
        const voices   = window.speechSynthesis.getVoices();
        const norVoice = voices.find(v => v.lang.startsWith('nb') || v.lang.startsWith('no'));
        if (norVoice) utt.voice = norVoice;
        window.speechSynthesis.speak(utt);
      }

      function sbSpeak(id) {
        const s = (typeof SENTENCES_B1 !== 'undefined') ? SENTENCES_B1.find(s => s.id === id) : null;
        if (s) _sbSpeakText(s.no);
      }

      function sbSpeakQuestion(id) {
        const s = (typeof SENTENCES_B1 !== 'undefined') ? SENTENCES_B1.find(s => s.id === id) : null;
        if (s) _sbSpeakText(s.q);
      }

      async function sbRecord(id) {
        const s = (typeof SENTENCES_B1 !== 'undefined') ? SENTENCES_B1.find(s => s.id === id) : null;
        if (!s) return;

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(getMicConstraints());
        } catch (e) {
          const st = document.getElementById('sb-status-' + id);
          if (st) st.textContent = '❌ Mic denied. Please allow microphone.';
          return;
        }

        _sbRec[id] = { transcript: '', stream, totalConf: 0, confCount: 0 };

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

        const mr          = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
        });
        _sbRec[id].mediaRec  = mr;
        mr.ondataavailable   = () => {};
        mr.onstop            = () => {
          stream.getTracks().forEach(t => t.stop());
          if (!SR) sbShowResult(id, '');
        };
        mr.start();

        if (SR) {
          const rec          = new SR();
          rec.lang           = 'nb-NO';
          rec.continuous     = true;
          rec.interimResults = true;
          _sbRec[id].rec     = rec;

          rec.onresult = e => {
            let final = '', interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const res = e.results[i];
              const t   = res[0].transcript;
              if (res.isFinal) {
                final += t + ' ';
                const c = res[0].confidence;
                if (c > 0) { _sbRec[id].totalConf += c; _sbRec[id].confCount++; }
              } else {
                interim += t;
              }
            }
            _sbRec[id].transcript += final;
            // Show live text in the spoken area (like a textarea)
            const spoken = document.getElementById('sb-spoken-' + id);
            if (spoken) spoken.textContent = (_sbRec[id].transcript + interim).trim() || '…listening';

            if (final.trim()) {
              clearTimeout(_sbRec[id].autoStop);
              setTimeout(() => sbStop(id), 300);
            }
          };
          rec.onend = () => {
            clearTimeout(_sbRec[id]?.autoStop);
            if (_sbRec[id]?.mediaRec?.state !== 'inactive') {
              try { _sbRec[id].mediaRec.stop(); } catch (e) {}
            }
            sbShowResult(id, _sbRec[id]?.transcript || '');
          };
          rec.onerror = () => {};
          try { rec.start(); } catch (e) {}
        }

        _sbRec[id].autoStop = setTimeout(() => sbStop(id), 10000);

        const recBtn  = document.getElementById('sb-rec-'  + id);
        const stopBtn = document.getElementById('sb-stop-' + id);
        if (recBtn) recBtn.classList.add('hidden');
        if (stopBtn) {
          stopBtn.classList.remove('hidden');
          stopBtn.disabled    = true;
          stopBtn.textContent = '⏹ Stop (2s…)';
          setTimeout(() => { stopBtn.disabled = false; stopBtn.textContent = '⏹ Stop & Score'; }, 2000);
        }
        // Show recording state in spoken area
        const spoken = document.getElementById('sb-spoken-' + id);
        if (spoken) { spoken.textContent = ''; spoken.classList.add('recording'); }
        const st = document.getElementById('sb-status-' + id);
        if (st) st.textContent = '🔴 Recording…';
        const r = document.getElementById('sb-result-' + id);
        if (r) r.innerHTML = '';
      }

      function sbStop(id) {
        const p = _sbRec[id];
        if (!p) return;
        clearTimeout(p.autoStop);
        if (p.mediaRec && p.mediaRec.state !== 'inactive') {
          try { p.mediaRec.stop(); } catch (e) {}
        }
        setTimeout(() => {
          if (p.rec) { try { p.rec.stop(); } catch (e) {} }
        }, 300);
        const st = document.getElementById('sb-status-' + id);
        if (st) st.textContent = '⏳ Processing…';
        const recBtn  = document.getElementById('sb-rec-'  + id);
        const stopBtn = document.getElementById('sb-stop-' + id);
        if (recBtn)  recBtn.classList.remove('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');
        const spoken = document.getElementById('sb-spoken-' + id);
        if (spoken) spoken.classList.remove('recording');
      }

      // ── Norwegian grammar heuristic checker ─────────────────────────────────────
      function _checkNorGrammar(text) {
        const clean = w => w.replace(/[.,!?;:«»""'']/g, '').toLowerCase().trim();
        const words = text.split(/\s+/).filter(Boolean).map(clean).filter(Boolean);
        const tips  = [];
        let score   = 100;

        if (!words.length) return { score: 0, tips: ['No speech detected'] };
        if (words.length === 1) return { score: 45, tips: ['Try a full sentence — subject + verb + more'] };

        // Subject: Norwegian pronouns
        const pronouns = ['jeg', 'du', 'han', 'hun', 'det', 'den', 'vi', 'dere', 'de', 'man'];
        const hasSubj  = words.some(w => pronouns.includes(w));

        // Verb: common verbs + -er/-te/-de endings (present/past)
        const fixedV   = ['er','var','har','kan','vil','skal','må','bor','vet','ser','går',
                          'kom','sier','gjør','får','tar','drar','liker','jobber','heter',
                          'hører','snakker','spiser','drikker','elsker','trenger','kjenner'];
        const verbEnds = ['er','te','de','ste','dde'];
        const hasVerb  = words.some(w =>
          fixedV.includes(w) || verbEnds.some(e => w.endsWith(e) && w.length > e.length + 1)
        );

        if (!hasSubj)            { score -= 20; tips.push('Add a subject — jeg, du, vi, han, hun…'); }
        if (!hasVerb)            { score -= 20; tips.push('Include a verb — er, har, kan, jobber…'); }
        if (words.length < 3)    { score -= 15; tips.push('Use a fuller sentence for better practice'); }
        if (tips.length === 0)     tips.push('Good sentence structure!');

        return { score: Math.max(0, score), tips };
      }

      function sbShowResult(id, spoken) {
        const sp  = spoken.trim();
        const rec = _sbRec[id] || {};

        // Pronunciation: SpeechRecognition confidence (0–1 → 0–100)
        const avgConf  = rec.confCount > 0 ? rec.totalConf / rec.confCount : 0;
        const pronScore = avgConf > 0 ? Math.round(avgConf * 100) : null;

        // Grammar: heuristic Norwegian analysis
        const gram = _checkNorGrammar(sp);

        const resultEl = document.getElementById('sb-result-' + id);
        if (!resultEl) return;

        if (!sp) {
          resultEl.innerHTML = `<div style="color:#9ca3af;font-size:0.85rem;padding:8px 0">No speech detected — try again.</div>`;
          return;
        }

        const pColor = pronScore === null ? '#6b7280'
          : pronScore >= 80 ? '#16a34a' : pronScore >= 55 ? '#d97706' : '#dc2626';
        const gColor = gram.score >= 80 ? '#16a34a' : gram.score >= 55 ? '#d97706' : '#dc2626';

        resultEl.innerHTML = `
          <div class="sb-score-block">
            ${pronScore !== null ? `
            <div class="sb-dual-row">
              <span class="sb-dual-label">🎤 Pronunciation</span>
              <div class="sb-dual-bar">
                <div class="st-score-bar"><div class="st-score-fill" style="width:${pronScore}%;background:${pColor}"></div></div>
              </div>
              <span class="sb-dual-pct" style="color:${pColor}">${pronScore}%</span>
            </div>` : ''}
            <div class="sb-dual-row">
              <span class="sb-dual-label">📝 Grammar</span>
              <div class="sb-dual-bar">
                <div class="st-score-bar"><div class="st-score-fill" style="width:${gram.score}%;background:${gColor}"></div></div>
              </div>
              <span class="sb-dual-pct" style="color:${gColor}">${gram.score}%</span>
            </div>
            ${gram.tips.map(t => `<div class="sb-gram-tip">💡 ${t}</div>`).join('')}
          </div>
          <div class="action-row" style="margin-top:10px">
            <button class="btn btn-ghost"  onclick="sbSpeak(${id})">🔊 Sample Answer</button>
            <button class="btn btn-green"  onclick="sbRecord(${id})">🔁 Try Again</button>
            <button class="btn btn-indigo" onclick="sbNext()">Next →</button>
          </div>`;

        const st = document.getElementById('sb-status-' + id);
        if (st) st.textContent =
          gram.score >= 80 && (pronScore === null || pronScore >= 70)
            ? '✅ Great response!'
            : '💡 See feedback below';
      }

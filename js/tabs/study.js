      // ═══════════════════════════════════════════════════════════════════════════════
      // ─── STUDY MODE ───────────────────────────────────────────────────────────────
      // One question at a time: Norwegian Q + EN translation, Norwegian A + EN
      // translation, audio playback, and inline pronunciation practice.
      // ═══════════════════════════════════════════════════════════════════════════════

      let _studyIdx    = 0;
      let _studyQueue  = [];
      let _studyFilter = 'all';
      let _studyTrans  = {};   // { qId: { qEn, aEn } }
      let _studyRec    = {};   // per (qId+field) recording state
      let _studyMode   = 'qa'; // 'qa' | 'bank'

      // ── Build filtered queue ───────────────────────────────────────────────────────
      function _buildStudyQueue() {
        const all = allQuestions().filter(q => q.a); // only questions with sample answers
        if (_studyFilter === 'all') return all;
        return all.filter(q => (state.status[q.id] || 'new') === _studyFilter);
      }

      function setStudyFilter(f) {
        _studyFilter = f;
        _studyIdx    = 0;
        _studyQueue  = _buildStudyQueue();
        renderStudy();
      }

      function studyPrev() { if (_studyIdx > 0)                      { _studyIdx--; renderStudy(); } }
      function studyNext() { if (_studyIdx < _studyQueue.length - 1) { _studyIdx++; renderStudy(); } }

      // ── Main render ───────────────────────────────────────────────────────────────
      function renderStudy() {
        const root = document.getElementById('study-page-root');
        if (!root) return;

        // Mode toggle bar (always shown)
        const modeBar = `
          <div class="study-mode-bar">
            <button class="study-mode-btn${_studyMode==='qa'?' active':''}"
              onclick="window.speechSynthesis.cancel();_studyMode='qa';renderStudy()">📖 Q&amp;A Practice</button>
            <button class="study-mode-btn${_studyMode==='bank'?' active':''}"
              onclick="window.speechSynthesis.cancel();_studyMode='bank';_sbIdx=0;renderStudy()">📜 Sentence Bank (${(typeof SENTENCES_B1!=='undefined'?SENTENCES_B1.length:0)})</button>
          </div>`;

        if (_studyMode === 'bank') {
          root.innerHTML = modeBar + '<div id="sb-root"></div>';
          renderSentenceBank();
          return;
        }

        _studyQueue = _buildStudyQueue();

        if (!_studyQueue.length) {
          root.innerHTML = modeBar + `
            <div style="text-align:center;padding:60px 24px;background:#fff;border-radius:16px">
              <div style="font-size:2.5rem;margin-bottom:12px">📭</div>
              <div style="font-family:'Fraunces',serif;font-size:1.1rem;color:#374151;margin-bottom:8px">No questions to study</div>
              <p style="font-size:0.88rem;color:#94a3b8">All questions with sample answers will appear here.</p>
            </div>`;
          return;
        }

        if (_studyIdx >= _studyQueue.length) _studyIdx = _studyQueue.length - 1;

        const q      = _studyQueue[_studyIdx];
        const status = state.status[q.id] || 'new';
        const cached = _studyTrans[q.id]  || {};
        const qEn    = cached.qEn;
        const aEn    = cached.aEn;

        const filterBtns = ['all','new','learning','done'].map(f => {
          const label = {all:'All', new:'🆕 New', learning:'📖 Learning', done:'✅ Done'}[f];
          return `<button class="filter-chip${_studyFilter===f?' active':''}" onclick="setStudyFilter('${f}')">${label}</button>`;
        }).join('');

        root.innerHTML = modeBar + `
          <div class="study-header">
            <div class="study-nav">
              <button class="btn btn-gray" onclick="studyPrev()" ${_studyIdx===0?'disabled':''}>‹ Prev</button>
              <span class="study-counter">${_studyIdx+1} / ${_studyQueue.length}</span>
              <button class="btn btn-gray" onclick="studyNext()" ${_studyIdx===_studyQueue.length-1?'disabled':''}>Next ›</button>
            </div>
            <div class="study-filter-row">${filterBtns}</div>
          </div>

          <div class="study-card">
            <div class="study-card-meta">
              <span class="cat-badge ${catClass(q.cat)}">${catLabel(q.cat)}</span>
              ${q.examType?`<span class="exam-badge badge-${q.examType}">Type ${q.examType}</span>`:''}
              <span class="q-num">#${q.id}</span>
            </div>

            <!-- ── QUESTION ── -->
            <div class="study-section study-q-section">
              <div class="study-section-label">🇳🇴 Question</div>
              <div class="study-no-text" id="study-qno-${q.id}">${q.q}</div>
              <div class="study-en-block" id="study-qen-${q.id}">
                ${qEn
                  ? `<div class="study-section-label" style="margin-top:10px">🇬🇧 Translation</div><div class="study-en-text">${qEn}</div>`
                  : `<button class="study-translate-btn" onclick="studyTranslate(${q.id},'q')">🌐 Translate Question</button>`}
              </div>
              <div class="study-action-row">
                <button class="btn btn-ghost" onclick="studySpeak(${q.id},'q')">🔊 Hear Question</button>
                <button class="btn btn-green" onclick="studyStartPractice(${q.id},'q')">🎤 Practice Q</button>
              </div>
              <div id="st-prac-${q.id}-q" class="st-prac-area hidden"></div>
            </div>

            <!-- ── SAMPLE ANSWER ── -->
            <div class="study-section study-a-section">
              <div class="study-section-label">📖 Sample Answer (Norwegian)</div>
              <div class="study-no-text" id="study-ano-${q.id}">${q.a}</div>
              <div class="study-en-block" id="study-aen-${q.id}">
                ${aEn
                  ? `<div class="study-section-label" style="margin-top:10px">🇬🇧 Translation</div><div class="study-en-text">${aEn}</div>`
                  : `<button class="study-translate-btn" onclick="studyTranslate(${q.id},'a')">🌐 Translate Answer</button>`}
              </div>
              <div class="study-action-row">
                <button class="btn btn-ghost" onclick="studySpeak(${q.id},'a')">🔊 Hear Answer</button>
                <button class="btn btn-green" onclick="studyStartPractice(${q.id},'a')">🎤 Practice Answer</button>
                <button class="btn btn-indigo" onclick="startSentencePractice(${q.id})">📝 Sentence Mode</button>
              </div>
              <div id="st-prac-${q.id}-a" class="st-prac-area hidden"></div>
            </div>

            <!-- ── SENTENCE PRACTICE ── -->
            <div id="st-sent-${q.id}" class="st-sent-panel hidden"></div>

            <!-- ── STATUS ── -->
            <div class="status-row" style="margin-top:14px;padding-top:14px;border-top:1px solid #f1f5f9">
              <span style="font-size:0.8rem;color:#888;align-self:center">Status:</span>
              <button class="status-btn ${status==='new'?'active-new':''}"
                onclick="setStatus(${q.id},'new');renderStudy()">🆕 New</button>
              <button class="status-btn ${status==='learning'?'active-learning':''}"
                onclick="setStatus(${q.id},'learning');renderStudy()">📖 Learning</button>
              <button class="status-btn ${status==='done'?'active-done':''}"
                onclick="setStatus(${q.id},'done');renderStudy()">✅ Done</button>
            </div>
          </div>`;
      }

      // ── TTS audio ─────────────────────────────────────────────────────────────────
      function studySpeak(qId, field) {
        const q = allQuestions().find(q => q.id === qId);
        if (!q) return;
        const text = field === 'q' ? q.q : (q.a || '');
        if (!text) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = 'nb-NO';
        utt.rate = 0.82;
        const voices = window.speechSynthesis.getVoices();
        const norVoice = voices.find(v => v.lang.startsWith('nb') || v.lang.startsWith('no'));
        if (norVoice) utt.voice = norVoice;
        window.speechSynthesis.speak(utt);
      }

      // ── Translation ───────────────────────────────────────────────────────────────
      async function studyTranslate(qId, field) {
        const q = allQuestions().find(q => q.id === qId);
        if (!q) return;
        const text     = field === 'q' ? q.q : (q.a || '');
        const blockId  = 'study-' + (field==='q'?'qen':'aen') + '-' + qId;
        const block    = document.getElementById(blockId);
        if (block) block.innerHTML = `<span style="color:#94a3b8;font-size:0.82rem">🌐 Translating…</span>`;

        try {
          const { text: en } = await freeTranslate(text, 'no', 'en');
          if (!_studyTrans[qId]) _studyTrans[qId] = {};
          if (field === 'q') _studyTrans[qId].qEn = en;
          else               _studyTrans[qId].aEn = en;
          if (block) {
            block.innerHTML = `<div class="study-section-label" style="margin-top:10px">🇬🇧 Translation</div>
              <div class="study-en-text">${en}</div>`;
          }
        } catch (e) {
          if (block) block.innerHTML = `<span style="color:#dc2626;font-size:0.82rem">Translation failed — check connection.</span>`;
        }
      }

      async function studyTranslateAll() {
        const q = _studyQueue[_studyIdx];
        if (!q) return;
        await studyTranslate(q.id, 'q');
        await studyTranslate(q.id, 'a');
      }

      // ── Pronunciation practice (inline, auto-stop) ────────────────────────────────
      function studyStartPractice(qId, field) {
        const areaId = 'st-prac-' + qId + '-' + field;
        const area   = document.getElementById(areaId);
        if (!area) return;

        // Toggle off if already showing
        if (!area.classList.contains('hidden')) {
          area.classList.add('hidden');
          _studyStopRec(qId, field);
          return;
        }

        area.classList.remove('hidden');
        const q       = allQuestions().find(q => q.id === qId);
        const refText = field === 'q' ? q.q : (q.a || '');

        area.innerHTML = `
          <div class="st-prac-box">
            <div class="st-prac-ref">
              <span style="font-size:0.72rem;color:#6b7280;font-weight:600">REFERENCE:</span>
              <span class="st-prac-ref-text">${refText}</span>
            </div>
            <div class="st-prac-controls">
              <button class="btn btn-green" id="st-rec-${qId}-${field}"
                onclick="studyRecord(${qId},'${field}')">⏺ Record</button>
              <button class="btn btn-danger hidden" id="st-stop-${qId}-${field}"
                onclick="studyStop(${qId},'${field}')">⏹ Stop</button>
              <button class="btn btn-ghost" onclick="studySpeak(${qId},'${field}')">🔊 Hear reference</button>
            </div>
            <div class="st-prac-status" id="st-status-${qId}-${field}">Press ⏺ to record, then speak in Norwegian</div>
            <div class="st-interim"      id="st-interim-${qId}-${field}"></div>
            <div id="st-result-${qId}-${field}"></div>
          </div>`;
      }

      async function studyRecord(qId, field) {
        const key = qId + '-' + field;
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(getMicConstraints());
        } catch (e) {
          const s = document.getElementById('st-status-' + qId + '-' + field);
          if (s) s.textContent = '❌ Mic denied. Please allow microphone.';
          return;
        }

        _studyRec[key] = { transcript: '', stream };

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

        // ── MediaRecorder ───────────────────────────────────────────────────────
        const mr = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
        });
        _studyRec[key].mediaRec = mr;
        mr.ondataavailable = () => {};
        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          if (!SR) _studyShowResult(qId, field, '');
        };
        mr.start();

        // ── SpeechRecognition ───────────────────────────────────────────────────
        if (SR) {
          const rec = new SR();
          rec.lang            = 'nb-NO';
          rec.continuous      = true;
          rec.interimResults  = true;
          _studyRec[key].rec  = rec;

          rec.onresult = e => {
            let final = '', interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const t = e.results[i][0].transcript;
              if (e.results[i].isFinal) final += t + ' '; else interim += t;
            }
            _studyRec[key].transcript += final;
            const el = document.getElementById('st-interim-' + qId + '-' + field);
            if (el) el.textContent = (_studyRec[key].transcript + interim).trim() || '…listening';
          };
          rec.onend = () => {
            clearTimeout(_studyRec[key]?.autoStop);
            if (_studyRec[key]?.mediaRec?.state !== 'inactive') {
              try { _studyRec[key].mediaRec.stop(); } catch(e) {}
            }
            _studyShowResult(qId, field, _studyRec[key]?.transcript || '');
          };
          rec.onerror = () => {};
          try { rec.start(); } catch(e) {}
        }

        // Auto-stop after 15s for answers (longer than words)
        _studyRec[key].autoStop = setTimeout(() => studyStop(qId, field), 15000);

        // Update UI
        const recBtn  = document.getElementById('st-rec-'  + qId + '-' + field);
        const stopBtn = document.getElementById('st-stop-' + qId + '-' + field);
        if (recBtn)  recBtn.classList.add('hidden');
        if (stopBtn) {
          stopBtn.classList.remove('hidden');
          stopBtn.disabled = true;
          stopBtn.textContent = '⏹ Stop (2s…)';
          setTimeout(() => { stopBtn.disabled = false; stopBtn.textContent = '⏹ Stop & Score'; }, 2000);
        }
        const s = document.getElementById('st-status-' + qId + '-' + field);
        if (s) s.textContent = '🔴 Recording… speak in Norwegian. Press Stop when done.';
        const r = document.getElementById('st-result-' + qId + '-' + field);
        if (r) r.innerHTML = '';
      }

      function studyStop(qId, field) {
        _studyStopRec(qId, field);
        const s = document.getElementById('st-status-' + qId + '-' + field);
        if (s) s.textContent = '⏳ Processing… (capturing last words)';
        const recBtn  = document.getElementById('st-rec-'  + qId + '-' + field);
        const stopBtn = document.getElementById('st-stop-' + qId + '-' + field);
        if (recBtn)  recBtn.classList.remove('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');
      }

      function _studyStopRec(qId, field) {
        const key = qId + '-' + field;
        const p   = _studyRec[key];
        if (!p) return;
        clearTimeout(p.autoStop);
        // Stop media recorder first, then recognition 300ms later (flush buffer)
        if (p.mediaRec && p.mediaRec.state !== 'inactive') {
          try { p.mediaRec.stop(); } catch(e) {}
        }
        setTimeout(() => {
          if (p.rec) { try { p.rec.stop(); } catch(e) {} }
        }, 300);
      }

      function _studyShowResult(qId, field, spoken) {
        const q   = allQuestions().find(q => q.id === qId);
        if (!q) return;
        const ref   = (field === 'q' ? q.q : (q.a || '')).toLowerCase();
        const sp    = spoken.trim().toLowerCase();

        // Word-level scoring (reuse wordSim from pronunciation.js)
        const clean     = w => w.replace(/[.,!?;:«»""'']/g, '').trim();
        const refWords  = ref.split(/\s+/).filter(Boolean).map(clean).filter(Boolean);
        const spWords   = sp.split(/\s+/).filter(Boolean).map(clean).filter(Boolean);

        const matched = new Set();
        spWords.forEach(sw => {
          const idx = refWords.findIndex((rw, ri) => !matched.has(ri) && wordSim(sw, rw) >= 0.75);
          if (idx >= 0) matched.add(idx);
        });

        const score = refWords.length > 0
          ? Math.round((matched.size / refWords.length) * 100) : 0;
        const color = score >= 80 ? '#16a34a' : score >= 55 ? '#d97706' : '#dc2626';
        const msg   = score >= 80 ? '🎉 Excellent!' : score >= 55 ? '👍 Good — keep practising!' : '💪 Keep going!';

        const missed = refWords.filter((_, i) => !matched.has(i));

        const resultEl = document.getElementById('st-result-' + qId + '-' + field);
        if (resultEl) {
          resultEl.innerHTML = `
            <div class="st-score-row">
              <div class="st-score-num" style="color:${color}">${score}%</div>
              <div class="st-score-bar-wrap">
                <div class="st-score-bar"><div class="st-score-fill" style="width:${score}%;background:${color}"></div></div>
                <div style="font-size:0.78rem;font-weight:600;color:${color};margin-top:3px">${msg}</div>
                <div style="font-size:0.72rem;color:#888">${matched.size} of ${refWords.length} words recognised</div>
              </div>
            </div>
            ${sp ? `<div class="st-you-said">You said: <em>"${sp}"</em></div>` : ''}
            ${missed.length ? `<div class="st-missed">Missed: <strong>${missed.join(', ')}</strong></div>` : ''}`;
        }

        const s = document.getElementById('st-status-' + qId + '-' + field);
        if (s) s.textContent = score >= 80 ? '✅ Great pronunciation!' : '🔁 Try again for a better score';
      }

      // ══════════════════════════════════════════════════════════════════════════════
      // ── SENTENCE PRACTICE MODE ────────────────────────────────────────────────────
      // Splits the sample answer into individual sentences. User listens then repeats.
      // ══════════════════════════════════════════════════════════════════════════════

      let _sentPrac = {}; // { qId: { sentences, idx, transcript, mediaRec, rec, autoStop, stream } }

      function _splitSentences(text) {
        // Split on period/!/? followed by space or end-of-string; keep non-trivial parts
        return text
          .split(/(?<=[.!?])\s+|(?<=[.!?])$/)
          .map(s => s.trim())
          .filter(s => s.length > 2);
      }

      function startSentencePractice(qId) {
        const panel = document.getElementById('st-sent-' + qId);
        if (!panel) return;

        // Toggle off if already showing
        if (!panel.classList.contains('hidden')) {
          panel.classList.add('hidden');
          _sentStopCleanup(qId);
          return;
        }

        const q = allQuestions().find(q => q.id === qId);
        if (!q || !q.a) return;

        const sentences = _splitSentences(q.a);
        if (!sentences.length) return;

        _sentPrac[qId] = { sentences, idx: 0 };
        panel.classList.remove('hidden');
        _renderSentPanel(qId);

      }

      function _renderSentPanel(qId) {
        const p = _sentPrac[qId];
        if (!p) return;
        const panel = document.getElementById('st-sent-' + qId);
        if (!panel) return;

        const { sentences, idx } = p;
        const sent   = sentences[idx];
        const isLast = idx === sentences.length - 1;
        const pct    = Math.round(((idx + 1) / sentences.length) * 100);

        panel.innerHTML = `
          <div class="sent-prac-box">
            <!-- Progress bar -->
            <div class="sent-prac-header">
              <span class="sent-prac-progress">Sentence ${idx + 1} of ${sentences.length}</span>
              <div class="sent-prac-prog-bar">
                <div class="sent-prac-prog-fill" style="width:${pct}%"></div>
              </div>
            </div>

            <!-- Sentence (like q-text) -->
            <div class="q-text" style="margin-bottom:12px">${sent}</div>

            <!-- Spoken area (like textarea) -->
            <div class="sb-spoken-area" id="sent-spoken-${qId}">
              <span class="sb-spoken-placeholder">Press 🎤 Record — say this sentence in Norwegian…</span>
            </div>

            <!-- Action row (matches card) -->
            <div class="action-row">
              <button class="btn btn-ghost"  onclick="sentSpeak(${qId})">🔊 Hear</button>
              <button class="btn btn-green"  id="sent-rec-${qId}"  onclick="sentRecord(${qId})">🎤 Record</button>
              <button class="btn btn-danger hidden" id="sent-stop-${qId}" onclick="sentStop(${qId})">⏹ Stop</button>
            </div>

            <div class="st-prac-status" id="sent-status-${qId}"></div>
            <div id="sent-result-${qId}"></div>

            <div class="sent-prac-nav hidden" id="sent-nav-${qId}">
              <button class="btn btn-gray"   onclick="sentPrev(${qId})" ${idx === 0 ? 'disabled' : ''}>‹ Prev</button>
              <button class="btn btn-indigo" onclick="sentNext(${qId})">${isLast ? '🎉 Finish' : 'Next →'}</button>
            </div>
          </div>`;
      }

      function sentSpeak(qId) {
        const p = _sentPrac[qId];
        if (!p) return;
        const sent = p.sentences[p.idx];
        window.speechSynthesis.cancel();
        const utt      = new SpeechSynthesisUtterance(sent);
        utt.lang       = 'nb-NO';
        utt.rate       = 0.8;
        const voices   = window.speechSynthesis.getVoices();
        const norVoice = voices.find(v => v.lang.startsWith('nb') || v.lang.startsWith('no'));
        if (norVoice) utt.voice = norVoice;
        window.speechSynthesis.speak(utt);
      }

      async function sentRecord(qId) {
        const p = _sentPrac[qId];
        if (!p) return;

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(getMicConstraints());
        } catch (e) {
          const s = document.getElementById('sent-status-' + qId);
          if (s) s.textContent = '❌ Mic denied. Please allow microphone.';
          return;
        }

        p.transcript = '';
        p.stream     = stream;

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

        // ── MediaRecorder ─────────────────────────────────────────────────────
        const mr          = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
        });
        p.mediaRec         = mr;
        mr.ondataavailable = () => {};
        mr.onstop          = () => {
          stream.getTracks().forEach(t => t.stop());
          if (!SR) _sentShowResult(qId, '');
        };
        mr.start();

        // ── SpeechRecognition ─────────────────────────────────────────────────
        if (SR) {
          const rec          = new SR();
          rec.lang           = 'nb-NO';
          rec.continuous     = true;
          rec.interimResults = true;
          p.rec              = rec;

          rec.onresult = e => {
            let final = '', interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const t = e.results[i][0].transcript;
              if (e.results[i].isFinal) final += t + ' '; else interim += t;
            }
            p.transcript += final;
            const spokenEl = document.getElementById('sent-spoken-' + qId);
            if (spokenEl) spokenEl.textContent = (p.transcript + interim).trim() || '…listening';

            // Auto-stop 300ms after first final result (sentences are short)
            if (final.trim()) {
              clearTimeout(p.autoStop);
              setTimeout(() => sentStop(qId), 300);
            }
          };
          rec.onend = () => {
            clearTimeout(p?.autoStop);
            if (p?.mediaRec?.state !== 'inactive') {
              try { p.mediaRec.stop(); } catch (e) {}
            }
            _sentShowResult(qId, p?.transcript || '');
          };
          rec.onerror = () => {};
          try { rec.start(); } catch (e) {}
        }

        // 10s auto-stop fallback
        p.autoStop = setTimeout(() => sentStop(qId), 10000);

        // ── Update UI ─────────────────────────────────────────────────────────
        const recBtn  = document.getElementById('sent-rec-'  + qId);
        const stopBtn = document.getElementById('sent-stop-' + qId);
        if (recBtn) recBtn.classList.add('hidden');
        if (stopBtn) {
          stopBtn.classList.remove('hidden');
          stopBtn.disabled    = true;
          stopBtn.textContent = '⏹ Stop (2s…)';
          setTimeout(() => { stopBtn.disabled = false; stopBtn.textContent = '⏹ Stop & Score'; }, 2000);
        }
        const spokenArea = document.getElementById('sent-spoken-' + qId);
        if (spokenArea) { spokenArea.textContent = ''; spokenArea.classList.add('recording'); }
        const r = document.getElementById('sent-result-' + qId);
        if (r) r.innerHTML = '';
      }

      function sentStop(qId) {
        _sentStopCleanup(qId);
        const recBtn  = document.getElementById('sent-rec-'  + qId);
        const stopBtn = document.getElementById('sent-stop-' + qId);
        if (recBtn)  recBtn.classList.remove('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');
        const spokenArea = document.getElementById('sent-spoken-' + qId);
        if (spokenArea) spokenArea.classList.remove('recording');
      }

      function _sentStopCleanup(qId) {
        const p = _sentPrac[qId];
        if (!p) return;
        clearTimeout(p.autoStop);
        if (p.mediaRec && p.mediaRec.state !== 'inactive') {
          try { p.mediaRec.stop(); } catch (e) {}
        }
        setTimeout(() => {
          if (p.rec) { try { p.rec.stop(); } catch (e) {} }
        }, 300);
      }

      function _sentShowResult(qId, spoken) {
        const p = _sentPrac[qId];
        if (!p) return;
        const ref = p.sentences[p.idx].toLowerCase();
        const sp  = spoken.trim().toLowerCase();

        const clean    = w => w.replace(/[.,!?;:«»""'']/g, '').trim();
        const refWords = ref.split(/\s+/).filter(Boolean).map(clean).filter(Boolean);
        const spWords  = sp.split(/\s+/).filter(Boolean).map(clean).filter(Boolean);

        const matched = new Set();
        spWords.forEach(sw => {
          const idx = refWords.findIndex((rw, ri) => !matched.has(ri) && wordSim(sw, rw) >= 0.75);
          if (idx >= 0) matched.add(idx);
        });

        const score  = refWords.length > 0
          ? Math.round((matched.size / refWords.length) * 100) : 0;
        const color  = score >= 80 ? '#16a34a' : score >= 55 ? '#d97706' : '#dc2626';
        const msg    = score >= 80 ? '🎉 Excellent!' : score >= 55 ? '👍 Good!' : '💪 Keep going!';
        const missed = refWords.filter((_, i) => !matched.has(i));

        const resultEl = document.getElementById('sent-result-' + qId);
        if (resultEl) {
          resultEl.innerHTML = `
            <div class="sb-score-block">
              <div class="st-score-row">
                <div class="st-score-num" style="color:${color}">${score}%</div>
                <div class="st-score-bar-wrap">
                  <div class="st-score-bar"><div class="st-score-fill" style="width:${score}%;background:${color}"></div></div>
                  <div style="font-size:0.78rem;font-weight:600;color:${color}">${msg}</div>
                </div>
              </div>
              ${missed.length ? `<div class="st-missed">Missed: <strong>${missed.join(', ')}</strong></div>` : ''}
            </div>`;
        }

        // Show nav in action-row style
        const nav = document.getElementById('sent-nav-' + qId);
        if (nav) nav.classList.remove('hidden');
      }

      function sentNext(qId) {
        const p = _sentPrac[qId];
        if (!p) return;
        if (p.idx >= p.sentences.length - 1) {
          // All sentences finished
          const panel = document.getElementById('st-sent-' + qId);
          if (panel) {
            panel.innerHTML = `
              <div class="sent-prac-box" style="text-align:center;padding:28px 20px">
                <div style="font-size:2.5rem;margin-bottom:10px">🎉</div>
                <div style="font-size:1.1rem;font-weight:700;color:#16a34a;font-family:'Fraunces',serif">All sentences complete!</div>
                <p style="color:#6b7280;font-size:0.88rem;margin-top:6px">Great practice — you went through every sentence.</p>
                <button class="btn btn-indigo" style="margin-top:14px" onclick="startSentencePractice(${qId})">🔄 Practice Again</button>
              </div>`;
          }
          return;
        }
        p.idx++;
        _renderSentPanel(qId);
        // no auto-play — user clicks 🔊 Hear manually
      }

      function sentPrev(qId) {
        const p = _sentPrac[qId];
        if (!p || p.idx <= 0) return;
        p.idx--;
        _renderSentPanel(qId);
        // no auto-play — user clicks 🔊 Hear manually
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

        _sbRec[id] = { transcript: '', stream };

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
              const t = e.results[i][0].transcript;
              if (e.results[i].isFinal) final += t + ' '; else interim += t;
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

      function sbShowResult(id, spoken) {
        const s = (typeof SENTENCES_B1 !== 'undefined') ? SENTENCES_B1.find(s => s.id === id) : null;
        if (!s) return;
        const ref = s.no.toLowerCase();
        const sp  = spoken.trim().toLowerCase();

        const clean    = w => w.replace(/[.,!?;:«»""'']/g, '').trim();
        const refWords = ref.split(/\s+/).filter(Boolean).map(clean).filter(Boolean);
        const spWords  = sp.split(/\s+/).filter(Boolean).map(clean).filter(Boolean);

        const matched = new Set();
        spWords.forEach(sw => {
          const idx = refWords.findIndex((rw, ri) => !matched.has(ri) && wordSim(sw, rw) >= 0.75);
          if (idx >= 0) matched.add(idx);
        });

        const score  = refWords.length > 0 ? Math.round((matched.size / refWords.length) * 100) : 0;
        const color  = score >= 80 ? '#16a34a' : score >= 55 ? '#d97706' : '#dc2626';
        const msg    = score >= 80 ? '🎉 Excellent!' : score >= 55 ? '👍 Good!' : '💪 Keep going!';
        const missed = refWords.filter((_, i) => !matched.has(i));

        const resultEl = document.getElementById('sb-result-' + id);
        if (resultEl) {
          resultEl.innerHTML = `
            <div class="sb-score-block">
              <div class="st-score-row">
                <div class="st-score-num" style="color:${color}">${score}%</div>
                <div class="st-score-bar-wrap">
                  <div class="st-score-bar"><div class="st-score-fill" style="width:${score}%;background:${color}"></div></div>
                  <div style="font-size:0.78rem;font-weight:600;color:${color}">${msg}</div>
                </div>
              </div>
              ${missed.length ? `<div class="st-missed">Missed: <strong>${missed.join(', ')}</strong></div>` : ''}
            </div>
            <div class="action-row" style="margin-top:10px">
              <button class="btn btn-ghost"  onclick="sbSpeak(${id})">🔊 Sample Answer</button>
              <button class="btn btn-green"  onclick="sbRecord(${id})">🔁 Try Again</button>
              <button class="btn btn-indigo" onclick="sbNext()">Next →</button>
            </div>`;
        }

        const st = document.getElementById('sb-status-' + id);
        if (st) st.textContent = score >= 80 ? '✅ Great answer!' : '📖 Compare with the sample answer below';
      }

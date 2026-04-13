      // ═══════════════════════════════════════════════════════════════════════════════
      // ─── STUDY MODE — Question Bank ───────────────────────────────────────────────
      // ═══════════════════════════════════════════════════════════════════════════════

      // ── Main render ───────────────────────────────────────────────────────────────
      function renderStudy() {
        const root = document.getElementById('study-page-root');
        if (!root) return;
        root.innerHTML = '<div id="sb-root"></div>';
        renderQuestionBank();
      }

      // ══════════════════════════════════════════════════════════════════════════════
      // ── QUESTION BANK ─────────────────────────────────────────────────────────────
      // Browse + practice B1+ Norwegian sentences. Supports add/edit/delete custom
      // questions and hiding built-in ones.
      // ══════════════════════════════════════════════════════════════════════════════

      let _sbIdx    = 0;
      let _sbCat    = 'all';
      let _sbRec    = {};   // recording state for question bank

      function _sbQueue() {
        if (typeof SENTENCES_B1 === 'undefined') return [];
        const hidden = new Set(state.hiddenQBIds || []);
        const base   = SENTENCES_B1.filter(s => !hidden.has(s.id));
        const custom = (state.customQuestions || []);
        const all    = [...base, ...custom];
        return _sbCat === 'all' ? all : all.filter(s => s.cat === _sbCat);
      }

      function setSbCat(cat) {
        _sbCat = cat;
        _sbIdx = 0;
        renderQuestionBank();
      }

      function sbPrev() { if (_sbIdx > 0)                    { _sbIdx--; renderQuestionBank(); } }
      function sbNext() { if (_sbIdx < _sbQueue().length - 1) { _sbIdx++; renderQuestionBank(); } }

      function renderQuestionBank() {
        const root = document.getElementById('sb-root');
        if (!root) return;

        const queue = _sbQueue();
        if (!queue.length) {
          root.innerHTML = `<p style="text-align:center;color:#94a3b8;padding:40px">No questions found.</p>`;
          return;
        }
        if (_sbIdx >= queue.length) _sbIdx = queue.length - 1;

        const sent = queue[_sbIdx];
        const disabled = queue.length <= 1 ? 'disabled' : '';

        const catBtns = [{ id: 'all', label: 'All', emoji: '🌐' }, ...CATS].map(c => {
          const id    = c.id || 'all';
          const label = c.label || 'All';
          const emoji = c.emoji || '🌐';
          const hidden = new Set(state.hiddenQBIds || []);
          const base   = typeof SENTENCES_B1 !== 'undefined' ? SENTENCES_B1.filter(s => !hidden.has(s.id)) : [];
          const custom = (state.customQuestions || []);
          const all    = [...base, ...custom];
          const count  = id === 'all' ? all.length : all.filter(s => s.cat === id).length;
          return `<button class="filter-chip${_sbCat===id?' active':''}" onclick="setSbCat('${id}')">${emoji} ${label} <span style="font-size:0.7em;opacity:0.7">${count}</span></button>`;
        }).join('');

        const customActions = sent.custom ? `
          <div class="sb-custom-actions">
            <button class="btn-qb-edit" onclick="sbShowEditForm('${sent.id}')">✏️ Edit</button>
            <button class="btn-qb-delete" onclick="sbDeleteQuestion('${sent.id}')">🗑 Delete</button>
          </div>` : `
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #f1f5f9">
            <button class="btn btn-ghost" style="font-size:0.72rem;color:#94a3b8" onclick="sbHideBuiltin(${JSON.stringify(sent.id)})">✕ Hide this question</button>
          </div>`;

        const hiddenCount = (state.hiddenQBIds || []).length;

        root.innerHTML = `
          <div class="sb-nav-row">
            <button class="btn btn-gray" onclick="sbPrev()" ${_sbIdx===0?'disabled':''}>‹ Prev</button>
            <span class="study-counter">${_sbIdx+1} / ${queue.length}</span>
            <button class="btn btn-gray" onclick="sbNext()" ${_sbIdx===queue.length-1?'disabled':''}>Next ›</button>
            <div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">
              ${hiddenCount ? `<button class="btn btn-ghost" style="font-size:0.76rem;color:#d97706;border-color:#fde68a" onclick="sbShowRestorePanel()">↩ Restore Hidden (${hiddenCount})</button>` : ''}
              <button class="btn btn-green" style="font-size:0.78rem" onclick="sbShowAddForm()">➕ Add Question</button>
            </div>
          </div>

          <div class="sb-cat-row">${catBtns}</div>

          <div class="card">
            <!-- Header: badge + question -->
            <div class="card-header">
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
                  <span class="cat-badge ${catClass(sent.cat)}">${catLabel(sent.cat)}</span>
                  <span class="q-num">#${_sbIdx+1}</span>
                  ${sent.qEn ? `<span class="sb-qen-badge">${sent.qEn}</span>` : ''}
                  ${sent.custom ? `<span style="font-size:0.7rem;background:#ede9fe;color:#5b21b6;padding:2px 8px;border-radius:10px;font-weight:600">Custom</span>` : ''}
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
                <div style="margin-bottom:6px">${sent.no || ''}</div>
                <div style="font-size:0.82rem;color:#2563eb;font-style:italic">${sent.en || ''}</div>
                <button class="btn btn-ghost" style="font-size:0.76rem;margin-top:8px" onclick="sbSpeak(${JSON.stringify(sent.id)})">🔊 Hear Sample Answer</button>
              </div>
            </div>

            <!-- Action row -->
            <div class="action-row">
              <button class="btn btn-ghost"  onclick="sbSpeakQuestion(${JSON.stringify(sent.id)})">🔊 Question</button>
              <button class="btn btn-green"  id="sb-rec-${sent.id}"  onclick="sbRecord(${JSON.stringify(sent.id)})">🎤 Record Answer</button>
              <button class="btn btn-danger hidden" id="sb-stop-${sent.id}" onclick="sbStop(${JSON.stringify(sent.id)})">⏹ Stop</button>
            </div>

            <div class="st-prac-status" id="sb-status-${sent.id}"></div>
            <div id="sb-result-${sent.id}"></div>

            ${customActions}
          </div>`;
      }

      // ── Add/Edit Form ─────────────────────────────────────────────────────────────

      function sbShowAddForm() {
        const root = document.getElementById('sb-root');
        if (!root) return;
        const formHtml = _sbFormHtml(null, null);
        root.insertAdjacentHTML('afterbegin', formHtml);
      }

      function sbShowEditForm(id) {
        const root = document.getElementById('sb-root');
        if (!root) return;
        const existing = (state.customQuestions || []).find(q => q.id === id);
        if (!existing) return;
        // Remove any existing form first
        const old = document.getElementById('sb-form');
        if (old) old.remove();
        const formHtml = _sbFormHtml(id, existing);
        root.insertAdjacentHTML('afterbegin', formHtml);
      }

      function _sbFormHtml(id, existing) {
        const isEdit = !!id;
        const catOptions = [{ id: 'all', label: 'All', emoji: '🌐' }, ...CATS]
          .filter(c => c.id !== 'all')
          .map(c => `<option value="${c.id}" ${existing?.cat === c.id ? 'selected' : ''}>${c.emoji} ${c.label}</option>`)
          .join('');
        return `
        <div class="card sb-edit-form" id="sb-form">
          <div style="font-weight:700;margin-bottom:12px;font-size:1rem">${isEdit ? '✏️ Edit Question' : '➕ New Question'}</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <label style="font-size:0.8rem;font-weight:600">Category</label>
            <select id="sbf-cat" class="answer-area" style="height:auto;padding:8px">
              ${catOptions}
            </select>
            <label style="font-size:0.8rem;font-weight:600">Question (Norwegian)</label>
            <input id="sbf-q" class="answer-area" style="height:auto;padding:8px" value="${escapeHtml(existing?.q || '')}">
            <label style="font-size:0.8rem;font-weight:600">Question (English hint)</label>
            <input id="sbf-qen" class="answer-area" style="height:auto;padding:8px" value="${escapeHtml(existing?.qEn || '')}">
            <label style="font-size:0.8rem;font-weight:600">Sample Answer (Norwegian)</label>
            <textarea id="sbf-no" class="answer-area" rows="3">${escapeHtml(existing?.no || '')}</textarea>
            <label style="font-size:0.8rem;font-weight:600">Sample Answer (English)</label>
            <textarea id="sbf-en" class="answer-area" rows="2">${escapeHtml(existing?.en || '')}</textarea>
          </div>
          <div class="action-row" style="margin-top:14px">
            <button class="btn btn-primary" onclick="sbSaveForm(${isEdit ? `'${id}'` : 'null'})">💾 Save</button>
            <button class="btn btn-gray" onclick="sbCancelForm()">Cancel</button>
          </div>
        </div>`;
      }

      function sbSaveForm(id) {
        const cat  = document.getElementById('sbf-cat')?.value?.trim() || '';
        const q    = document.getElementById('sbf-q')?.value?.trim() || '';
        const qEn  = document.getElementById('sbf-qen')?.value?.trim() || '';
        const no   = document.getElementById('sbf-no')?.value?.trim() || '';
        const en   = document.getElementById('sbf-en')?.value?.trim() || '';

        if (!q) { alert('Please enter a question in Norwegian.'); return; }

        if (id === null || id === 'null') {
          // Add new
          const newQ = { id: 'cq-' + Date.now(), cat, q, qEn, no, en, custom: true };
          state.customQuestions = [...(state.customQuestions || []), newQ];
        } else {
          // Edit existing
          state.customQuestions = (state.customQuestions || []).map(cq =>
            cq.id === id ? { ...cq, cat, q, qEn, no, en } : cq
          );
        }
        saveState();
        renderQuestionBank();
      }

      function sbDeleteQuestion(id) {
        if (!confirm('Delete this question?')) return;
        state.customQuestions = (state.customQuestions || []).filter(q => q.id !== id);
        saveState();
        if (_sbIdx >= _sbQueue().length) _sbIdx = Math.max(0, _sbQueue().length - 1);
        renderQuestionBank();
      }

      function sbHideBuiltin(id) {
        state.hiddenQBIds = [...new Set([...(state.hiddenQBIds || []), id])];
        saveState();
        if (_sbIdx >= _sbQueue().length) _sbIdx = Math.max(0, _sbQueue().length - 1);
        renderQuestionBank();
      }

      function sbShowRestorePanel() {
        const root = document.getElementById('sb-root');
        if (!root) return;
        const hiddenIds = state.hiddenQBIds || [];
        if (!hiddenIds.length) return;
        const hiddenQs = (typeof SENTENCES_B1 !== 'undefined' ? SENTENCES_B1 : [])
          .filter(s => hiddenIds.includes(s.id));

        const old = document.getElementById('sb-restore-panel');
        if (old) { old.remove(); return; } // toggle

        const panel = document.createElement('div');
        panel.id = 'sb-restore-panel';
        panel.className = 'card sb-restore-panel';
        panel.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <span style="font-weight:700;font-size:0.95rem">↩ Hidden Questions</span>
            <div style="display:flex;gap:8px">
              <button class="btn btn-ghost" style="font-size:0.76rem" onclick="sbRestoreAll()">Restore All</button>
              <button class="btn btn-gray"  style="font-size:0.76rem" onclick="document.getElementById('sb-restore-panel').remove()">✕ Close</button>
            </div>
          </div>
          ${hiddenQs.map(q => `
            <div class="sb-restore-row">
              <span class="cat-badge cat-${q.cat}" style="font-size:0.65rem;flex-shrink:0">${catLabel(q.cat)}</span>
              <span style="flex:1;font-size:0.83rem;color:#374151">${escapeHtml(q.q)}</span>
              <button class="btn btn-ghost" style="font-size:0.74rem;flex-shrink:0" onclick="sbRestoreOne(${JSON.stringify(q.id)})">↩ Restore</button>
            </div>`).join('')}`;
        root.insertAdjacentElement('afterbegin', panel);
      }

      function sbRestoreOne(id) {
        state.hiddenQBIds = (state.hiddenQBIds || []).filter(h => h !== id);
        saveState();
        const panel = document.getElementById('sb-restore-panel');
        if (panel) panel.remove();
        renderQuestionBank();
      }

      function sbRestoreAll() {
        state.hiddenQBIds = [];
        saveState();
        const panel = document.getElementById('sb-restore-panel');
        if (panel) panel.remove();
        renderQuestionBank();
      }

      function sbCancelForm() { renderQuestionBank(); }

      // ── Speech helpers ────────────────────────────────────────────────────────────

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
        const all = [...(typeof SENTENCES_B1 !== 'undefined' ? SENTENCES_B1 : []), ...(state.customQuestions || [])];
        const s = all.find(s => s.id === id);
        if (s && s.no) _sbSpeakText(s.no);
      }

      function sbSpeakQuestion(id) {
        const all = [...(typeof SENTENCES_B1 !== 'undefined' ? SENTENCES_B1 : []), ...(state.customQuestions || [])];
        const s = all.find(s => s.id === id);
        if (s) _sbSpeakText(s.q);
      }

      async function sbRecord(id) {
        const all = [...(typeof SENTENCES_B1 !== 'undefined' ? SENTENCES_B1 : []), ...(state.customQuestions || [])];
        const s = all.find(s => s.id === id);
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
            <button class="btn btn-ghost"  onclick="sbSpeak(${JSON.stringify(id)})">🔊 Sample Answer</button>
            <button class="btn btn-green"  onclick="sbRecord(${JSON.stringify(id)})">🔁 Try Again</button>
            <button class="btn btn-indigo" onclick="sbNext()">Next →</button>
          </div>`;

        const st = document.getElementById('sb-status-' + id);
        if (st) st.textContent =
          gram.score >= 80 && (pronScore === null || pronScore >= 70)
            ? '✅ Great response!'
            : '💡 See feedback below';
      }

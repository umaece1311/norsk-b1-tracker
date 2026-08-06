      // ─── CATEGORY BADGE ───────────────────────────────────────────────────────────
      function catLabel(catId) {
        const c = CATS.find(c => c.id === catId);
        return c ? `${c.emoji} ${c.label}` : catId;
      }
      function catClass(catId) {
        return 'cat-' + catId;
      }

      // ─── QUESTION CARD ────────────────────────────────────────────────────────────
      function renderCard(q, opts = {}) {
        const status = state.status[q.id] || 'new';
        const answer = state.answers[q.id] || '';
        const examBadge = q.examType
          ? `<span class="exam-badge badge-${q.examType}">Type ${q.examType}</span>`
          : '';

        return `
  <div class="card" id="card-${q.id}">
    <div class="card-header">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
          <span class="cat-badge ${catClass(q.cat)}">${catLabel(q.cat)}</span>
          ${examBadge}
          <span class="q-num">#${q.id}</span>
        </div>
        <div class="q-text">${q.q}</div>
      </div>
      <button class="btn-favourite-star ${state.favourites[q.id] ? 'active' : ''}" id="favBtn-${q.id}" onclick="toggleFavourite(${q.id})" title="${state.favourites[q.id] ? 'Remove from Favourites' : 'Add to Favourites'}">
        ${state.favourites[q.id] ? '⭐' : '☆'}
      </button>
    </div>

    <div class="status-row">
      <span style="font-size:0.8rem;color:#888;align-self:center">Status:</span>
      <button class="status-btn ${status === 'new' ? 'active-new' : ''}" onclick="setStatus(${q.id},'new')">🆕 New</button>
      <button class="status-btn ${status === 'learning' ? 'active-learning' : ''}" onclick="setStatus(${q.id},'learning')">📖 Learning</button>
      <button class="status-btn ${status === 'done' ? 'active-done' : ''}" onclick="setStatus(${q.id},'done')">✅ Done</button>
    </div>

    <textarea class="answer-area" id="ans-${q.id}" placeholder="Write your answer in Norwegian…" oninput="autoSaveAnswer(${q.id})">${answer}</textarea>

    ${q.a ? `
    <div class="pdf-answer-box">
      <div class="pdf-answer-toggle" onclick="togglePdfAnswer(${q.id}, this)">
        <span>📖</span> <span>PDF Sample Answer</span> <span style="margin-left:auto;font-size:1rem">▼</span>
      </div>
      <div class="pdf-answer-content hidden" id="pdf-ans-${q.id}">${escapeHtml(q.a)}</div>
    </div>` : ''}

    ${renderFollowUps(q)}

    <div class="action-row">
      <button class="btn btn-primary" onclick="saveAnswer(${q.id})">💾 Save</button>
      <button class="btn btn-ghost" onclick="toggleTransPanel(${q.id})">🌐 Translate</button>
      <button class="btn btn-ghost" onclick="speakText(${q.id},'q')">🔊 Question</button>
      <button class="btn btn-ghost" onclick="speakText(${q.id},'a')">🔊 Answer</button>
      <button class="btn btn-ghost" onclick="downloadQuestionMp3(${q.id})">🎧 MP3</button>
      <button class="btn btn-green" onclick="togglePronunciation(${q.id})">🎤 Pronunciation</button>
      ${opts.showTimer ? `<button class="btn btn-gray" onclick="toggleCardTimer(${q.id},'${q.examType || 'A'}')">⏱ Timer</button>` : ''}
      <button class="btn ${state.reviewMarked[q.id] ? 'btn-review-active' : 'btn-gray'}" id="reviewBtn-${q.id}" onclick="toggleReview(${q.id})">
        🔖 ${state.reviewMarked[q.id] ? 'In Review' : 'Add to Review'}
      </button>
    </div>

    <div id="trans-${q.id}" class="hidden trans-panel">
      <div class="trans-tabs">
        <button class="trans-tab active" id="ttab-q-${q.id}"   onclick="switchTransTab(${q.id},'q')">🇳🇴 Question</button>
        <button class="trans-tab"        id="ttab-my-${q.id}"  onclick="switchTransTab(${q.id},'my')">✏️ My Answer</button>
        <button class="trans-tab"        id="ttab-sa-${q.id}"  onclick="switchTransTab(${q.id},'sa')">📖 Sample Answer</button>
        <button class="trans-tab"        id="ttab-en-${q.id}"  onclick="switchTransTab(${q.id},'en')">🇬🇧→🇳🇴 Compose</button>
        <button class="trans-tab"        id="ttab-vk-${q.id}"  onclick="switchTransTab(${q.id},'vk')">🔍 Word Lookup</button>
      </div>
      <div class="trans-body" id="trans-body-${q.id}"></div>
    </div>
    <div id="pron-${q.id}" class="hidden pron-box">
      <h4>🎤 Pronunciation Check <span style="font-weight:400;color:#a78bfa;font-size:0.75rem">(100% free · no API key · Chrome/Edge)</span></h4>
      <div class="mic-selector-row">
        <span class="mic-selector-label">🎧 Mic / headset:</span>
        <select class="mic-selector-select" id="pronMicSelect-${q.id}" onchange="onMicChange(this.value); syncAllMicSelects(this.value)">
          <option value="">Default microphone</option>
        </select>
        <button class="mic-selector-btn" onclick="populatePronMic(${q.id})">↻</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;align-items:center">
        <button class="btn btn-green" id="recBtn-${q.id}" onclick="startRecording(${q.id})">⏺ Start Recording</button>
        <button class="btn btn-danger hidden" id="stopBtn-${q.id}" onclick="stopRecording(${q.id})">⏹ Stop &amp; Analyse</button>
        <button class="btn btn-ghost" id="replayBtn-${q.id}" onclick="replayRecording(${q.id})" style="display:none">▶ Play Back My Voice</button>
        <button class="btn btn-ghost" id="clearRecBtn-${q.id}" onclick="clearRecording(${q.id})" style="display:none">🗑 Clear</button>
      </div>
      <div class="rec-status" id="recStatus-${q.id}">Click ⏺ Start Recording, then speak your answer in Norwegian</div>
      <div class="interim-text" id="interim-${q.id}"></div>
      <div class="waveform-wrap" id="waveWrap-${q.id}">
        <canvas id="waveCanvas-${q.id}" height="60"></canvas>
      </div>
      <div class="audio-playback" id="audioPlayback-${q.id}">
        <label>🎧 Your Recording — listen back &amp; compare with the Norwegian TTS:</label>
        <audio id="audioPlayer-${q.id}" controls style="width:100%;margin-top:4px"></audio>
        <button class="btn btn-ghost" style="margin-top:6px;font-size:0.78rem" onclick="speakReferenceFor(${q.id})">🔊 Hear correct Norwegian pronunciation</button>
      </div>
      <div id="recResult-${q.id}"></div>
      <div class="phonetic-tips" id="phoneticTips-${q.id}"></div>
      <div class="pron-vocab-section">
        <div class="pron-vocab-label">📚 Your Answer — Vocabulary Practice</div>
        <div id="card-vocab-${q.id}" class="card-vocab-panel"></div>
      </div>
    </div>
    <div id="timer-card-${q.id}" class="hidden timer-widget" style="margin-top:10px">
      <div style="font-size:0.8rem;opacity:0.7;margin-bottom:4px">Practice Timer</div>
      <div class="timer-display" id="ctd-${q.id}">2:30</div>
      <div class="timer-progress"><div class="timer-fill" id="ctf-${q.id}" style="width:100%"></div></div>
      <div class="timer-controls">
        <button class="btn btn-ghost" onclick="cardTimerStart(${q.id})">▶ Start</button>
        <button class="btn btn-gray" onclick="cardTimerPause(${q.id})">⏸ Pause</button>
        <button class="btn btn-gray" onclick="cardTimerReset(${q.id},'${q.examType || 'A'}')">↩ Reset</button>
      </div>
    </div>
  </div>`;
      }

      // ─── FOLLOW-UP QUESTIONS (user-added, attached to any main question) ───────────
      function ensureFollowUpsInState() {
        if (!state.followUps) state.followUps = {};
      }

      function renderFollowUps(q) {
        ensureFollowUpsInState();
        const items = state.followUps[q.id] || [];

        const itemsHTML = items.map((fu, i) => {
          const fuId = `${q.id}-f${i}`;
          const fuAnswer = state.answers[fuId] || '';
          return `
      <div class="followup-item">
        <div class="followup-item-head">
          <div class="followup-q">${escapeHtml(fu.q)}</div>
          <button class="btn-cq-delete" onclick="deleteFollowUp(${q.id},${i})" title="Delete follow-up">🗑</button>
        </div>
        <textarea class="answer-area followup-answer-area" id="ans-${fuId}" placeholder="Write your answer in Norwegian…" oninput="autoSaveAnswer('${fuId}')">${fuAnswer}</textarea>
        ${fu.a ? `
        <div class="pdf-answer-box">
          <div class="pdf-answer-toggle" onclick="togglePdfAnswer('${fuId}', this)">
            <span>📖</span> <span>Sample Answer</span> <span style="margin-left:auto;font-size:1rem">▼</span>
          </div>
          <div class="pdf-answer-content hidden" id="pdf-ans-${fuId}">${escapeHtml(fu.a)}</div>
        </div>` : ''}
        <button class="btn btn-primary" style="margin-top:6px" onclick="saveAnswer('${fuId}')">💾 Save</button>
      </div>`;
        }).join('');

        return `
    <div class="followup-box">
      <div class="followup-label">🔁 Follow-up Questions</div>
      ${itemsHTML}
      <div class="followup-add-form hidden" id="followup-add-form-${q.id}">
        <input class="followup-add-input" id="followup-add-q-${q.id}" placeholder="Follow-up question (Norwegian)…">
        <textarea class="followup-add-input" id="followup-add-a-${q.id}" rows="2" placeholder="Sample answer (optional)…"></textarea>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" onclick="addFollowUp(${q.id})">➕ Add</button>
          <button class="btn btn-gray" onclick="toggleFollowUpForm(${q.id})">Cancel</button>
        </div>
      </div>
      <button class="btn btn-ghost followup-toggle-btn" id="followup-toggle-btn-${q.id}" onclick="toggleFollowUpForm(${q.id})">➕ Add Follow-up Question</button>
    </div>`;
      }

      function toggleFollowUpForm(qId) {
        const form = document.getElementById(`followup-add-form-${qId}`);
        const btn = document.getElementById(`followup-toggle-btn-${qId}`);
        if (!form) return;
        const isHidden = form.classList.contains('hidden');
        form.classList.toggle('hidden', !isHidden);
        if (btn) btn.style.display = isHidden ? 'none' : '';
        if (isHidden) document.getElementById(`followup-add-q-${qId}`)?.focus();
      }

      function addFollowUp(qId) {
        ensureFollowUpsInState();
        const qInput = document.getElementById(`followup-add-q-${qId}`);
        const aInput = document.getElementById(`followup-add-a-${qId}`);
        const q = qInput.value.trim();
        const a = aInput.value.trim();
        if (!q) { showToast('⚠️ Enter a follow-up question first.'); return; }

        if (!state.followUps[qId]) state.followUps[qId] = [];
        state.followUps[qId].push({ q, a });
        saveState();

        const card = document.getElementById('card-' + qId);
        if (card) {
          const box = card.querySelector('.followup-box');
          if (box) box.outerHTML = renderFollowUps(allQuestions().find(x => x.id === qId));
        }
        showToast('✅ Follow-up added!');
      }

      function deleteFollowUp(qId, index) {
        ensureFollowUpsInState();
        if (!state.followUps[qId]) return;
        if (!confirm('Delete this follow-up question?')) return;

        state.followUps[qId].splice(index, 1);
        if (!state.followUps[qId].length) delete state.followUps[qId];
        saveState();

        const card = document.getElementById('card-' + qId);
        if (card) {
          const box = card.querySelector('.followup-box');
          if (box) box.outerHTML = renderFollowUps(allQuestions().find(x => x.id === qId));
        }
        showToast('🗑 Follow-up deleted.');
      }


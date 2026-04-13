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

    <div class="action-row">
      <button class="btn btn-primary" onclick="saveAnswer(${q.id})">💾 Save</button>
      <button class="btn btn-ghost" onclick="toggleTransPanel(${q.id})">🌐 Translate</button>
      <button class="btn btn-ghost" onclick="speakText(${q.id},'q')">🔊 Question</button>
      <button class="btn btn-ghost" onclick="speakText(${q.id},'a')">🔊 Answer</button>
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


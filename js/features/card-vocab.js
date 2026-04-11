      // ─── PER-CARD VOCABULARY PANEL ────────────────────────────────────────────────
      // Extracts words from a question + answers. One-click Practice → record → score.

      const _cvState = {}; // key = "qId_safeWord" → { rec, mediaRec, stream, transcript }

      function toggleCardVocab(qId) {
        const panel = document.getElementById('card-vocab-' + qId);
        if (!panel) return;
        if (panel.classList.contains('hidden')) {
          panel.classList.remove('hidden');
          renderCardVocab(qId);
        } else {
          panel.classList.add('hidden');
        }
      }

      function _cardVocabWords(q) {
        const text = [q.q, q.a || '', state.answers[q.id] || ''].join(' ');
        return extractWords(text); // extractWords + NO_STOP from vocabulary.js
      }

      function renderCardVocab(qId) {
        const panel = document.getElementById('card-vocab-' + qId);
        if (!panel) return;
        const q = allQuestions().find(q => q.id === qId);
        if (!q) return;
        ensureVocabInState();

        const words = _cardVocabWords(q);
        if (!words.length) {
          panel.innerHTML = `<div class="cv-empty">No vocabulary words found in this question.</div>`;
          return;
        }

        panel.innerHTML = `
          <div class="cv-header">
            <span class="cv-header-title">📚 ${words.length} word${words.length !== 1 ? 's' : ''} from this question</span>
            <button class="btn btn-gray" style="font-size:0.72rem;padding:3px 10px"
              onclick="addCardVocabToMain(${qId})">＋ Add all to My Vocab</button>
          </div>
          <div class="cv-list" id="cv-list-${qId}">
            ${words.map(w => _renderCvRow(qId, w)).join('')}
          </div>`;
      }

      function _renderCvRow(qId, word) {
        const safeId = word.replace(/[^a-zæøå]/g, '_');
        const esc    = word.replace(/'/g, "\\'");
        const entry  = (state.vocab || {})[word];
        const trans  = entry?.en ? `<span class="cv-trans">${entry.en}</span>` : '';
        return `
          <div class="cv-row" id="cvrow-${qId}-${safeId}">
            <div class="cv-word-info">
              <span class="cv-word">${word}</span>
              ${trans}
            </div>
            <div class="cv-actions">
              <button class="cv-btn cv-audio-btn"
                onclick="speakVocabWord('${esc}')" title="Hear pronunciation">🔊</button>
              <button class="cv-btn cv-prac-btn" id="cvpbtn-${qId}-${safeId}"
                onclick="startCardWordRecording(${qId},'${esc}')">🎤 Practice</button>
            </div>
            <div class="cv-inline-result" id="cv-result-${qId}-${safeId}"></div>
          </div>`;
      }

      // ── Recording (1-click: Practice → record → auto-stop → score) ───────────────
      async function startCardWordRecording(qId, word) {
        const safeId = word.replace(/[^a-zæøå]/g, '_');
        const key    = qId + '_' + safeId;
        const btn    = document.getElementById('cvpbtn-' + qId + '-' + safeId);

        // If already recording for this word, ignore
        if (btn && btn.classList.contains('recording')) return;

        // Update button to recording state
        if (btn) {
          btn.classList.add('recording');
          btn.textContent = '🔴 Listening…';
          btn.disabled    = true;
        }

        // Clear previous result
        const resultEl = document.getElementById('cv-result-' + qId + '-' + safeId);
        if (resultEl) resultEl.innerHTML = '';

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(getMicConstraints());
        } catch (e) {
          if (btn) { btn.classList.remove('recording'); btn.textContent = '🎤 Practice'; btn.disabled = false; }
          if (resultEl) resultEl.innerHTML = `<span style="font-size:0.72rem;color:#dc2626">❌ Mic denied</span>`;
          return;
        }

        _cvState[key] = { transcript: '', stream };

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR) {
          const rec = new SR();
          rec.lang           = 'nb-NO';
          rec.continuous     = false;
          rec.interimResults = true;
          _cvState[key].rec  = rec;

          rec.onresult = e => {
            let final = '', interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const t = e.results[i][0].transcript;
              if (e.results[i].isFinal) final += t; else interim += t;
            }
            _cvState[key].transcript += final;
            // Show interim text in button
            const live = (_cvState[key].transcript + interim).trim();
            if (btn && live) btn.textContent = '🔴 ' + live.slice(0, 18) + (live.length > 18 ? '…' : '');
            // Auto-stop as soon as a final result arrives (single word)
            if (final.trim()) {
              clearTimeout(_cvState[key].autoStop);
              setTimeout(() => _cvStopAndScore(qId, word, safeId, key), 300);
            }
          };
          rec.onend = () => {
            clearTimeout(_cvState[key]?.autoStop);
            if (_cvState[key]?.mediaRec?.state !== 'inactive') {
              try { _cvState[key].mediaRec.stop(); } catch (e) {}
            }
            _finishCardWord(qId, word, safeId, key);
          };
          rec.onerror = () => { _cvStopAndScore(qId, word, safeId, key); };
          try { rec.start(); } catch (e) {}
        }

        // 5s auto-stop fallback
        _cvState[key].autoStop = setTimeout(() => _cvStopAndScore(qId, word, safeId, key), 5000);

        // MediaRecorder
        const mr = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
        });
        _cvState[key].mediaRec = mr;
        mr.ondataavailable = () => {};
        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          if (!SR) _finishCardWord(qId, word, safeId, key);
        };
        mr.start();
      }

      function _cvStopAndScore(qId, word, safeId, key) {
        const p = _cvState[key];
        if (!p) return;
        clearTimeout(p.autoStop);
        if (p.rec) { try { p.rec.stop(); } catch (e) {} }
        if (p.mediaRec && p.mediaRec.state !== 'inactive') {
          try { p.mediaRec.stop(); } catch (e) {}
        }
      }

      function _finishCardWord(qId, word, safeId, key) {
        const spoken = (_cvState[key]?.transcript || '').trim();
        const score  = spoken
          ? Math.round(wordSim(spoken.toLowerCase(), word.toLowerCase()) * 100)
          : 0;

        const color  = score >= 80 ? '#16a34a' : score >= 55 ? '#d97706' : '#dc2626';
        const bg     = score >= 80 ? '#f0fdf4' : score >= 55 ? '#fffbeb' : '#fef2f2';
        const border = score >= 80 ? '#bbf7d0' : score >= 55 ? '#fde68a' : '#fecaca';
        const msg    = score >= 80 ? '🎉 Excellent!' : score >= 55 ? '👍 Good!' : '💪 Try again';

        const resultEl = document.getElementById('cv-result-' + qId + '-' + safeId);
        if (resultEl) {
          resultEl.innerHTML = `
            <div class="cv-score-inline" style="background:${bg};border-color:${border}">
              <span class="cv-score-badge" style="color:${color}">${score}%</span>
              <div class="cv-score-bar-mini">
                <div class="cv-score-fill-mini" style="width:${score}%;background:${color}"></div>
              </div>
              <span class="cv-score-label" style="color:${color}">${msg}</span>
            </div>
            ${spoken ? `<div class="cv-you-said-mini">You said: "<em>${spoken}</em>"</div>` : ''}`;
        }

        // Reset button to "Retry"
        const btn = document.getElementById('cvpbtn-' + qId + '-' + safeId);
        if (btn) {
          btn.classList.remove('recording');
          btn.classList.add('retry');
          btn.textContent = '🔄 Retry';
          btn.disabled    = false;
        }
      }

      // ── Add all words from card to global vocab ───────────────────────────────────
      async function addCardVocabToMain(qId) {
        const q = allQuestions().find(q => q.id === qId);
        if (!q) return;
        ensureVocabInState();
        const words = _cardVocabWords(q);
        let added = 0;
        for (const w of words) {
          if (!state.vocab[w]) { await addVocabWord(w, 'answer'); added++; }
        }
        saveState();
        showToast(`✅ Added ${added} word${added !== 1 ? 's' : ''} to My Vocabulary!`);
      }

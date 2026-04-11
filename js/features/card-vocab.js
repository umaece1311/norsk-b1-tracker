      // ─── PER-CARD VOCABULARY PANEL ────────────────────────────────────────────────
      // Extracts words from a specific question + user answer + sample answer.
      // Shows inline audio (TTS) and per-word pronunciation practice on the card.

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
              <button class="cv-btn cv-audio-btn" onclick="speakVocabWord('${esc}')" title="Hear pronunciation">🔊</button>
              <button class="cv-btn cv-prac-btn" id="cvpbtn-${qId}-${safeId}"
                onclick="toggleCardWordPractice(${qId},'${esc}')">🎤 Practice</button>
            </div>
            <div class="cv-prac-area hidden" id="cvprac-${qId}-${safeId}">
              <div class="cv-prac-controls">
                <button class="btn btn-green" style="font-size:0.72rem;padding:4px 10px"
                  id="cv-rec-${qId}-${safeId}" onclick="startCardWordRecording(${qId},'${esc}')">⏺ Record</button>
                <button class="btn btn-danger hidden" style="font-size:0.72rem;padding:4px 10px"
                  id="cv-stop-${qId}-${safeId}" onclick="stopCardWordRecording(${qId},'${esc}')">⏹ Stop</button>
                <span class="cv-prac-hint" id="cv-hint-${qId}-${safeId}">Say "<strong>${word}</strong>"</span>
              </div>
              <div id="cv-result-${qId}-${safeId}"></div>
            </div>
          </div>`;
      }

      function toggleCardWordPractice(qId, word) {
        const safeId = word.replace(/[^a-zæøå]/g, '_');
        const area   = document.getElementById('cvprac-' + qId + '-' + safeId);
        if (area) area.classList.toggle('hidden');
      }

      async function startCardWordRecording(qId, word) {
        const safeId = word.replace(/[^a-zæøå]/g, '_');
        const key    = qId + '_' + safeId;

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(getMicConstraints());
        } catch (e) {
          const hint = document.getElementById('cv-hint-' + qId + '-' + safeId);
          if (hint) hint.textContent = '❌ Mic denied. Allow microphone access.';
          return;
        }

        _cvState[key] = { transcript: '', stream };

        // ── SpeechRecognition ─────────────────────────────────────────────────────
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR) {
          const rec = new SR();
          rec.lang = 'nb-NO';
          rec.continuous = false;
          rec.interimResults = true;
          _cvState[key].rec = rec;

          rec.onresult = e => {
            let final = '', interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const t = e.results[i][0].transcript;
              if (e.results[i].isFinal) final += t; else interim += t;
            }
            _cvState[key].transcript += final;
            const hint = document.getElementById('cv-hint-' + qId + '-' + safeId);
            if (hint) hint.innerHTML = (_cvState[key].transcript + interim).trim() || '…listening';
          };
          rec.onend = () => {
            if (_cvState[key]?.mediaRec?.state !== 'inactive') {
              try { _cvState[key].mediaRec.stop(); } catch(e) {}
            }
            _finishCardWord(qId, word, safeId, key);
          };
          rec.onerror = () => {};
          try { rec.start(); } catch (e) {}
        }

        // ── MediaRecorder ─────────────────────────────────────────────────────────
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

        // Update UI — disable Stop for 2s to prevent premature click
        const _recBtn  = document.getElementById('cv-rec-'  + qId + '-' + safeId);
        const _stopBtn = document.getElementById('cv-stop-' + qId + '-' + safeId);
        if (_recBtn)  _recBtn.classList.add('hidden');
        if (_stopBtn) {
          _stopBtn.classList.remove('hidden');
          _stopBtn.disabled = true;
          _stopBtn.textContent = '⏹ Stop (2s…)';
          setTimeout(() => { _stopBtn.disabled = false; _stopBtn.textContent = '⏹ Stop'; }, 2000);
        }
        const hint = document.getElementById('cv-hint-' + qId + '-' + safeId);
        if (hint) hint.innerHTML = `🔴 Recording… say <strong>${word}</strong>`;
        const result = document.getElementById('cv-result-' + qId + '-' + safeId);
        if (result) result.innerHTML = '';
      }

      function stopCardWordRecording(qId, word) {
        const safeId = word.replace(/[^a-zæøå]/g, '_');
        const key    = qId + '_' + safeId;
        const p      = _cvState[key];
        if (!p) return;
        if (p.rec) { try { p.rec.stop(); } catch (e) {} }
        if (p.mediaRec && p.mediaRec.state !== 'inactive') {
          try { p.mediaRec.stop(); } catch (e) {}
        }
        _setCvButtons(qId, safeId, false);
      }

      function _finishCardWord(qId, word, safeId, key) {
        const spoken = (_cvState[key]?.transcript || '').trim();
        const score  = spoken
          ? Math.round(wordSim(spoken.toLowerCase(), word.toLowerCase()) * 100)
          : 0;

        const color = score >= 80 ? '#16a34a' : score >= 55 ? '#d97706' : '#dc2626';
        const msg   = score >= 80 ? '🎉 Excellent!' : score >= 55 ? '👍 Good — keep going!' : '💪 Try again!';

        const resultEl = document.getElementById('cv-result-' + qId + '-' + safeId);
        if (resultEl) {
          resultEl.innerHTML = `
            <div class="cv-score-row">
              <span class="cv-score-num" style="color:${color}">${score}%</span>
              <div class="cv-score-bar"><div class="cv-score-fill" style="width:${score}%;background:${color}"></div></div>
              <span class="cv-score-msg" style="color:${color}">${msg}</span>
            </div>
            ${spoken ? `<div class="cv-you-said">You said: <em>"${spoken}"</em></div>` : ''}`;
        }

        const hint = document.getElementById('cv-hint-' + qId + '-' + safeId);
        if (hint) hint.innerHTML = `Say "<strong>${word}</strong>"`;
        _setCvButtons(qId, safeId, false);
      }

      function _setCvButtons(qId, safeId, recording) {
        const rec  = document.getElementById('cv-rec-' + qId + '-' + safeId);
        const stop = document.getElementById('cv-stop-' + qId + '-' + safeId);
        if (rec)  rec.classList.toggle('hidden', recording);
        if (stop) stop.classList.toggle('hidden', !recording);
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

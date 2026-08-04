      // ─── TTS ──────────────────────────────────────────────────────────────────────
      function speakText(id, type) {
        const qs = allQuestions();
        const q = qs.find(q => q.id === id);
        if (!q) return;
        const text =
          type === 'q'
            ? q.q
            : document.getElementById('ans-' + id)?.value || q.a || '';
        if (!text) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = 'nb-NO';
        utt.rate = 0.85;
        window.speechSynthesis.speak(utt);
      }

      // ─── PODCAST-STYLE FULL SCRIPT PLAYBACK ────────────────────────────────────────
      // Mirrors the pacing of the "say -r 100" podcast scripts: ~100 wpm speech
      // (rate 0.55 vs the ~180wpm default) with 550ms pauses between lines and
      // 1200ms pauses between question/answer/follow-up sections.
      const SCRIPT_RATE = 0.42;
      const SLNC_WORD = 300;
      const SLNC_LINE = 550;
      const SLNC_SECTION = 1200;
      const NUMBER_WORDS_NO = [
        '', 'én', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni', 'ti',
        'elleve', 'tolv', 'tretten', 'fjorten', 'femten', 'seksten', 'sytten', 'atten', 'nitten', 'tjue',
      ];

      let _scriptQueue = [];
      let _scriptStopped = true;
      let _scriptPaused = false;
      let _scriptIndex = 0;
      let _scriptRunId = 0; // bumped on stop/skip so stale timers/utterances no-op

      function isScriptPlaying() {
        return !_scriptStopped;
      }

      function _speakLine(text, runId) {
        return new Promise(resolve => {
          const utt = new SpeechSynthesisUtterance(text);
          utt.lang = 'nb-NO';
          utt.rate = SCRIPT_RATE;
          utt.onend = () => resolve(runId === _scriptRunId);
          utt.onerror = () => resolve(runId === _scriptRunId);
          window.speechSynthesis.speak(utt);
        });
      }

      function _pause(ms, runId) {
        return new Promise(resolve => {
          setTimeout(() => resolve(runId === _scriptRunId), ms);
        });
      }

      // Splits text into sentences so each one gets its own SLNC_LINE pause,
      // matching the podcast scripts where every sentence is its own line.
      function _splitSentences(text) {
        return (text || '')
          .split(/(?<=[.!?])\s+/)
          .map(s => s.trim())
          .filter(Boolean);
      }

      // Pushes one queue step per WORD in `text` (each word its own utterance,
      // paused SLNC_WORD apart) so playback reads deliberately, word by word.
      // The last word of each sentence pauses SLNC_LINE instead, and the last
      // word of the last sentence pauses `endPause` (section gap).
      function _pushSentences(queue, text, endPause, highlight) {
        const sentences = _splitSentences(text);
        let firstWordOfText = true;
        sentences.forEach((sentence, si) => {
          const isLastSentence = si === sentences.length - 1;
          const words = sentence.split(/\s+/).filter(Boolean);
          words.forEach((word, wi) => {
            const isLastWord = wi === words.length - 1;
            const pause = isLastWord ? (isLastSentence ? endPause : SLNC_LINE) : SLNC_WORD;
            queue.push({
              text: word,
              pause,
              highlight: firstWordOfText ? highlight : undefined,
            });
            firstWordOfText = false;
          });
        });
      }

      async function _runScriptQueue(runId) {
        while (_scriptIndex < _scriptQueue.length) {
          if (_scriptStopped || _scriptPaused || runId !== _scriptRunId) return;
          const step = _scriptQueue[_scriptIndex];
          if (step.highlight) _highlightScriptCard(step.highlight);
          const okAfterSpeak = await _speakLine(step.text, runId);
          if (!okAfterSpeak || _scriptStopped || _scriptPaused) return;
          const okAfterPause = await _pause(step.pause || SLNC_LINE, runId);
          if (!okAfterPause || _scriptStopped || _scriptPaused) return;
          _scriptIndex++;
        }
        if (runId === _scriptRunId) stopFullScript();
      }

      function _highlightScriptCard(id) {
        document.querySelectorAll('.card.script-playing').forEach(el =>
          el.classList.remove('script-playing')
        );
        const card = document.getElementById('card-' + id);
        if (!card) return;
        card.classList.add('script-playing');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Builds the spoken queue for a list of questions, following the same
      // structure as the podcast scripts: number → question → svar → gjenta →
      // each follow-up's own question → svar → gjenta.
      function _buildScriptQueue(qs) {
        const queue = [];
        qs.forEach((q, i) => {
          const num = NUMBER_WORDS_NO[i + 1] || String(i + 1);
          const myAnswer = document.getElementById('ans-' + q.id)?.value || '';
          const answerText = myAnswer.trim() || q.a || '';

          queue.push({ text: `Spørsmål nummer ${num}.`, highlight: q.id, pause: SLNC_LINE });
          _pushSentences(queue, q.q, SLNC_SECTION);

          if (answerText) {
            queue.push({ text: 'Svar.', pause: SLNC_LINE });
            _pushSentences(queue, answerText, SLNC_SECTION);
            queue.push({ text: 'Gjenta svaret.', pause: SLNC_LINE });
            _pushSentences(queue, answerText, SLNC_SECTION);
          }

          const followUps = state.followUps?.[q.id] || [];
          followUps.forEach(fu => {
            const fuId = `${q.id}-f${followUps.indexOf(fu)}`;
            const myFuAnswer = document.getElementById('ans-' + fuId)?.value || '';
            const fuAnswerText = myFuAnswer.trim() || fu.a || '';

            queue.push({ text: 'Oppfølgingsspørsmål.', pause: SLNC_LINE });
            _pushSentences(queue, fu.q, SLNC_SECTION);
            if (fuAnswerText) {
              queue.push({ text: 'Svar.', pause: SLNC_LINE });
              _pushSentences(queue, fuAnswerText, SLNC_SECTION);
              queue.push({ text: 'Gjenta.', pause: SLNC_LINE });
              _pushSentences(queue, fuAnswerText, SLNC_SECTION);
            }
          });

          queue.push({ text: '', pause: SLNC_SECTION });
        });
        return queue;
      }

      // Plays the currently-filtered question list (same filters as the Questions
      // tab: category / exam type / status / search) as one continuous script.
      function playFullScript() {
        if (!_scriptStopped) {
          if (_scriptPaused) resumeFullScript();
          else pauseFullScript();
          return;
        }

        const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
        let qs = allQuestions();
        if (state.activeCat !== 'all') qs = qs.filter(q => q.cat === state.activeCat);
        if (state.activeExamType !== 'all') qs = qs.filter(q => q.examType === state.activeExamType);
        if (state.activeStatus !== 'all') {
          qs = qs.filter(q => (state.status[q.id] || 'new') === state.activeStatus);
        }
        if (search) {
          qs = qs.filter(
            q => q.q.toLowerCase().includes(search) || (q.a || '').toLowerCase().includes(search)
          );
        }
        if (!qs.length) return;

        window.speechSynthesis.cancel();
        _scriptQueue = _buildScriptQueue(qs);
        _scriptIndex = 0;
        _scriptStopped = false;
        _scriptPaused = false;
        _scriptRunId++;
        _updatePlayScriptButton();
        _runScriptQueue(_scriptRunId);
      }

      function pauseFullScript() {
        if (_scriptStopped || _scriptPaused) return;
        _scriptPaused = true;
        _scriptRunId++; // invalidates in-flight speak/pause promises
        window.speechSynthesis.cancel();
        _updatePlayScriptButton();
      }

      function resumeFullScript() {
        if (_scriptStopped || !_scriptPaused) return;
        _scriptPaused = false;
        _scriptRunId++;
        _updatePlayScriptButton();
        _runScriptQueue(_scriptRunId);
      }

      function stopFullScript() {
        _scriptStopped = true;
        _scriptPaused = false;
        _scriptIndex = 0;
        _scriptQueue = [];
        _scriptRunId++;
        window.speechSynthesis.cancel();
        document.querySelectorAll('.card.script-playing').forEach(el =>
          el.classList.remove('script-playing')
        );
        _updatePlayScriptButton();
      }

      // Jumps forward/backward by one queue step (roughly one sentence/label) and
      // keeps playing from there — works whether currently playing or paused.
      function _seekScript(delta) {
        if (_scriptStopped || !_scriptQueue.length) return;
        _scriptIndex = Math.max(0, Math.min(_scriptQueue.length - 1, _scriptIndex + delta));
        _scriptRunId++;
        window.speechSynthesis.cancel();
        if (!_scriptPaused) _runScriptQueue(_scriptRunId);
      }

      function skipScriptForward() {
        _seekScript(1);
      }

      function skipScriptBackward() {
        _seekScript(-1);
      }

      function _updatePlayScriptButton() {
        const btn = document.getElementById('playScriptBtn');
        if (btn) {
          btn.textContent = _scriptStopped ? '▶ Play' : _scriptPaused ? '▶ Resume' : '⏸ Pause';
          btn.classList.toggle('btn-primary', _scriptStopped || _scriptPaused);
          btn.classList.toggle('btn-danger', !_scriptStopped && !_scriptPaused);
        }
        const controls = document.getElementById('scriptControls');
        if (controls) controls.classList.toggle('hidden', _scriptStopped);
      }


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
      const SLNC_WORD = 250;
      const SLNC_WORD_REPEAT = 150;
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
      // paused `wordPause` apart) so playback reads deliberately, word by word.
      // The last word of each sentence pauses SLNC_LINE instead, and the last
      // word of the last sentence pauses `endPause` (section gap).
      function _pushSentences(queue, text, endPause, highlight, wordPause) {
        const sentences = _splitSentences(text);
        let firstWordOfText = true;
        sentences.forEach((sentence, si) => {
          const isLastSentence = si === sentences.length - 1;
          const words = sentence.split(/\s+/).filter(Boolean);
          words.forEach((word, wi) => {
            const isLastWord = wi === words.length - 1;
            const pause = isLastWord ? (isLastSentence ? endPause : SLNC_LINE) : (wordPause || SLNC_WORD);
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
          _updateSeekBar();
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
            _pushSentences(queue, answerText, SLNC_SECTION, undefined, SLNC_WORD_REPEAT);
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
              _pushSentences(queue, fuAnswerText, SLNC_SECTION, undefined, SLNC_WORD_REPEAT);
            }
          });

          queue.push({ text: '', pause: SLNC_SECTION });
        });
        return queue;
      }

      // Plays the currently-filtered question list (same filters as the Questions
      // tab: category / exam type / status / search) as one continuous script.
      // Pass an explicit `qsOverride` (e.g. favouriteQuestions()) to bypass the
      // Questions-tab filters entirely and play that list instead.
      function playFullScript(qsOverride) {
        if (!_scriptStopped) {
          if (_scriptPaused) resumeFullScript();
          else pauseFullScript();
          return;
        }

        let qs;
        if (qsOverride) {
          qs = qsOverride;
        } else {
          const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
          qs = allQuestions();
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
        }
        if (!qs.length) return;

        window.speechSynthesis.cancel();
        _scriptQueue = _buildScriptQueue(qs);
        _scriptIndex = 0;
        _scriptStopped = false;
        _scriptPaused = false;
        _scriptRunId++;
        _updatePlayScriptButton();
        _updateSeekBar();
        _runScriptQueue(_scriptRunId);
      }

      // Play/pause/resume the favourites list specifically — shares the same
      // engine/state as playFullScript() so Stop/seek controls work identically.
      function playFavouritesScript() {
        playFullScript(_scriptStopped ? favouriteQuestions() : undefined);
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
        _updateSeekBar();
      }

      // Jumps to an exact queue index (from dragging/clicking the seek bar) and
      // keeps playing from there — works whether currently playing or paused.
      function seekScriptTo(newIndex) {
        if (_scriptStopped || !_scriptQueue.length) return;
        _scriptIndex = Math.max(0, Math.min(_scriptQueue.length - 1, +newIndex));
        _scriptRunId++;
        const runId = _scriptRunId;
        window.speechSynthesis.cancel();
        _updateSeekBar();
        // speak() called synchronously right after cancel() can be silently
        // dropped in some browsers (notably Chrome) — defer to the next tick
        // so the cancel fully completes first.
        if (!_scriptPaused) setTimeout(() => _runScriptQueue(runId), 50);
      }

      // Updates only the seek bar's displayed value/label while dragging,
      // without interrupting playback — the actual jump happens on release
      // (oninput vs onchange on the <input type="range">).
      function seekScriptPreview(previewIndex, labelId) {
        const label = document.getElementById(labelId || 'scriptSeekLabel');
        if (label) label.textContent = `${+previewIndex + 1} / ${_scriptQueue.length}`;
      }

      // Both the Questions tab and Favourites tab have their own copy of these
      // play/seek controls (favXxx IDs), sharing the same underlying script
      // engine/state — updates apply to whichever set is present in the DOM.
      function _updateSeekBar() {
        [['scriptSeekBar', 'scriptSeekLabel'], ['favScriptSeekBar', 'favScriptSeekLabel']].forEach(([barId, labelId]) => {
          const bar = document.getElementById(barId);
          const label = document.getElementById(labelId);
          if (bar) {
            bar.max = Math.max(0, _scriptQueue.length - 1);
            bar.value = _scriptIndex;
          }
          if (label) label.textContent = `${_scriptQueue.length ? _scriptIndex + 1 : 0} / ${_scriptQueue.length}`;
        });
      }

      function _updatePlayScriptButton() {
        [['playScriptBtn', 'scriptControls'], ['favPlayScriptBtn', 'favScriptControls']].forEach(([btnId, controlsId]) => {
          const btn = document.getElementById(btnId);
          if (btn) {
            btn.textContent = _scriptStopped ? '▶ Play' : _scriptPaused ? '▶ Resume' : '⏸ Pause';
            btn.classList.toggle('btn-primary', _scriptStopped || _scriptPaused);
            btn.classList.toggle('btn-danger', !_scriptStopped && !_scriptPaused);
          }
          const controls = document.getElementById(controlsId);
          if (controls) controls.classList.toggle('hidden', _scriptStopped);
        });
      }


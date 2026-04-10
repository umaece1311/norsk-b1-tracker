      // ─── PRONUNCIATION — full free implementation ─────────────────────────────────
      // Uses: MediaRecorder (audio capture/playback) + Web Speech API (transcription)
      // + Web Audio API (live waveform) — all 100% free, no API key needed.

      const _pron = {}; // per-question state: { mediaRec, audioChunks, recognition, audioUrl, animFrame, audioCtx, analyser }

      // Norwegian phonetic tips for commonly mispronounced words
      const NO_PHONETIC = {
        jeg: {
          ipa: '/jæɪ/',
          tip: 'sounds like "yai" — the J is like English Y',
        },
        ikke: {
          ipa: '/ɪkə/',
          tip: '"ik-keh" — short sharp K, ends with a soft e',
        },
        og: {
          ipa: '/ɔ/',
          tip: 'just "oh" — the G is silent in everyday speech',
        },
        hva: {
          ipa: '/va/',
          tip: '"va" — H is silent, sounds like English "va"',
        },
        hvem: { ipa: '/vem/', tip: '"vem" — H is silent before V' },
        hvor: { ipa: '/vor/', tip: '"vor" — H is silent, R is soft' },
        gjøre: { ipa: '/jøːrə/', tip: '"yø-reh" — GJ sounds like Y' },
        kjøre: { ipa: '/çøːrə/', tip: '"shø-reh" — KJ is a soft SH sound' },
        skjønne: { ipa: '/ʃønə/', tip: '"shøn-neh" — SKJ = SH sound' },
        lære: { ipa: '/læːrə/', tip: '"læ-reh" — soft rolling R' },
        være: {
          ipa: '/væːrə/',
          tip: '"væ-reh" — very common word, practise it!',
        },
        snakke: { ipa: '/snakə/', tip: '"snak-keh" — both K\'s pronounced' },
        norsk: {
          ipa: '/nɔʂk/',
          tip: '"norshk" — RS makes a retroflex SH sound',
        },
        fordi: { ipa: '/fɔɖiː/', tip: '"for-dee" — stress on second syllable' },
        derfor: {
          ipa: '/dærfɔr/',
          tip: '"dær-for" — stress on first syllable',
        },
        egentlig: {
          ipa: '/eːɡənliː/',
          tip: '"ee-en-lee" — G is often silent here',
        },
        selvfølgelig: {
          ipa: '/selfølɡəliː/',
          tip: '"self-føl-e-lee" — 5 syllables!',
        },
        kanskje: { ipa: '/kaɲʃə/', tip: '"kan-sheh" — ends with a soft SH' },
        spørsmål: {
          ipa: '/spøʂmoːl/',
          tip: '"spørs-mål" — RS = retroflex sound',
        },
        utdanning: {
          ipa: '/ʉtdanɪŋ/',
          tip: '"oot-dan-ing" — U sounds like "oo"',
        },
        hjelpe: { ipa: '/jelpə/', tip: '"yel-peh" — HJ sounds like Y' },
        hjem: { ipa: '/jem/', tip: '"yem" — HJ sounds like Y' },
        gjennom: { ipa: '/jenɔm/', tip: '"yen-om" — GJ sounds like Y' },
        yrke: {
          ipa: '/yrkə/',
          tip: '"yyr-keh" — Y is a vowel sound like "ee" with rounded lips',
        },
        ønsker: { ipa: '/ønskər/', tip: '"ønsk-er" — Ø is like French EU' },
        gjerne: { ipa: '/jærnə/', tip: '"yær-neh" — GJ = Y sound' },
      };

      function togglePronunciation(id) {
        const box = document.getElementById('pron-' + id);
        box.classList.toggle('hidden');
        // Auto-scan devices when box is opened so Bluetooth headset appears immediately
        if (!box.classList.contains('hidden')) {
          populatePronMic(id);
        }
      }

      async function startRecording(id) {
        // Check speech recognition support
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const hasSR = !!SR;

        // Request microphone
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(getMicConstraints());
        } catch (err) {
          document.getElementById('recStatus-' + id).textContent =
            '❌ Microphone access denied. Please allow microphone in your browser.';
          return;
        }

        // Init per-question state
        _pron[id] = { audioChunks: [], transcript: '', interimTranscript: '' };

        // ── 1. MediaRecorder — captures raw audio ──────────────────────────
        const mr = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : 'audio/ogg',
        });
        _pron[id].mediaRec = mr;
        _pron[id].stream = stream;

        mr.ondataavailable = e => {
          if (e.data.size > 0) _pron[id].audioChunks.push(e.data);
        };
        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(_pron[id].audioChunks, { type: mr.mimeType });
          const url = URL.createObjectURL(blob);
          _pron[id].audioUrl = url;
          // Show playback player
          const player = document.getElementById('audioPlayer-' + id);
          if (player) {
            player.src = url;
            applyAudioOutput(player);
          }
          document.getElementById('audioPlayback-' + id).classList.add('show');
          document.getElementById('replayBtn-' + id).style.display = '';
          document.getElementById('clearRecBtn-' + id).style.display = '';
          stopWaveform(id);
          // Show pronunciation result using collected transcript
          if (_pron[id].transcript) {
            showPronunciationResult(id, _pron[id].transcript);
          } else {
            document.getElementById('recStatus-' + id).textContent = hasSR
              ? '⚠️ No speech detected. Try speaking clearly and closer to the mic.'
              : '🎧 Recording saved! (Speech recognition unavailable — use playback to review)';
          }
        };
        mr.start(100); // collect data every 100ms

        // ── 2. Web Audio API — live waveform ──────────────────────────────
        startWaveform(id, stream);

        // ── 3. SpeechRecognition — continuous transcription ───────────────
        if (hasSR) {
          const rec = new SR();
          rec.lang = 'nb-NO';
          rec.continuous = true;
          rec.interimResults = true;
          _pron[id].recognition = rec;

          rec.onresult = e => {
            let interim = '',
              final = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const t = e.results[i][0].transcript;
              if (e.results[i].isFinal) {
                final += t + ' ';
              } else {
                interim += t;
              }
            }
            _pron[id].transcript += final;
            _pron[id].interimTranscript = interim;
            const interimEl = document.getElementById('interim-' + id);
            if (interimEl)
              interimEl.textContent =
                (_pron[id].transcript + interim).trim() || '…listening';
          };
          rec.onerror = e => {
            if (e.error !== 'no-speech') {
              document.getElementById('recStatus-' + id).textContent =
                '⚠️ Recognition: ' + e.error + ' (audio still recording)';
            }
          };
          try {
            rec.start();
          } catch (e) {
            /* may already be started */
          }
        }

        // Update UI
        document
          .getElementById('recBtn-' + id)
          .classList.add('hidden', 'recording-active');
        document.getElementById('stopBtn-' + id).classList.remove('hidden');
        document.getElementById('recStatus-' + id).textContent =
          '🔴 Recording… speak your answer in Norwegian. Press Stop when done.';
        document.getElementById('recResult-' + id).innerHTML = '';
        document.getElementById('phoneticTips-' + id).classList.remove('show');
        document.getElementById('audioPlayback-' + id).classList.remove('show');
      }

      function stopRecording(id) {
        const p = _pron[id];
        if (!p) return;
        // Stop speech recognition first so final results flush
        if (p.recognition) {
          try {
            p.recognition.stop();
          } catch (e) {}
        }
        // Stop media recorder (triggers onstop → show player + result)
        if (p.mediaRec && p.mediaRec.state !== 'inactive') {
          p.mediaRec.stop();
        }
        document
          .getElementById('recBtn-' + id)
          .classList.remove('hidden', 'recording-active');
        document.getElementById('stopBtn-' + id).classList.add('hidden');
        document.getElementById('recStatus-' + id).textContent =
          '⏳ Processing…';
        document.getElementById('interim-' + id).textContent = '';
      }

      function replayRecording(id) {
        const player = document.getElementById('audioPlayer-' + id);
        if (player) {
          player.currentTime = 0;
          player.play();
        }
      }

      function clearRecording(id) {
        if (_pron[id]?.audioUrl) URL.revokeObjectURL(_pron[id].audioUrl);
        _pron[id] = null;
        document.getElementById('audioPlayback-' + id).classList.remove('show');
        document.getElementById('replayBtn-' + id).style.display = 'none';
        document.getElementById('clearRecBtn-' + id).style.display = 'none';
        document.getElementById('recResult-' + id).innerHTML = '';
        document.getElementById('phoneticTips-' + id).classList.remove('show');
        document.getElementById('recStatus-' + id).textContent =
          'Click ⏺ Start Recording, then speak your answer in Norwegian';
        document.getElementById('interim-' + id).textContent = '';
      }

      // Speak reference text (sample answer or written answer) using Norwegian TTS
      function speakReferenceFor(id) {
        const qs = allQuestions();
        const q = qs.find(q => q.id === id);
        const text =
          document.getElementById('ans-' + id)?.value?.trim() ||
          q?.a ||
          q?.q ||
          '';
        if (!text) {
          alert('No text to speak.');
          return;
        }
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = 'nb-NO';
        utt.rate = 0.85;
        const voices = window.speechSynthesis.getVoices();
        const norVoice = voices.find(
          v => v.lang.startsWith('nb') || v.lang.startsWith('no')
        );
        if (norVoice) utt.voice = norVoice;
        window.speechSynthesis.speak(utt);
      }

      // ── Waveform (Web Audio API) ──────────────────────────────────────────────────
      function startWaveform(id, stream) {
        const wrap = document.getElementById('waveWrap-' + id);
        const canvas = document.getElementById('waveCanvas-' + id);
        if (!wrap || !canvas) return;
        wrap.classList.add('active');
        canvas.width = wrap.offsetWidth || 400;

        const ctx = canvas.getContext('2d');
        const audioCtx = new (
          window.AudioContext || window.webkitAudioContext
        )();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        _pron[id] = _pron[id] || {};
        _pron[id].audioCtx = audioCtx;
        _pron[id].analyser = analyser;

        const bufLen = analyser.frequencyBinCount;
        const dataArr = new Uint8Array(bufLen);

        function draw() {
          _pron[id].animFrame = requestAnimationFrame(draw);
          analyser.getByteTimeDomainData(dataArr);
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#a78bfa';
          ctx.beginPath();
          const sliceW = canvas.width / bufLen;
          let x = 0;
          for (let i = 0; i < bufLen; i++) {
            const v = dataArr[i] / 128;
            const y = (v * canvas.height) / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceW;
          }
          ctx.lineTo(canvas.width, canvas.height / 2);
          ctx.stroke();
        }
        draw();
      }

      function stopWaveform(id) {
        const p = _pron[id];
        if (!p) return;
        if (p.animFrame) cancelAnimationFrame(p.animFrame);
        if (p.audioCtx) {
          try {
            p.audioCtx.close();
          } catch (e) {}
        }
        const wrap = document.getElementById('waveWrap-' + id);
        if (wrap) wrap.classList.remove('active');
      }

      // ── Pronunciation result + phonetic tips ─────────────────────────────────────
      function showPronunciationResult(id, spoken) {
        const qs = allQuestions();
        const q = qs.find(q => q.id === id);
        const reference = (
          document.getElementById('ans-' + id)?.value?.trim() ||
          q?.a ||
          ''
        ).toLowerCase();
        const spokenLower = spoken.trim().toLowerCase();

        const clean = w => w.replace(/[.,!?;:«»""'']/g, '').trim();
        const refWords = reference
          .split(/\s+/)
          .filter(Boolean)
          .map(clean)
          .filter(Boolean);
        const spokenWords = spokenLower
          .split(/\s+/)
          .filter(Boolean)
          .map(clean)
          .filter(Boolean);

        // Greedy word match (allows fuzzy: exact match OR ≥80% char similarity)
        const matchedRef = new Set();
        const matchedSpk = new Set();
        spokenWords.forEach((sw, si) => {
          const idx = refWords.findIndex(
            (rw, ri) => !matchedRef.has(ri) && wordSim(sw, rw) >= 0.8
          );
          if (idx >= 0) {
            matchedRef.add(idx);
            matchedSpk.add(si);
          }
        });

        const score =
          refWords.length > 0
            ? Math.round((matchedRef.size / refWords.length) * 100)
            : 0;
        const missed = refWords.filter((_, i) => !matchedRef.has(i));

        const scoreColor =
          score >= 80 ? '#16a34a' : score >= 55 ? '#d97706' : '#dc2626';
        const scoreMsg =
          score >= 80
            ? '🎉 Excellent!'
            : score >= 55
              ? '👍 Good — keep practising!'
              : "💪 Keep going — you're learning!";

        let html = `
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:8px">
            <div>
              <div class="pron-score" style="color:${scoreColor}">${score}%</div>
              <div style="font-size:0.78rem;color:${scoreColor};font-weight:600">${scoreMsg}</div>
            </div>
            <div style="flex:1">
              <div class="pron-score-bar"><div class="pron-score-fill" style="width:${score}%;background:${scoreColor}"></div></div>
              <div style="font-size:0.75rem;color:#888;margin-top:2px">${matchedRef.size} of ${refWords.length} words recognised</div>
            </div>
          </div>
          <div style="font-size:0.8rem;color:#555;margin-bottom:8px;padding:6px 10px;background:#f9fafb;border-radius:6px;border-left:3px solid #d8b4fe">
            <strong style="color:#7c3aed">You said:</strong> ${spoken || '(no speech detected)'}
          </div>
          <div style="font-size:0.8rem;font-weight:700;color:#374151;margin-bottom:6px">Word-by-word analysis:</div>
          <div class="word-diff">`;

        refWords.forEach((w, i) => {
          if (matchedRef.has(i)) html += `<span class="word-ok">✅ ${w}</span>`;
          else html += `<span class="word-miss">❌ ${w}</span>`;
        });
        spokenWords.forEach((w, i) => {
          if (!matchedSpk.has(i))
            html += `<span class="word-extra">🔸 ${w}</span>`;
        });
        html += `</div>`;

        if (missed.length > 0) {
          html += `<div style="font-size:0.78rem;color:#dc2626;margin-top:8px;padding:6px 10px;background:#fef2f2;border-radius:6px">
            <strong>Missed / unclear:</strong> ${missed.join(', ')}
          </div>`;
        }

        html += `<div style="font-size:0.75rem;color:#888;margin-top:10px">
          ✅ Correct &nbsp;|&nbsp; ❌ Missed/mispronounced &nbsp;|&nbsp; 🔸 Extra words you said
          <br>💡 Tip: Press <strong>🔊 Hear correct Norwegian pronunciation</strong> then compare with your recording.
        </div>`;

        document.getElementById('recResult-' + id).innerHTML = html;
        document.getElementById('recStatus-' + id).textContent =
          '✅ Analysis complete! See results below.';

        // Phonetic tips for recognised problem words
        showPhoneticTips(id, [...refWords, ...spokenWords]);
      }

      function wordSim(a, b) {
        if (a === b) return 1;
        if (!a || !b) return 0;
        // Levenshtein-based similarity
        const m = a.length,
          n = b.length;
        const dp = Array.from({ length: m + 1 }, (_, i) =>
          Array.from({ length: n + 1 }, (_, j) =>
            j === 0 ? i : i === 0 ? j : 0
          )
        );
        for (let i = 1; i <= m; i++)
          for (let j = 1; j <= n; j++)
            dp[i][j] =
              a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        return 1 - dp[m][n] / Math.max(m, n);
      }

      function showPhoneticTips(id, words) {
        const tips = words
          .map(w => w.toLowerCase().replace(/[.,!?;:]/g, ''))
          .filter((w, i, a) => a.indexOf(w) === i)
          .filter(w => NO_PHONETIC[w])
          .map(w => ({ word: w, ...NO_PHONETIC[w] }));

        if (!tips.length) return;
        const el = document.getElementById('phoneticTips-' + id);
        el.innerHTML =
          `<strong>📖 Norwegian pronunciation tips for words in your answer:</strong>` +
          tips
            .map(
              t => `<div class="phonetic-tip-item">
            <span><strong>${t.word}</strong> <span style="color:#b45309;font-family:monospace">${t.ipa}</span></span>
            <span style="color:#92400e;max-width:60%;text-align:right">${t.tip}</span>
          </div>`
            )
            .join('');
        el.classList.add('show');
      }


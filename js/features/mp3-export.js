      // ─── MP3 EXPORT (Google Cloud Text-to-Speech) ───────────────────────────────────
      // Generates downloadable MP3 audio for questions/answers using the Google Cloud
      // TTS API. Requires state.googleTtsKey (reused as the Google Cloud API key —
      // see js/ui/modal.js). Standard voices are free for 4M characters/month.
      const GOOGLE_TTS_VOICE = 'nb-NO-Standard-A';
      const GOOGLE_TTS_LANG = 'nb-NO';

      function hasGoogleTtsKey() {
        return !!(state.googleTtsKey && state.googleTtsKey.trim());
      }

      function _base64ToBlob(base64, mimeType) {
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        return new Blob([bytes], { type: mimeType });
      }

      // Calls Google Cloud TTS for one chunk of text, returns a Blob (audio/mpeg).
      async function synthesizeMp3Blob(text, voiceName) {
        const key = state.googleTtsKey;
        if (!key) throw new Error('No Google Cloud API key set.');
        const res = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { text },
              voice: { languageCode: GOOGLE_TTS_LANG, name: voiceName || GOOGLE_TTS_VOICE },
              audioConfig: { audioEncoding: 'MP3', speakingRate: 0.85 },
            }),
          }
        );
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`Google TTS error ${res.status}: ${errText.slice(0, 200)}`);
        }
        const data = await res.json();
        if (!data.audioContent) throw new Error('Google TTS returned no audio.');
        return _base64ToBlob(data.audioContent, 'audio/mpeg');
      }

      // MP3 frames concatenate cleanly — joining raw bytes of sequential MP3 files
      // produces one continuous, playable MP3.
      async function concatMp3Blobs(blobs) {
        const buffers = await Promise.all(blobs.map(b => b.arrayBuffer()));
        return new Blob(buffers, { type: 'audio/mpeg' });
      }

      function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      // Builds the list of spoken text chunks for one question: question, then the
      // answer read once. Mirrors the structure used by the live playback engine.
      function _mp3ChunksForQuestion(q) {
        const chunks = [];
        chunks.push(q.q);
        const myAnswer = document.getElementById('ans-' + q.id)?.value?.trim();
        const answerText = myAnswer || q.a || '';
        if (answerText) chunks.push(answerText);
        return chunks;
      }

      // Downloads a single question+answer as one MP3 file.
      async function downloadQuestionMp3(id) {
        if (!hasGoogleTtsKey()) {
          showToast('⚠️ Add a Google Cloud TTS API key first (see settings) to enable MP3 export.');
          return;
        }
        const qs = allQuestions();
        const q = qs.find(q => q.id === id);
        if (!q) return;

        showToast('🎙 Generating MP3…');
        try {
          const chunks = _mp3ChunksForQuestion(q);
          const blobs = [];
          for (const chunk of chunks) {
            blobs.push(await synthesizeMp3Blob(chunk));
          }
          const finalBlob = await concatMp3Blobs(blobs);
          triggerDownload(finalBlob, `norsk-b1-question-${id}.mp3`);
          showToast('✅ MP3 downloaded!');
        } catch (e) {
          showToast('❌ MP3 export failed: ' + e.message);
        }
      }

      // Downloads the full currently-filtered question list (same filters as the
      // Questions tab) as one combined MP3 file.
      async function downloadFullScriptMp3() {
        if (!hasGoogleTtsKey()) {
          showToast('⚠️ Add a Google Cloud TTS API key first (see settings) to enable MP3 export.');
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
        if (!qs.length) {
          showToast('⚠️ No questions match the current filter.');
          return;
        }

        const btn = document.getElementById('downloadMp3Btn');
        try {
          const blobs = [];
          let done = 0;
          const totalChunks = qs.reduce((n, q) => n + _mp3ChunksForQuestion(q).length, 0);
          for (const q of qs) {
            for (const chunk of _mp3ChunksForQuestion(q)) {
              if (btn) btn.textContent = `🎙 Generating… (${done + 1}/${totalChunks})`;
              blobs.push(await synthesizeMp3Blob(chunk));
              done++;
            }
          }
          const finalBlob = await concatMp3Blobs(blobs);
          const scope = state.activeCat === 'all' ? 'all-categories' : state.activeCat;
          triggerDownload(finalBlob, `norsk-b1-${scope}.mp3`);
          showToast('✅ Full MP3 downloaded!');
        } catch (e) {
          showToast('❌ MP3 export failed: ' + e.message);
        } finally {
          if (btn) btn.textContent = '🎧 Download Full MP3';
        }
      }

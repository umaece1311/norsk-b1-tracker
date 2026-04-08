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


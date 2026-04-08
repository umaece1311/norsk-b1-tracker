      // ─── API KEY MODAL ────────────────────────────────────────────────────────────
      function updateAiKeyIndicator() {
        const el = document.getElementById('aiKeyStatus');
        if (!el) return;
        if (state.apiKey) {
          el.textContent = '✅ set';
          el.style.color = '#16a34a';
        } else {
          el.textContent = 'not set (optional)';
          el.style.color = '#9ca3af';
        }
      }
      function openApiModal() {
        document.getElementById('apiModal').classList.remove('hidden');
        document.getElementById('apiKeyInput').value = state.apiKey || '';
      }
      function closeApiModal() {
        document.getElementById('apiModal').classList.add('hidden');
      }
      function saveApiKey() {
        state.apiKey = document.getElementById('apiKeyInput').value.trim();
        localStorage.setItem('norsk-b1-apikey', state.apiKey);
        updateAiKeyIndicator();
        closeApiModal();
        showToast(
          state.apiKey
            ? '✅ API key saved! AI Grammar is now enabled.'
            : '✅ No key set — free features still work.'
        );
      }

      function saveInlineKey(id) {
        const input = document.getElementById('groq-key-inline-' + id);
        if (!input) return;
        const key = input.value.trim();
        if (!key) return;
        state.apiKey = key;
        localStorage.setItem('norsk-b1-apikey', key);
        showToast('✅ Groq key saved!');
        getGrammarFeedback(id);
      }
      function clearApiKey() {
        state.apiKey = '';
        localStorage.removeItem('norsk-b1-apikey');
        updateAiKeyIndicator();
        closeApiModal();
        showToast('🗑 API key removed. Free features still work perfectly.');
      }

      // Click outside modal to close
      document
        .getElementById('apiModal')
        .addEventListener('click', function (e) {
          if (e.target === this) closeApiModal();
        });


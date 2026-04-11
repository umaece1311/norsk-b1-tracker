      // ─── INIT ──────────────────────────────────────────────────────────────────────
      loadState();
      updateAiKeyIndicator();
      renderToday();
      renderSidebar();
      initAudioDevices();
      // Show review count badge on load
      const _reviewCount = Object.keys(state.reviewMarked || {}).length;
      const _reviewBadge = document.getElementById('badge-review');
      if (_reviewBadge && _reviewCount) _reviewBadge.textContent = _reviewCount;

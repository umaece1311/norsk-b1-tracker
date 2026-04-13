      // ─── AUDIO DEVICE MANAGER ────────────────────────────────────────────────────
      // Handles Bluetooth headset / audio device selection for microphone input
      // and speaker output. Uses MediaDevices API + HTMLMediaElement.setSinkId.
      // Chrome/Edge: full support. Firefox/Safari: mic only.

      let _selectedMicId = null;
      let _selectedSpeakerId = null;
      let _cachedMics = [];
      let _cachedSpeakers = [];

      // Called on page load — registers devicechange listener and silently tries
      // to enumerate devices if permission was already granted previously.
      function initAudioDevices() {
        if (!navigator.mediaDevices) return;
        _selectedMicId = localStorage.getItem('norsk_micId') || null;
        navigator.mediaDevices.addEventListener('devicechange', () => {
          _enumerateAndPopulate(true);
        });
        // Try silent enumeration (no permission prompt) — gives labelled list if
        // mic permission was already granted in a previous session.
        navigator.mediaDevices.enumerateDevices().then(devices => {
          const mics = devices.filter(d => d.kind === 'audioinput');
          // Only populate if we got real labels (i.e. permission already granted)
          if (mics.some(d => d.label)) {
            _cachedMics = mics;
            _cachedSpeakers = devices.filter(d => d.kind === 'audiooutput');
            _populateAll();
          }
        }).catch(() => {});
      }

      // Full scan: requests mic permission if needed, then enumerates all devices.
      // Called by "↻ Scan Devices" button or by populatePronMic().
      async function refreshAudioDevices(silent) {
        const statusEl = document.getElementById('audioDeviceStatus');
        if (statusEl && !silent) statusEl.textContent = 'Scanning…';

        try {
          const temp = await navigator.mediaDevices.getUserMedia({ audio: true });
          temp.getTracks().forEach(t => t.stop());
        } catch (e) {
          if (statusEl) statusEl.textContent = '❌ Mic permission denied';
          return;
        }

        await _enumerateAndPopulate(silent);
      }

      async function _enumerateAndPopulate(silent) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        _cachedMics     = devices.filter(d => d.kind === 'audioinput');
        _cachedSpeakers = devices.filter(d => d.kind === 'audiooutput');
        _populateAll();

        const statusEl = document.getElementById('audioDeviceStatus');
        if (statusEl && !silent) {
          statusEl.textContent = `${_cachedMics.length} mic(s) found`;
        }
      }

      // Populate sidebar select + all open pronMicSelects with current device list
      function _populateAll() {
        _fillSelect(document.getElementById('micSelect'), _cachedMics);
        document.querySelectorAll('select[id^="pronMicSelect-"]').forEach(sel => {
          _fillSelect(sel, _cachedMics);
        });
        _populateSpeakerSelect();
      }

      function _fillSelect(sel, mics) {
        if (!sel) return;
        const prev = _selectedMicId || '';
        // Always keep "Default" as first option so user consciously picks Bluetooth
        sel.innerHTML = '<option value="">🎙 Default (system mic)</option>'
          + mics
              .filter(d => d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications')
              .map(d => `<option value="${d.deviceId}">${d.label || 'Microphone'}</option>`)
              .join('');
        // Restore previous selection if still available
        if (prev && sel.querySelector(`option[value="${prev}"]`)) {
          sel.value = prev;
        } else {
          sel.value = '';
          _selectedMicId = null;
        }
      }

      function _populateSpeakerSelect() {
        const wrap = document.getElementById('speakerSelectWrap');
        const sel  = document.getElementById('speakerSelect');
        if (!sel || !wrap) return;
        const supported = typeof document.createElement('audio').setSinkId === 'function';
        if (!supported || _cachedSpeakers.length === 0) {
          wrap.style.display = 'none';
          return;
        }
        wrap.style.display = '';
        const prev = _selectedSpeakerId || sel.value;
        sel.innerHTML = _cachedSpeakers
          .map((d, i) => `<option value="${d.deviceId}">${d.label || 'Speaker ' + (i + 1)}</option>`)
          .join('');
        if (prev && sel.querySelector(`option[value="${prev}"]`)) sel.value = prev;
        if (!_selectedSpeakerId) _selectedSpeakerId = sel.value || null;
      }

      // Called when a pronMicSelect dropdown changes — syncs all other selects too
      function syncAllMicSelects(val) {
        _selectedMicId = val || null;
        localStorage.setItem('norsk_micId', val || '');
        document.getElementById('micSelect') && (document.getElementById('micSelect').value = val);
        document.querySelectorAll('select[id^="pronMicSelect-"]').forEach(sel => {
          sel.value = val;
        });
      }

      // Called when the ↻ button next to a pronMicSelect is clicked — scans and
      // populates that card's select (and all others) with fresh device list.
      async function populatePronMic(id) {
        const btn = document.querySelector(`#pron-${id} .mic-selector-btn`);
        if (btn) btn.textContent = '…';
        await refreshAudioDevices(true);
        if (btn) btn.textContent = '↻';
      }

      function onMicChange(val) {
        _selectedMicId = val || null;
        localStorage.setItem('norsk_micId', val || '');
      }

      function onSpeakerChange(val) {
        _selectedSpeakerId = val || null;
        document.querySelectorAll('audio[id^="audioPlayer-"]').forEach(el => {
          applyAudioOutput(el);
        });
      }

      function applyAudioOutput(audioEl) {
        if (!audioEl || typeof audioEl.setSinkId !== 'function') return;
        if (!_selectedSpeakerId) return;
        audioEl.setSinkId(_selectedSpeakerId).catch(e =>
          console.warn('setSinkId failed:', e)
        );
      }

      function getMicConstraints() {
        if (_selectedMicId) {
          // Use the specifically selected device (e.g. Bluetooth headset)
          return { audio: { deviceId: { ideal: _selectedMicId } } };
        }
        // No device selected — use system default
        return { audio: true };
      }

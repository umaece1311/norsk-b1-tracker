      // ─── TRANSLATION ──────────────────────────────────────────────────────────────
      // ─── TRANSLATION ENGINE — free, no API key ────────────────────────────────────
      // Primary:  Google Translate unofficial  (translate.googleapis.com) — reliable, no key
      // Fallback: MyMemory  (api.mymemory.translated.net)  — 5000 chars/day free
      // Both require no account or API key.

      const _transCache = {}; // cache[key] = translated string
      const _transTab = {}; // current active tab per question id

      // Split long text into sentence-based chunks under maxLen characters
      function splitIntoChunks(text, maxLen = 450) {
        if (text.length <= maxLen) return [text];
        const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
        const chunks = [];
        let current = '';
        for (const sentence of sentences) {
          if ((current + sentence).length <= maxLen) {
            current += sentence;
          } else {
            if (current.trim()) chunks.push(current.trim());
            if (sentence.length > maxLen) {
              // Single sentence too long: split at word boundaries
              const words = sentence.split(' ');
              current = '';
              for (const word of words) {
                if ((current + ' ' + word).trim().length <= maxLen) {
                  current = (current + ' ' + word).trim();
                } else {
                  if (current) chunks.push(current);
                  current = word;
                }
              }
            } else {
              current = sentence;
            }
          }
        }
        if (current.trim()) chunks.push(current.trim());
        return chunks.filter(Boolean);
      }

      function decodeHtmlEntities(text) {
        const el = document.createElement('textarea');
        el.innerHTML = text;
        return el.value;
      }

      // AbortController with timeout — works in all browsers
      function _fetchWithTimeout(url, ms) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), ms);
        return fetch(url, { signal: ctrl.signal })
          .then(r => { clearTimeout(timer); return r; })
          .catch(e => { clearTimeout(timer); throw e; });
      }

      async function freeTranslateChunk(text, from, to) {
        const key = `${from}|${to}|${text}`;
        if (_transCache[key]) return { text: _transCache[key], api: 'cache' };

        // ── 1. Google Translate (unofficial, no key, CORS-friendly) ───────
        try {
          // Use 'nb' (Bokmål) for Norwegian — Google recognises it better
          const sl  = from === 'no' ? 'nb' : from;
          const tl  = to   === 'no' ? 'nb' : to;
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
          const r   = await _fetchWithTimeout(url, 7000);
          // Use .text() then JSON.parse for wider browser compatibility
          const raw = await r.text();
          const d   = JSON.parse(raw);
          if (Array.isArray(d) && Array.isArray(d[0])) {
            const translated = d[0]
              .map(seg => (Array.isArray(seg) ? seg[0] : '') || '')
              .join('');
            if (translated.trim()) {
              const decoded = decodeHtmlEntities(translated);
              _transCache[key] = decoded;
              return { text: decoded, api: 'Google' };
            }
          }
        } catch (e) {
          console.warn('[translate] Google failed:', e.message);
        }

        // ── 2. MyMemory (fallback, 5 000 chars/day anonymous) ─────────────
        try {
          const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
          const r   = await _fetchWithTimeout(url, 8000);
          const d   = await r.json();
          const t   = d.responseData?.translatedText || '';
          if (
            d.responseStatus === 200 &&
            t &&
            !t.includes('QUERY LENGTH LIMIT') &&
            !t.includes('MYMEMORY WARNING')
          ) {
            const decoded = decodeHtmlEntities(t);
            _transCache[key] = decoded;
            return { text: decoded, api: 'MyMemory' };
          }
        } catch (e) {
          console.warn('[translate] MyMemory failed:', e.message);
        }

        // ── 3. Lingva mirror (open-source Google proxy) ────────────────────
        try {
          const lFrom = from === 'no' ? 'nb' : from;
          const lTo   = to   === 'no' ? 'nb' : to;
          const url   = `https://lingva.thedaviddelta.com/api/v1/${lFrom}/${lTo}/${encodeURIComponent(text)}`;
          const r     = await _fetchWithTimeout(url, 8000);
          const d     = await r.json();
          if (d.translation) {
            const decoded = decodeHtmlEntities(d.translation);
            _transCache[key] = decoded;
            return { text: decoded, api: 'Lingva' };
          }
        } catch (e) {
          console.warn('[translate] Lingva failed:', e.message);
        }

        throw new Error('Translation unavailable. Try again in a moment.');
      }

      async function freeTranslate(text, from, to) {
        if (!text || !text.trim()) throw new Error('No text to translate.');
        const key = `${from}|${to}|${text}`;
        if (_transCache[key]) return { text: _transCache[key], api: 'cache' };

        const MAX_CHUNK = 450;
        if (text.length <= MAX_CHUNK) {
          return freeTranslateChunk(text, from, to);
        }

        // Long text: translate chunk by chunk and join
        const chunks = splitIntoChunks(text, MAX_CHUNK);
        const parts = [];
        let lastApi = 'MyMemory';
        for (const chunk of chunks) {
          const res = await freeTranslateChunk(chunk, from, to);
          parts.push(res.text);
          lastApi = res.api;
          // Small delay to avoid rate-limiting
          await new Promise(r => setTimeout(r, 150));
        }
        const combined = parts.join(' ');
        _transCache[key] = combined;
        return { text: combined, api: lastApi };
      }

      function toggleTransPanel(id) {
        const panel = document.getElementById('trans-' + id);
        const wasHidden = panel.classList.contains('hidden');
        panel.classList.toggle('hidden');
        if (wasHidden) {
          // Open to the last active tab, or default to 'q'
          switchTransTab(id, _transTab[id] || 'q');
        }
      }

      function switchTransTab(id, tab) {
        _transTab[id] = tab;
        // Update tab active state
        ['q', 'my', 'sa', 'en', 'vk'].forEach(t => {
          document
            .getElementById(`ttab-${t}-${id}`)
            ?.classList.toggle('active', t === tab);
        });
        renderTransBody(id, tab);
      }

      async function renderTransBody(id, tab) {
        const body = document.getElementById('trans-body-' + id);
        const qs = allQuestions();
        const q = qs.find(x => x.id === id);
        const myAns = document.getElementById('ans-' + id)?.value?.trim() || '';
        const sampleA = q?.a || '';
        const questionText = q?.q || '';

        // ── Compose tab (EN → NO) ────────────────────────────────────────
        if (tab === 'en') {
          body.innerHTML = `
            <div class="trans-compose">
              <label style="font-size:0.78rem;font-weight:700;color:#15803d;margin-bottom:6px;display:block">
                🇬🇧 Type in English — get Norwegian translation to use in your answer:
              </label>
              <textarea id="compose-src-${id}" placeholder="Type anything in English here…" rows="3" oninput="debounceCompose(${id})"></textarea>
              <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
                <button class="btn btn-green" onclick="runCompose(${id})">🔄 Translate to Norwegian</button>
                <span class="trans-api-badge" id="compose-badge-${id}"></span>
              </div>
              <div id="compose-result-${id}" class="trans-text-box result" style="margin-top:10px;min-height:48px;display:none"></div>
              <div style="font-size:0.72rem;color:#6b7280;margin-top:6px">
                💡 Use this to check how to say something in Norwegian before writing your answer.
              </div>
            </div>`;
          return;
        }

        // ── Word Lookup tab ──────────────────────────────────────────────
        if (tab === 'vk') {
          const text = myAns || sampleA || questionText;
          body.innerHTML = `
            <div>
              <div style="font-size:0.8rem;color:#15803d;font-weight:600;margin-bottom:8px">
                🔍 Click any word below to look it up instantly:
              </div>
              <div id="vocab-src-${id}" style="font-size:0.88rem;line-height:2.2;color:#1a2235">
                ${text ? makeClickableWords(id, text) : '<em style="color:#9ca3af">No text available — write your answer first.</em>'}
              </div>
              <div id="vocab-result-${id}" style="margin-top:10px"></div>
              ${myAns ? '' : `<div style="font-size:0.75rem;color:#9ca3af;margin-top:8px">Showing sample answer words. Write your own answer to look up your words.</div>`}
            </div>`;
          return;
        }

        // ── Translation tabs (q / my / sa) ──────────────────────────────
        const config = {
          q: {
            label: '🇳🇴 Question',
            src: questionText,
            empty: 'No question text.',
          },
          my: {
            label: '✏️ My Answer',
            src: myAns,
            empty: 'Write your answer first, then translate it here.',
          },
          sa: {
            label: '📖 Sample Answer',
            src: sampleA,
            empty: 'No sample answer for this question.',
          },
        };
        const { label, src, empty } = config[tab];

        if (!src) {
          body.innerHTML = `<div style="color:#9ca3af;font-size:0.85rem;padding:4px">${empty}</div>`;
          return;
        }

        body.innerHTML = `
          <div class="trans-pair">
            <div class="trans-col">
              <label>🇳🇴 Norwegian — ${label}</label>
              <div class="trans-text-box source" id="tsrc-${tab}-${id}">${escapeHtml(src)}</div>
            </div>
            <div class="trans-col">
              <label>🇬🇧 English Translation</label>
              <div class="trans-text-box loading" id="tres-${tab}-${id}">⏳ Translating…</div>
            </div>
          </div>
          <div class="trans-actions">
            <button class="trans-copy-btn" onclick="copyTranslation('tres-${tab}-${id}')">📋 Copy translation</button>
            <button class="trans-copy-btn" onclick="copyTranslation('tsrc-${tab}-${id}')">📋 Copy Norwegian</button>
            <span class="trans-api-badge" id="tapi-${tab}-${id}"></span>
          </div>`;

        try {
          const { text: translated, api } = await freeTranslate(
            src,
            'no',
            'en'
          );
          const resEl = document.getElementById(`tres-${tab}-${id}`);
          if (resEl) {
            resEl.className = 'trans-text-box result';
            resEl.textContent = translated;
          }
          const apiEl = document.getElementById(`tapi-${tab}-${id}`);
          if (apiEl) apiEl.textContent = `via ${api} · free`;
        } catch (err) {
          const resEl = document.getElementById(`tres-${tab}-${id}`);
          if (resEl) {
            resEl.className = 'trans-text-box error';
            resEl.textContent = '❌ ' + err.message;
          }
        }
      }

      // Compose: EN → NO
      let _composeTimer = null;
      function debounceCompose(id) {
        clearTimeout(_composeTimer);
        _composeTimer = setTimeout(() => runCompose(id), 800);
      }
      async function runCompose(id) {
        const src = document.getElementById('compose-src-' + id)?.value?.trim();
        const resEl = document.getElementById('compose-result-' + id);
        const badge = document.getElementById('compose-badge-' + id);
        if (!src || !resEl) return;
        resEl.style.display = 'block';
        resEl.className = 'trans-text-box loading';
        resEl.textContent = '⏳ Translating…';
        if (badge) badge.textContent = '';
        try {
          const { text, api } = await freeTranslate(src, 'en', 'no');
          resEl.className = 'trans-text-box result';
          resEl.textContent = text;
          if (badge) badge.textContent = `via ${api} · free`;
        } catch (err) {
          resEl.className = 'trans-text-box error';
          resEl.textContent = '❌ ' + err.message;
        }
      }

      // Word lookup: wrap each word in a clickable span
      function makeClickableWords(id, text) {
        return text
          .split(/(\s+)/)
          .map(token => {
            if (/\s+/.test(token)) return token;
            const word = token.replace(/[.,!?;:«»""'']/g, '');
            if (!word) return token;
            return `<span class="vocab-word" onclick="lookupWord(${id},'${word.replace(/'/g, "\\'")}',this)">${token}</span>`;
          })
          .join('');
      }

      async function lookupWord(id, word, spanEl) {
        // Remove any existing popup on this word
        spanEl.querySelectorAll('.vocab-popup').forEach(p => p.remove());
        const resEl = document.getElementById('vocab-result-' + id);
        if (resEl) {
          resEl.innerHTML = '⏳ Looking up <strong>' + word + '</strong>…';
        }
        try {
          const { text, api } = await freeTranslate(word, 'no', 'en');
          const popup = document.createElement('span');
          popup.className = 'vocab-popup';
          popup.textContent = text;
          spanEl.appendChild(popup);
          setTimeout(() => popup.remove(), 4000);
          if (resEl)
            resEl.innerHTML = `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;font-size:0.85rem">
            <strong style="color:#14532d">${word}</strong> → <span style="color:#15803d">${text}</span>
            <span style="font-size:0.7rem;color:#9ca3af;margin-left:8px">via ${api}</span>
          </div>`;
        } catch (err) {
          if (resEl)
            resEl.innerHTML = `<span style="color:#dc2626;font-size:0.8rem">❌ ${err.message}</span>`;
        }
      }

      function copyTranslation(elId) {
        const text = document.getElementById(elId)?.textContent || '';
        navigator.clipboard
          .writeText(text)
          .then(() => showToast('📋 Copied!'))
          .catch(() => {});
      }

      function escapeHtml(t) {
        return t
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }


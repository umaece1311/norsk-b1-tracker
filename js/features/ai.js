      // ─── AI GRAMMAR ───────────────────────────────────────────────────────────────
      async function analyseNorwegian(text) {
        const tips = [];
        const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
        const words = text.trim().split(/\s+/);
        const lower = text.toLowerCase();

        // ── Length check ──────────────────────────────────────────────
        if (words.length < 20) {
          tips.push({ type: 'warn', msg: '📝 <strong>Too short</strong> — try to write at least 4–5 sentences for a B1 answer. Aim for 40–60 words.' });
        } else if (words.length >= 40) {
          tips.push({ type: 'good', msg: '✅ <strong>Good length</strong> — your answer is well developed (' + words.length + ' words).' });
        }

        // ── Connectors / bindeord ─────────────────────────────────────
        const connectors = ['fordi','derfor','men','selv om','selv om','dessuten','i tillegg','for eksempel','imidlertid','likevel','derimot','når','hvis','etter at','før','mens'];
        const usedConn = connectors.filter(c => lower.includes(c));
        if (usedConn.length === 0) {
          tips.push({ type: 'tip', msg: '💡 <strong>Add connectors (bindeord)</strong> — use words like <em>fordi, men, derfor, for eksempel, i tillegg</em> to link your ideas naturally.' });
        } else {
          tips.push({ type: 'good', msg: '✅ <strong>Good connectors</strong> — you used: <em>' + usedConn.slice(0,3).join(', ') + '</em>.' });
        }

        // ── Verb second rule (V2) check ───────────────────────────────
        const v2violations = [];
        sentences.forEach(s => {
          const adverbs = ['i dag','i morgen','i går','nå','da','derfor','dessuten','likevel','etter det','først','så'];
          adverbs.forEach(adv => {
            if (s.toLowerCase().startsWith(adv + ' ')) {
              // After adverb, verb should come next (not subject)
              const rest = s.slice(adv.length).trim();
              const nextWord = rest.split(' ')[0].toLowerCase();
              const pronouns = ['jeg','du','han','hun','vi','dere','de','det','den'];
              if (pronouns.includes(nextWord)) {
                v2violations.push('"' + s.slice(0, 40) + '…"');
              }
            }
          });
        });
        if (v2violations.length > 0) {
          tips.push({ type: 'fix', msg: '⚠️ <strong>Verb-second rule (V2)</strong> — in Norwegian, when you start with an adverb the verb must come before the subject. E.g. <em>"I dag <u>jobber jeg</u>"</em> not <em>"I dag jeg jobber"</em>. Check: ' + v2violations[0] });
        }

        // ── Negation placement ────────────────────────────────────────
        if (/jeg ikke (er|var|har|kan|vil|skal|bor|liker|jobber|snakker)/i.test(text)) {
          tips.push({ type: 'fix', msg: '⚠️ <strong>Negation placement</strong> — "ikke" goes after the verb: <em>"Jeg <u>er ikke</u>"</em>, not "Jeg ikke er". Check your sentences with "ikke".' });
        }

        // ── Capital letters ───────────────────────────────────────────
        const capMistakes = ['Norsk','Engelsk','Arabisk','Spansk','Polsk','Norske','Norskk'].filter(w => {
          const re = new RegExp('(?<![.!?\n]\s)\b' + w + '\b');
          return re.test(text);
        });
        if (/\b(Norsk|Engelsk|Arabisk|Spansk|Polsk)\b/.test(text) && !/^(Norsk|Engelsk)/.test(text.trim())) {
          // Languages mid-sentence should be lowercase in Norwegian
        }

        // ── Variety of tenses ─────────────────────────────────────────
        const hasPast = /\b(var|hadde|fikk|gikk|kom|sa|gjorde|tok|visste|bodde|jobbet|lærte|reiste|spiste|drakk)\b/i.test(text);
        const hasFuture = /\b(skal|vil|kommer til å|håper å|planlegger)\b/i.test(text);
        const hasPresent = /\b(er|har|kan|vil|jobber|bor|liker|snakker|bruker|prøver)\b/i.test(text);
        const tenses = [hasPast && 'past', hasPresent && 'present', hasFuture && 'future'].filter(Boolean);
        if (tenses.length >= 2) {
          tips.push({ type: 'good', msg: '✅ <strong>Good tense variety</strong> — you used ' + tenses.join(' & ') + ' tense, which shows B1 fluency.' });
        } else if (words.length > 20) {
          tips.push({ type: 'tip', msg: '💡 <strong>Use more tenses</strong> — mix present, past (<em>var, hadde, gikk</em>) and future (<em>skal, vil</em>) to show B1 range.' });
        }

        // ── Personal examples / specificity ───────────────────────────
        const personal = /\b(jeg|min|mitt|mine|meg)\b/i.test(text);
        const hasExample = /for eksempel|som|blant annet|spesielt|særlig/i.test(text);
        if (!hasExample && words.length > 20) {
          tips.push({ type: 'tip', msg: '💡 <strong>Add a specific example</strong> — use <em>"for eksempel"</em> or <em>"spesielt"</em> to make your answer more concrete and interesting.' });
        }

        // ── Common spelling / word mistakes ───────────────────────────
        const common = [
          [/\bopptatt\b/gi, null, null],
          [/\btriives\b/gi, 'triives', 'trives'],
          [/\bjobb\b/gi, null, null],
          [/\bpå jobbe\b/gi, 'på jobbe', 'på jobb'],
          [/\bdet er viktige\b/gi, 'det er viktige', 'det er viktig'],
          [/\bdet er interesant\b/gi, 'det er interesant', 'det er interessant'],
          [/\binteresant\b/gi, 'interesant', 'interessant'],
          [/\bhyggleg\b/gi, 'hyggleg', 'hyggelig'],
          [/\bvansklig\b/gi, 'vansklig', 'vanskelig'],
          [/\bforskjelig\b/gi, 'forskjelig', 'forskjellig'],
          [/\bmulighet\b/gi, null, null],
        ];
        const spellErrors = common.filter(([rx, wrong]) => wrong && rx.test(text));
        if (spellErrors.length > 0) {
          spellErrors.forEach(([,wrong,right]) => {
            tips.push({ type: 'fix', msg: '🔤 <strong>Spelling</strong> — <em>' + wrong + '</em> → <em>' + right + '</em>' });
          });
        }

        // ── Score ─────────────────────────────────────────────────────
        const goodCount = tips.filter(t => t.type === 'good').length;
        const fixCount = tips.filter(t => t.type === 'fix').length;
        let score, scoreColor, scoreLabel;
        if (fixCount === 0 && goodCount >= 2) { score = '🌟 Excellent'; scoreColor = '#15803d'; scoreLabel = 'B1 level'; }
        else if (fixCount <= 1 && goodCount >= 1) { score = '👍 Good'; scoreColor = '#2563eb'; scoreLabel = 'Nearly there'; }
        else if (fixCount >= 2) { score = '✏️ Needs work'; scoreColor = '#d97706'; scoreLabel = 'Keep practising'; }
        else { score = '📝 Fair'; scoreColor = '#6b7280'; scoreLabel = 'Keep going'; }

        return { tips, score, scoreColor, scoreLabel, wordCount: words.length };
      }

      function getGrammarFeedback(id) {
        const el = document.getElementById('ans-' + id);
        const text = el?.value || '';
        if (!text.trim()) {
          alert('Write your answer first, then click AI Grammar.');
          return;
        }

        const aiBox = document.getElementById('ai-' + id);
        const aiResult = document.getElementById('aiResult-' + id);
        aiBox.classList.remove('hidden');

        const groqKey = state.apiKey || '';

        if (groqKey) {
          // Use Groq AI via XMLHttpRequest
          aiResult.innerHTML = '<span class="spinner"></span> Asking Groq AI…';
          const xhr = new XMLHttpRequest();
          const xhrTimer = setTimeout(() => { xhr.abort(); showOfflineCheck(aiResult, text); aiResult.innerHTML += '<div style="font-size:0.72rem;color:#f87171;margin-top:8px">⚠️ Groq: Request timed out</div>'; }, 15000);
          xhr.open('POST', 'https://api.groq.com/openai/v1/chat/completions', true);
          xhr.setRequestHeader('Authorization', 'Bearer ' + groqKey);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.onload = function() {
            clearTimeout(xhrTimer);
            try {
              const data = JSON.parse(xhr.responseText);
              const reply = data.choices?.[0]?.message?.content;
              if (reply) {
                const lines = reply.split('\n').map(function(l){return l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}).join('<br>');
                aiResult.innerHTML = '<div style="font-size:0.85rem;line-height:1.7;color:#1a2235">' + lines + '</div><div style="font-size:0.72rem;color:#9ca3af;margin-top:8px;text-align:right">🤖 Groq AI · free</div>';
              } else {
                const errMsg = data.error?.message || 'No reply';
                showOfflineCheck(aiResult, text);
                aiResult.innerHTML += '<div style="font-size:0.72rem;color:#f87171;margin-top:8px">⚠️ Groq: ' + errMsg + '</div>';
              }
            } catch(e) {
              showOfflineCheck(aiResult, text);
              aiResult.innerHTML += '<div style="font-size:0.72rem;color:#f87171;margin-top:8px">⚠️ Parse error: ' + e.message + '</div>';
            }
          };
          xhr.onerror = function() {
            clearTimeout(xhrTimer);
            showOfflineCheck(aiResult, text);
            aiResult.innerHTML += '<div style="font-size:0.72rem;color:#f87171;margin-top:8px">⚠️ Network error — check internet connection</div>';
          };
          const prompt = 'You are a Norwegian B1 language teacher. Give brief grammar and writing feedback on this Norwegian answer. List 2-3 specific improvements with examples. Be encouraging. Answer in English.\n\nAnswer: ' + JSON.stringify(text);
          xhr.send(JSON.stringify({ model: 'llama3-8b-8192', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }));
        } else {
          // No key — use free offline grammar check
          showOfflineCheck(aiResult, text);
        }
      }

      function showOfflineCheck(aiResult, text) {
        const { tips, score, scoreColor, scoreLabel, wordCount } = analyseNorwegian(text);
        const tipHTML = tips.map(t => {
          const bg = t.type === 'good' ? '#f0fdf4' : t.type === 'fix' ? '#fef2f2' : t.type === 'warn' ? '#fffbeb' : '#f0f9ff';
          const border = t.type === 'good' ? '#bbf7d0' : t.type === 'fix' ? '#fecaca' : t.type === 'warn' ? '#fde68a' : '#bae6fd';
          return `<div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:8px 12px;margin-bottom:6px;font-size:0.83rem;line-height:1.6">${t.msg}</div>`;
        }).join('');
        aiResult.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
            <span style="font-size:1.1rem;font-weight:700;color:${scoreColor}">${score}</span>
            <span style="font-size:0.78rem;color:#6b7280;background:#f3f4f6;padding:2px 8px;border-radius:20px">${scoreLabel}</span>
            <span style="font-size:0.78rem;color:#9ca3af;margin-left:auto">${wordCount} words</span>
          </div>
          ${tipHTML}
          <div style="font-size:0.72rem;color:#9ca3af;margin-top:8px">💡 Add a free Groq key for AI feedback — <strong>console.groq.com</strong></div>`;
      }


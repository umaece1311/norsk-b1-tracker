      // ─── SIMULATION ───────────────────────────────────────────────────────────────
      let simState = { step: -1 };
      const simSteps = [
        {
          label: 'Warm-up',
          duration: 120,
          examType: null,
          desc: 'Introduce yourself in Norwegian. Say your name, where you are from, how long you have lived in Norway, and what you do.',
        },
        { label: 'Oppgave A', duration: 150, examType: 'A', desc: null },
        { label: 'Oppgave B', duration: 360, examType: 'B', desc: null },
        { label: 'Oppgave C', duration: 150, examType: 'C', desc: null },
      ];
      let simTimer = { remaining: 0, total: 0, running: false, interval: null };

      function startSimulation() {
        simState.step = 0;
        renderSimStep();
      }

      function renderSimStep() {
        const step = simState.step;
        // Update step indicators
        for (let i = 0; i <= 4; i++) {
          const el = document.getElementById('simStep' + i);
          el.className = 'sim-step';
          if (i < step) el.classList.add('done');
          else if (i === step) el.classList.add('active');
        }

        if (step >= 4) {
          document.getElementById('simContent').innerHTML = `
      <div style="text-align:center;padding:30px 0">
        <div style="font-size:3rem;margin-bottom:12px">🎉</div>
        <h3 style="font-family:'Fraunces',serif;font-size:1.4rem;margin-bottom:8px">Exam simulation complete!</h3>
        <p style="color:#666;margin-bottom:20px">Well done! You completed all four parts of the oral exam.</p>
        <button class="btn btn-primary" onclick="simState.step=-1;document.getElementById('simContent').innerHTML='<div style=text-align:center;padding:30px>Click Start to begin again</div>'">Start Again</button>
      </div>`;
          return;
        }

        const s = simSteps[step];
        let q = null;
        if (s.examType) {
          const pool = allQuestions().filter(qq => qq.examType === s.examType);
          q = pool[Math.floor(Math.random() * pool.length)];
        }

        clearInterval(simTimer.interval);
        simTimer.remaining = s.duration;
        simTimer.total = s.duration;
        simTimer.running = false;

        const m = Math.floor(s.duration / 60),
          sec = s.duration % 60;

        document.getElementById('simContent').innerHTML = `
    <div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <span style="font-size:1.4rem">${step === 0 ? '👋' : step === 1 ? '📝' : step === 2 ? '💬' : '🎯'}</span>
        <div>
          <div style="font-weight:700;font-size:1rem">${s.label}</div>
          <div style="font-size:0.82rem;color:#888">${m}:${String(sec).padStart(2, '0')} minutes</div>
        </div>
        <div style="margin-left:auto">Step ${step + 1} of ${simSteps.length}</div>
      </div>
      ${q ? `<div class="sim-question">${q.q}</div>` : `<div class="sim-question">${s.desc}</div>`}
      <div class="timer-widget" style="margin-top:16px">
        <div class="timer-display" id="simTimerDisplay">${m}:${String(sec).padStart(2, '0')}</div>
        <div class="timer-progress"><div class="timer-fill" id="simTimerFill" style="width:100%"></div></div>
        <div class="timer-controls">
          <button class="btn btn-ghost" onclick="simTimerStart()">▶ Start</button>
          <button class="btn btn-gray" onclick="simTimerPause()">⏸ Pause</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
        ${step > 0 ? `<button class="btn btn-gray" onclick="simState.step--;renderSimStep()">← Back</button>` : ''}
        <button class="btn btn-primary" onclick="simState.step++;renderSimStep()">Next Step →</button>
      </div>
    </div>`;
      }

      function simTimerStart() {
        if (simTimer.running) return;
        simTimer.running = true;
        simTimer.interval = setInterval(() => {
          simTimer.remaining--;
          const m = Math.floor(simTimer.remaining / 60),
            s = simTimer.remaining % 60;
          const disp = document.getElementById('simTimerDisplay');
          const fill = document.getElementById('simTimerFill');
          if (disp) disp.textContent = `${m}:${String(s).padStart(2, '0')}`;
          const pct = (simTimer.remaining / simTimer.total) * 100;
          if (fill) fill.style.width = pct + '%';
          const warn = simTimer.remaining <= 30;
          if (disp) disp.className = 'timer-display' + (warn ? ' warning' : '');
          if (fill) fill.className = 'timer-fill' + (warn ? ' warning' : '');
          if (simTimer.remaining <= 0) {
            clearInterval(simTimer.interval);
            simTimer.running = false;
          }
        }, 1000);
      }
      function simTimerPause() {
        simTimer.running = false;
        clearInterval(simTimer.interval);
      }


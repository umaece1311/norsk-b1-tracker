      // ─── NAVIGATION ───────────────────────────────────────────────────────────────
      function showTab(tab) {
        // Stop any TTS playing when leaving a tab
        window.speechSynthesis.cancel();
        [
          'today',
          'questions',
          'examguide',
          'study',
          'review',
          'progress',
          'vocab',
          'add',
        ].forEach(t => {
          document.getElementById('tab-' + t).classList.add('hidden');
        });
        document.getElementById('tab-' + tab).classList.remove('hidden');
        // Update sidebar nav button active state
        document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        if (tab === 'today') renderToday();
        if (tab === 'questions') renderQuestions();
        if (tab === 'review') renderReview();
        if (tab === 'progress') renderProgress();
        if (tab === 'study') renderStudy();
        if (tab === 'vocab') renderVocab();
        if (tab === 'add') renderAddForm();
        renderSidebar();
      }

      function sidebarCatFilter(catId, el) {
        state.activeCat = catId;
        // Update sidebar cat button active state
        document
          .querySelectorAll('.sidebar-cat-btn')
          .forEach(b => b.classList.remove('active'));
        el.classList.add('active');
        // Also sync the inline filter chips if visible
        document.querySelectorAll('[data-cat]').forEach(e => {
          e.classList.toggle('active', e.dataset.cat === catId);
        });
        showTab('questions');
      }

      function renderSidebar() {
        const qs = allQuestions();
        const total = qs.length;
        const oneWeekAgo = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString();
        const reviewCount = qs.filter(
          q =>
            state.timestamps[q.id] &&
            state.timestamps[q.id] >= oneWeekAgo &&
            state.answers[q.id]?.trim()
        ).length;

        // Update nav badges
        const bq = document.getElementById('badge-questions');
        if (bq) bq.textContent = total;
        const br = document.getElementById('badge-review');
        if (br) br.textContent = reviewCount || '';

        // Update topbar chips
        const done = qs.filter(q => state.answers[q.id]?.trim()).length;
        const chipTotal = document.getElementById('chipTotal');
        const chipStudied = document.getElementById('chipStudied');
        if (chipTotal) chipTotal.textContent = total + ' questions';
        if (chipStudied) chipStudied.textContent = done + ' done';

        // Streak: count consecutive days with timestamps
        const days = new Set(
          Object.values(state.timestamps || {}).map(ts =>
            new Date(ts).toDateString()
          )
        );
        let streak = 0;
        const d = new Date();
        while (days.has(d.toDateString())) {
          streak++;
          d.setDate(d.getDate() - 1);
        }
        const chipStreak = document.getElementById('chipStreak');
        if (chipStreak) chipStreak.textContent = streak + ' day streak';

        // Render category buttons
        const catsEl = document.getElementById('sidebar-cats');
        if (!catsEl) return;
        // Cat dot colors mapped from CSS
        const catColors = {
          'about-me': '#9d174d',
          family: '#5b21b6',
          work: '#92400e',
          school: '#1e40af',
          health: '#065f46',
          daily: '#9a3412',
          hobbies: '#166534',
          travel: '#155e75',
          food: '#713f12',
          society: '#334155',
          friends: '#6b21a8',
          situations: '#7c2d12',
          opinions: '#0c4a6e',
        };
        const catBgs = {
          'about-me': '#fce7f3',
          family: '#ede9fe',
          work: '#fef3c7',
          school: '#dbeafe',
          health: '#d1fae5',
          daily: '#ffedd5',
          hobbies: '#f0fdf4',
          travel: '#cffafe',
          food: '#fef9c3',
          society: '#f1f5f9',
          friends: '#fdf4ff',
          situations: '#fff7ed',
          opinions: '#f0f9ff',
        };
        catsEl.innerHTML = CATS.map(cat => {
          const count = qs.filter(q => q.cat === cat.id).length;
          const isActive = state.activeCat === cat.id;
          const dotColor = catColors[cat.id] || '#94a3b8';
          return `<button class="sidebar-cat-btn${isActive ? ' active' : ''}" data-cat="${cat.id}" onclick="sidebarCatFilter('${cat.id}', this)">
            <span class="cat-dot" style="background:${dotColor}"></span>
            ${cat.emoji} ${cat.label}
            <span class="cat-count">${count}</span>
          </button>`;
        }).join('');

        // Update "All" cat button count
        const allCount = document.getElementById('catcount-all');
        if (allCount) allCount.textContent = total;
      }


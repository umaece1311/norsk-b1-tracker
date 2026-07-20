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
        // today.js and questions.js both render question cards with the same
        // id="card-N"/id="trans-N" for shared question ids. Clear the container
        // of whichever of these tabs isn't the one being shown, so at most one
        // copy of any card id exists in the DOM — otherwise getElementById()
        // inside card action handlers (Translate/Pronunciation) can silently
        // resolve to a hidden, zero-size duplicate from the other tab.
        if (tab !== 'today') {
          const el = document.getElementById('todayCards');
          if (el) el.innerHTML = '';
        }
        if (tab !== 'questions') {
          const el = document.getElementById('questionsList');
          if (el) el.innerHTML = '';
        }
        document.getElementById('tab-' + tab).classList.remove('hidden');
        // Update sidebar nav buttons
        document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        // Update mobile bottom nav buttons
        document.querySelectorAll('.mobile-nav-btn[data-tab]').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        // Update more drawer buttons
        document.querySelectorAll('.mobile-more-btn[data-tab]').forEach(btn => {
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
        // Scroll to top of main content
        const mc = document.querySelector('.main-content');
        if (mc) mc.scrollTop = 0;
      }

      // ── Responsive nav sync ───────────────────────────────────────────────────────
      // When on desktop (>768px), ensure sidebar is always visible and drawers are closed
      function _syncNavForViewport() {
        const isMobile = window.innerWidth <= 768;
        const sidebar = document.getElementById('sidebar');
        const mobileNav = document.getElementById('mobileNav');
        const hamburger = document.getElementById('hamburgerBtn');
        if (!isMobile) {
          // Desktop: always show sidebar inline, hide mobile elements
          if (sidebar) { sidebar.classList.remove('open'); sidebar.style.transform = ''; }
          const backdrop = document.getElementById('sidebarBackdrop');
          if (backdrop) backdrop.classList.remove('open');
          document.body.style.overflow = '';
          if (mobileNav) mobileNav.style.setProperty('display', 'none', 'important');
          if (hamburger) hamburger.style.setProperty('display', 'none', 'important');
        } else {
          // Mobile: un-hide bottom nav and hamburger
          if (mobileNav) { mobileNav.style.removeProperty('display'); mobileNav.style.setProperty('display', 'block', 'important'); }
          if (hamburger) { hamburger.style.removeProperty('display'); hamburger.style.setProperty('display', 'inline-flex', 'important'); }
        }
      }
      window.addEventListener('resize', _syncNavForViewport);
      // Run once on load to fix the display:none parent quirk
      document.addEventListener('DOMContentLoaded', _syncNavForViewport);

      // ── Sidebar (mobile drawer) ───────────────────────────────────────────────────
      function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        if (!sidebar) return;
        const isOpen = sidebar.classList.contains('open');
        if (isOpen) {
          closeSidebar();
        } else {
          sidebar.classList.add('open');
          if (backdrop) backdrop.classList.add('open');
          document.body.style.overflow = 'hidden';
        }
      }
      function closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        if (sidebar) sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
        document.body.style.overflow = '';
      }

      // ── More drawer (mobile) ──────────────────────────────────────────────────────
      function toggleMoreDrawer() {
        const drawer = document.getElementById('moreDrawer');
        const backdrop = document.getElementById('drawerBackdrop');
        if (!drawer) return;
        const isOpen = drawer.classList.contains('open');
        if (isOpen) {
          closeMoreDrawer();
        } else {
          drawer.classList.add('open');
          if (backdrop) { backdrop.style.display = 'block'; }
          document.body.style.overflow = 'hidden';
        }
      }
      function closeMoreDrawer() {
        const drawer = document.getElementById('moreDrawer');
        const backdrop = document.getElementById('drawerBackdrop');
        if (drawer) drawer.classList.remove('open');
        if (backdrop) backdrop.style.display = 'none';
        document.body.style.overflow = '';
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

        // Update nav badges (sidebar + mobile)
        const bq = document.getElementById('badge-questions');
        if (bq) bq.textContent = total;
        const br = document.getElementById('badge-review');
        if (br) br.textContent = reviewCount || '';
        // Mobile nav badges
        const mbq = document.getElementById('mnav-badge-questions');
        if (mbq) { mbq.textContent = total; mbq.classList.toggle('hidden', !total); }
        const mbrMore = document.getElementById('mnav-badge-review-more');
        if (mbrMore) { mbrMore.textContent = reviewCount; mbrMore.style.display = reviewCount ? '' : 'none'; }
        // Sync admin button visibility in more drawer
        const adminBtn = document.getElementById('adminNavBtn');
        const moreAdminBtn = document.getElementById('moreAdminBtn');
        if (moreAdminBtn && adminBtn) moreAdminBtn.style.display = adminBtn.style.display;

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


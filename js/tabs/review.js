      // ─── REVIEW TAB ───────────────────────────────────────────────────────────────
      // Shows only questions the user has marked for review (🔖).
      // Clicking a question navigates to it in the Questions tab.

      function toggleReview(id) {
        if (state.reviewMarked[id]) {
          delete state.reviewMarked[id];
        } else {
          state.reviewMarked[id] = true;
        }
        saveState();

        // Update the button on the card without re-rendering everything
        const btn = document.getElementById('reviewBtn-' + id);
        if (btn) {
          const marked = !!state.reviewMarked[id];
          btn.className  = 'btn ' + (marked ? 'btn-review-active' : 'btn-gray');
          btn.innerHTML  = '🔖 ' + (marked ? 'In Review' : 'Add to Review');
        }

        // Update review tab badge
        const count = Object.keys(state.reviewMarked).length;
        const badge = document.getElementById('badge-review');
        if (badge) badge.textContent = count || '';

        // Re-render review list if currently visible
        if (!document.getElementById('tab-review').classList.contains('hidden')) {
          renderReview();
        }

        showToast(state.reviewMarked[id] ? '🔖 Added to Review' : 'Removed from Review');
      }

      function renderReview() {
        const el = document.getElementById('reviewList');
        if (!el) return;

        const allQs      = allQuestions();
        const markedIds  = Object.keys(state.reviewMarked).map(Number);
        const reviewQs   = allQs.filter(q => markedIds.includes(q.id));

        if (reviewQs.length === 0) {
          el.innerHTML = `
            <div style="text-align:center;padding:48px 24px;background:#fff;border-radius:16px;border:2px dashed #e5e7eb">
              <div style="font-size:2.5rem;margin-bottom:12px">🔖</div>
              <h3 style="font-family:'Fraunces',serif;font-size:1.1rem;color:#374151;margin-bottom:8px">No questions marked for review</h3>
              <p style="font-size:0.88rem;color:#94a3b8;line-height:1.6">
                Open any question and click <strong>🔖 Add to Review</strong><br>to add it here for focused practice.
              </p>
            </div>`;
          return;
        }

        el.innerHTML = `
          <div style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <p style="font-size:0.88rem;color:#64748b">${reviewQs.length} question${reviewQs.length > 1 ? 's' : ''} marked for review</p>
            <button class="btn btn-gray" style="font-size:0.78rem" onclick="clearAllReview()">🗑 Clear All</button>
          </div>
          ${reviewQs.map((q, i) => `
            <div class="review-item" onclick="goToQuestion(${q.id})">
              <div class="review-item-num">${i + 1}</div>
              <div class="review-item-body">
                <div class="review-item-meta">
                  <span class="cat-badge ${catClass(q.cat)}">${catLabel(q.cat)}</span>
                  ${q.examType ? `<span class="exam-badge badge-${q.examType}">Type ${q.examType}</span>` : ''}
                </div>
                <div class="review-item-q">${q.q}</div>
              </div>
              <div class="review-item-arrow">›</div>
            </div>`).join('')}`;
      }

      // Navigate to a question in the Questions tab and highlight it
      function goToQuestion(id) {
        showTab('questions');
        setTimeout(() => {
          const card = document.getElementById('card-' + id);
          if (!card) return;
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.style.transition = 'box-shadow 0.3s';
          card.style.boxShadow  = '0 0 0 3px #2563eb66';
          setTimeout(() => { card.style.boxShadow = ''; }, 2000);
        }, 120);
      }

      function clearAllReview() {
        state.reviewMarked = {};
        saveState();
        const badge = document.getElementById('badge-review');
        if (badge) badge.textContent = '';
        renderReview();
        showToast('Review list cleared.');
      }

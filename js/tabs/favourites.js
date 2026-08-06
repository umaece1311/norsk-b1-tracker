      // ─── FAVOURITES TAB ───────────────────────────────────────────────────────────
      // Shows only questions the user has starred (⭐). Each renders as a full card
      // (same as Questions tab) so per-question audio/translate/pronunciation still
      // work, plus a scoped Play All and Download PDF for just the favourites.

      function toggleFavourite(id) {
        if (state.favourites[id]) {
          delete state.favourites[id];
        } else {
          state.favourites[id] = true;
        }
        saveState();

        // Update the button on the card without re-rendering everything
        const btn = document.getElementById('favBtn-' + id);
        if (btn) {
          const marked = !!state.favourites[id];
          btn.className = 'btn-favourite-star' + (marked ? ' active' : '');
          btn.title = marked ? 'Remove from Favourites' : 'Add to Favourites';
          btn.textContent = marked ? '⭐' : '☆';
        }

        // Update favourites tab badge
        const count = Object.keys(state.favourites).length;
        const badge = document.getElementById('badge-favourites');
        if (badge) badge.textContent = count || '';
        const mbadge = document.getElementById('mnav-badge-favourites-more');
        if (mbadge) { mbadge.textContent = count; mbadge.style.display = count ? '' : 'none'; }

        // Re-render favourites list if currently visible
        if (!document.getElementById('tab-favourites').classList.contains('hidden')) {
          renderFavourites();
        }

        showToast(state.favourites[id] ? '⭐ Added to Favourites' : 'Removed from Favourites');
      }

      function favouriteQuestions() {
        const ids = Object.keys(state.favourites).map(Number);
        return allQuestions().filter(q => ids.includes(q.id));
      }

      function renderFavourites() {
        const el = document.getElementById('favouritesList');
        if (!el) return;

        const favQs = favouriteQuestions();
        const controls = document.getElementById('favouritesControls');
        if (controls) controls.classList.toggle('hidden', favQs.length === 0);

        if (favQs.length === 0) {
          el.innerHTML = `
            <div style="text-align:center;padding:48px 24px;background:#fff;border-radius:16px;border:2px dashed #e5e7eb">
              <div style="font-size:2.5rem;margin-bottom:12px">⭐</div>
              <h3 style="font-family:'Fraunces',serif;font-size:1.1rem;color:#374151;margin-bottom:8px">No favourite questions yet</h3>
              <p style="font-size:0.88rem;color:#94a3b8;line-height:1.6">
                Click the <strong>☆</strong> star on any question card<br>to add it here.
              </p>
            </div>`;
          return;
        }

        el.innerHTML = `
          <p style="font-size:0.88rem;color:#64748b;margin-bottom:16px">${favQs.length} favourite question${favQs.length > 1 ? 's' : ''}</p>
          ${favQs.map(q => renderCard(q, { showTimer: true })).join('')}`;
      }

      function downloadFavouritesPdf() {
        const favQs = favouriteQuestions();
        if (!favQs.length) return;
        downloadQuestionsPdf(favQs, '⭐ Favourites');
      }

      function clearAllFavourites() {
        if (!confirm('Remove all favourites?')) return;
        state.favourites = {};
        saveState();
        const badge = document.getElementById('badge-favourites');
        if (badge) badge.textContent = '';
        const mbadge = document.getElementById('mnav-badge-favourites-more');
        if (mbadge) { mbadge.textContent = ''; mbadge.style.display = 'none'; }
        renderFavourites();
        showToast('Favourites cleared.');
      }

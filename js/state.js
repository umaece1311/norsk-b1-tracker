      // ─── STATE ────────────────────────────────────────────────────────────────────
      let state = {
        answers: {}, // id -> string
        status: {}, // id -> 'new'|'learning'|'done'
        timestamps: {}, // id -> ISO date string
        reviewMarked: {}, // id -> true (marked for review)
        favourites: {}, // id -> true (marked as favourite)
        customQs: [],
        followUps: {}, // mainQuestionId -> [{ q, a }, ...]
        catOverrides: {}, // id -> catId (user-reassigned category, overrides the built-in one)
        customCats: [], // user-created categories, same shape as CATS entries
        apiKey: '',
        googleTtsKey: '',
        todayIds: [],
        activeCat: 'all',
        activeExamType: 'all',
        activeStatus: 'all',
      };

      // Built-in categories plus any the user has created on the fly.
      function allCats() {
        return [...CATS, ...(state.customCats || [])];
      }

      // Creates a new category (id derived from the name) and returns its id,
      // or null if the name is empty or a matching category already exists.
      function createCategory(name, emoji) {
        const label = (name || '').trim();
        if (!label) return null;
        const id = label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        if (!id) return null;
        if (allCats().some(c => c.id === id)) return id;

        if (!state.customCats) state.customCats = [];
        state.customCats.push({ id, label, emoji: emoji || '🏷️' });
        saveState();
        return id;
      }

      function allQuestions() {
        const qs = [...BASE_QS, ...state.customQs];
        if (!state.catOverrides) return qs;
        return qs.map(q =>
          state.catOverrides[q.id] ? { ...q, cat: state.catOverrides[q.id] } : q
        );
      }

      // Reassigns a question to a different existing category. Works for both
      // built-in and custom questions since the override lives in state, not BASE_QS.
      function setQuestionCategory(id, catId) {
        if (!allCats().some(c => c.id === catId)) return;
        if (!state.catOverrides) state.catOverrides = {};
        state.catOverrides[id] = catId;
        saveState();
      }

      // Excludes General (opinions) and Follow-up questions from question/progress counts.
      function trackedQuestions() {
        return allQuestions().filter(q => q.cat !== 'opinions' && q.cat !== 'followup');
      }

      // Displayed "#N" position of a question within its own (possibly reassigned)
      // category — recalculated live so moving a question renumbers both its old
      // and new category lists, while state stays keyed by the stable q.id underneath.
      function catPosition(q) {
        const siblings = allQuestions().filter(x => x.cat === q.cat);
        return siblings.findIndex(x => x.id === q.id) + 1;
      }

      function loadState() {
        try {
          const saved = localStorage.getItem('norsk-b1-state');
          if (saved) {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
          }
          state.apiKey = localStorage.getItem('norsk-b1-apikey') || '';
          state.googleTtsKey = localStorage.getItem('norsk-b1-google-tts-key') || '';
        } catch (e) {}
      }

      function saveState() {
        const toSave = { ...state };
        delete toSave.apiKey;
        delete toSave.googleTtsKey;
        localStorage.setItem('norsk-b1-state', JSON.stringify(toSave));
      }


      // ─── STATE ────────────────────────────────────────────────────────────────────
      let state = {
        answers: {}, // id -> string
        status: {}, // id -> 'new'|'learning'|'done'
        timestamps: {}, // id -> ISO date string
        reviewMarked: {}, // id -> true (marked for review)
        favourites: {}, // id -> true (marked as favourite)
        customQs: [],
        followUps: {}, // mainQuestionId -> [{ q, a }, ...]
        apiKey: '',
        googleTtsKey: '',
        todayIds: [],
        activeCat: 'all',
        activeExamType: 'all',
        activeStatus: 'all',
      };

      function allQuestions() {
        return [...BASE_QS, ...state.customQs];
      }

      // Excludes General (opinions) and Follow-up questions from question/progress counts.
      function trackedQuestions() {
        return allQuestions().filter(q => q.cat !== 'opinions' && q.cat !== 'followup');
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


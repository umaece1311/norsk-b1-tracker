      // ─── STATE ────────────────────────────────────────────────────────────────────
      let state = {
        answers: {}, // id -> string
        status: {}, // id -> 'new'|'learning'|'done'
        timestamps: {}, // id -> ISO date string
        reviewMarked: {}, // id -> true (marked for review)
        customQs: [],
        apiKey: '',
        todayIds: [],
        activeCat: 'all',
        activeExamType: 'all',
        activeStatus: 'all',
      };

      function allQuestions() {
        return [...BASE_QS, ...state.customQs];
      }

      function loadState() {
        try {
          const saved = localStorage.getItem('norsk-b1-state');
          if (saved) {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
          }
          state.apiKey = localStorage.getItem('norsk-b1-apikey') || '';
        } catch (e) {}
      }

      function saveState() {
        const toSave = { ...state };
        delete toSave.apiKey;
        localStorage.setItem('norsk-b1-state', JSON.stringify(toSave));
      }


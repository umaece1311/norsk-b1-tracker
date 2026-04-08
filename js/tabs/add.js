      // ─── ADD QUESTION ─────────────────────────────────────────────────────────────
      function renderAddForm() {
        const sel = document.getElementById('newCat');
        if (!sel.options.length) {
          CATS.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.emoji} ${c.label}`;
            sel.appendChild(opt);
          });
        }
      }

      function addQuestion() {
        const q = document.getElementById('newQ').value.trim();
        const a = document.getElementById('newA').value.trim();
        const cat = document.getElementById('newCat').value;
        const examType = document.getElementById('newExamType').value;
        if (!q) {
          alert('Please enter a question.');
          return;
        }
        const maxId = Math.max(...allQuestions().map(q => q.id), 0);
        state.customQs.push({ id: maxId + 1, cat, examType, q, a });
        saveState();
        document.getElementById('newQ').value = '';
        document.getElementById('newA').value = '';
        alert(`Question added! (#${maxId + 1})`);
      }


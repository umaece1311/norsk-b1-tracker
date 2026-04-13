      // ─── ADD QUESTION ─────────────────────────────────────────────────────────────
      let _editingCustomQId = null;

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
        _editingCustomQId = null;
        _renderCustomQList();
      }

      function addQuestion() {
        const q        = document.getElementById('newQ').value.trim();
        const a        = document.getElementById('newA').value.trim();
        const cat      = document.getElementById('newCat').value;
        const examType = document.getElementById('newExamType').value;
        if (!q) { alert('Please enter a question.'); return; }

        if (_editingCustomQId !== null) {
          // Save edit
          state.customQs = (state.customQs || []).map(cq =>
            cq.id === _editingCustomQId ? { ...cq, q, a, cat, examType } : cq
          );
          _editingCustomQId = null;
          document.getElementById('add-form-title').textContent = '➕ Add Custom Question';
          document.getElementById('add-submit-btn').textContent = 'Add Question';
          showToast('✅ Question updated!');
        } else {
          // Add new
          const maxId = Math.max(...allQuestions().map(q => q.id), 0);
          state.customQs = [...(state.customQs || []), { id: maxId + 1, cat, examType, q, a }];
          showToast(`✅ Question added! (#${maxId + 1})`);
        }

        saveState();
        document.getElementById('newQ').value = '';
        document.getElementById('newA').value = '';
        _renderCustomQList();
      }

      function _renderCustomQList() {
        const container = document.getElementById('custom-q-list');
        if (!container) return;
        const qs = state.customQs || [];
        if (!qs.length) {
          container.innerHTML = `<p style="color:#94a3b8;font-size:0.85rem;text-align:center;padding:16px 0">No custom questions yet.</p>`;
          return;
        }
        container.innerHTML = qs.map(q => `
          <div class="custom-q-row">
            <div class="custom-q-info">
              <span class="cat-badge cat-${q.cat}" style="font-size:0.65rem">${catLabel(q.cat)}</span>
              <span class="custom-q-text">${escapeHtml(q.q)}</span>
            </div>
            <div class="custom-q-actions">
              <button class="btn-cq-edit" onclick="editCustomQ(${q.id})">✏️ Edit</button>
              <button class="btn-cq-delete" onclick="deleteCustomQ(${q.id})">🗑 Delete</button>
            </div>
          </div>`).join('');
      }

      function editCustomQ(id) {
        const q = (state.customQs || []).find(q => q.id === id);
        if (!q) return;
        _editingCustomQId = id;
        document.getElementById('newQ').value = q.q;
        document.getElementById('newA').value = q.a || '';
        document.getElementById('newCat').value = q.cat;
        document.getElementById('newExamType').value = q.examType || 'A';
        document.getElementById('add-form-title').textContent = '✏️ Edit Question';
        document.getElementById('add-submit-btn').textContent = '💾 Save Changes';
        const cancelBtn = document.getElementById('add-cancel-btn');
        if (cancelBtn) cancelBtn.style.display = '';
        document.getElementById('newQ').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      function deleteCustomQ(id) {
        if (!confirm('Delete this custom question?')) return;
        state.customQs = (state.customQs || []).filter(q => q.id !== id);
        if (_editingCustomQId === id) {
          _editingCustomQId = null;
          document.getElementById('newQ').value = '';
          document.getElementById('newA').value = '';
          document.getElementById('add-form-title').textContent = '➕ Add Custom Question';
          document.getElementById('add-submit-btn').textContent = 'Add Question';
        }
        saveState();
        _renderCustomQList();
        showToast('🗑 Question deleted.');
      }

      function cancelEditQ() {
        _editingCustomQId = null;
        document.getElementById('newQ').value = '';
        document.getElementById('newA').value = '';
        document.getElementById('add-form-title').textContent = '➕ Add Custom Question';
        document.getElementById('add-submit-btn').textContent = 'Add Question';
      }

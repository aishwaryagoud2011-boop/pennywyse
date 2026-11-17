(function (global) {
  const PW = (global.PW = global.PW || {});

  const ICON_OPTIONS = [
    'food',
    'transport',
    'salary',
    'shopping',
    'entertainment',
    'investment',
    'premiums',
    'loan',
    'utilities',
    'health',
    'wallet',
    'gift',
  ];

  function toLocalDateTimeInput(iso) {
    const d = iso ? new Date(iso) : new Date();
    const safe = Number.isNaN(d.getTime()) ? new Date() : d;
    const pad = (n) => String(n).padStart(2, '0');
    return `${safe.getFullYear()}-${pad(safe.getMonth() + 1)}-${pad(safe.getDate())}T${pad(
      safe.getHours()
    )}:${pad(safe.getMinutes())}`;
  }

  function mountTransactionModal(modalRoot, { initial = null, defaultType = 'expense', onSave, onDelete, onClose }) {
    const { CATEGORY_PRESETS, COLOR_SWATCHES, iconSvg, transactionIconSvg, escapeHtml } = PW;

    const state = {
      name: initial?.name || '',
      category: initial?.category || (defaultType === 'income' ? 'Salary' : 'Food & dining'),
      type: initial?.type || defaultType,
      amount: initial ? String(initial.amount) : '',
      dateTimeLocal: toLocalDateTimeInput(initial?.dateISO),
      icon: initial?.icon || (defaultType === 'income' ? 'salary' : 'food'),
      color: initial?.color || (defaultType === 'income' ? '#16A34A' : '#4A90D9'),
      note: initial?.note || '',
      saving: false,
      error: null,
    };

    function render() {
      modalRoot.innerHTML = `
        <div class="modal-backdrop" id="txModalBackdrop">
          <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="txModalTitle">
            <div class="modal-header">
              <h2 id="txModalTitle" class="font-serif" style="font-size:18px;font-weight:700;color:#171717;">
                ${initial ? 'Edit Transaction' : 'Add Transaction'}
              </h2>
              <button type="button" id="txCloseBtn" aria-label="Close" class="icon-btn-circle">
                ${iconSvg('x', 20)}
              </button>
            </div>

            <form id="txForm" class="stack-md" style="margin-top:16px;">
              <div class="segment-box">
                <button type="button" data-tx-type="expense" class="segment-btn ${state.type === 'expense' ? 'active-red' : ''}">
                  Expense
                </button>
                <button type="button" data-tx-type="income" class="segment-btn ${state.type === 'income' ? 'active-green' : ''}">
                  Income
                </button>
              </div>

              <div class="grid-2">
                <div>
                  <label class="field-label" for="txNameInput">Name</label>
                  <input id="txNameInput" type="text" required value="${escapeHtml(state.name)}" placeholder="e.g., Food & dining" class="input" />
                </div>
                <div>
                  <label class="field-label" for="txAmountInput">Amount</label>
                  <input id="txAmountInput" type="number" required min="0.01" step="any" value="${escapeHtml(state.amount)}" placeholder="0.00" class="input tabular-nums" />
                </div>
              </div>

              <div class="grid-2">
                <div>
                  <label class="field-label" for="txCategorySelect">Category</label>
                  <select id="txCategorySelect" class="input">
                    ${CATEGORY_PRESETS.map(
                      (p) => `<option value="${escapeHtml(p.category)}" ${state.category === p.category ? 'selected' : ''}>${escapeHtml(p.category)}</option>`
                    ).join('')}
                    <option value="Other" ${state.category === 'Other' ? 'selected' : ''}>Other</option>
                  </select>
                </div>
                <div>
                  <label class="field-label" for="txDateInput">Date & Time</label>
                  <input id="txDateInput" type="datetime-local" value="${escapeHtml(state.dateTimeLocal)}" class="input" style="font-size:12px;padding:6px 10px;" />
                </div>
              </div>

              <div>
                <label class="field-label" style="margin-bottom:6px;">Icon</label>
                <div class="grid-6">
                  ${ICON_OPTIONS.map(
                    (ic) => `
                      <button type="button" data-tx-icon="${ic}" class="icon-choice ${state.icon === ic ? 'active' : ''}" aria-label="Icon ${ic}">
                        <span class="tx-icon-box" style="width:28px;height:28px;border-radius:8px;background-color:${state.color};">
                          ${transactionIconSvg(ic, 16)}
                        </span>
                      </button>
                    `
                  ).join('')}
                </div>
              </div>

              <div>
                <label class="field-label" style="margin-bottom:6px;">Color</label>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                  ${COLOR_SWATCHES.map(
                    (swatch) => `
                      <button type="button" data-tx-color="${swatch}" aria-label="Color ${swatch}" class="color-swatch ${state.color === swatch ? 'active' : ''}" style="background-color:${swatch};"></button>
                    `
                  ).join('')}
                </div>
              </div>

              <div>
                <label class="field-label" for="txNoteInput">Note (Optional)</label>
                <input id="txNoteInput" type="text" value="${escapeHtml(state.note)}" placeholder="Add an optional note" class="input" />
              </div>

              <p id="txErrorMsg" class="error-text" style="display:${state.error ? 'block' : 'none'};">${escapeHtml(state.error || '')}</p>

              <div class="row-center" style="padding-top:6px;">
                ${
                  initial && onDelete
                    ? `<button type="button" id="txDeleteBtn" ${state.saving ? 'disabled' : ''} aria-label="Delete transaction" class="btn-danger-outline" style="width:auto;padding:10px 14px;">
                        ${iconSvg('trash', 16)}
                      </button>`
                    : ''
                }
                <button type="submit" id="txSubmitBtn" ${state.saving ? 'disabled' : ''} class="btn-primary" style="flex:1;">
                  ${state.saving ? '<span class="spinner"></span>' : ''}
                  <span>${initial ? 'Save Changes' : 'Add Transaction'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      bindEvents();
    }

    function updateIconColors() {
      modalRoot.querySelectorAll('[data-tx-icon] .tx-icon-box').forEach((box) => {
        box.style.backgroundColor = state.color;
      });
      modalRoot.querySelectorAll('[data-tx-color]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.txColor === state.color);
      });
      modalRoot.querySelectorAll('[data-tx-icon]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.txIcon === state.icon);
      });
    }

    function updateTypeButtons() {
      modalRoot.querySelectorAll('[data-tx-type]').forEach((btn) => {
        const t = btn.dataset.txType;
        btn.classList.toggle('active-red', t === 'expense' && state.type === 'expense');
        btn.classList.toggle('active-green', t === 'income' && state.type === 'income');
      });
    }

    function setError(msg) {
      state.error = msg;
      const errEl = modalRoot.querySelector('#txErrorMsg');
      if (errEl) {
        errEl.textContent = msg || '';
        errEl.style.display = msg ? 'block' : 'none';
      }
    }

    function bindEvents() {
      modalRoot.querySelector('#txCloseBtn')?.addEventListener('click', onClose);
      modalRoot.querySelector('#txModalBackdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'txModalBackdrop') onClose();
      });

      modalRoot.querySelector('#txNameInput')?.addEventListener('input', (e) => {
        state.name = e.target.value;
      });
      modalRoot.querySelector('#txAmountInput')?.addEventListener('input', (e) => {
        state.amount = e.target.value;
      });
      modalRoot.querySelector('#txDateInput')?.addEventListener('change', (e) => {
        state.dateTimeLocal = e.target.value;
      });
      modalRoot.querySelector('#txNoteInput')?.addEventListener('input', (e) => {
        state.note = e.target.value;
      });

      modalRoot.querySelector('#txCategorySelect')?.addEventListener('change', (e) => {
        const cat = e.target.value;
        state.category = cat;
        const preset = CATEGORY_PRESETS.find((p) => p.category === cat);
        if (preset && !initial) {
          state.icon = preset.icon;
          state.color = preset.color;
          state.type = preset.defaultType;
          updateTypeButtons();
          updateIconColors();
        }
      });

      modalRoot.querySelectorAll('[data-tx-type]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.type = btn.dataset.txType;
          updateTypeButtons();
        });
      });

      modalRoot.querySelectorAll('[data-tx-icon]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.icon = btn.dataset.txIcon;
          updateIconColors();
        });
      });

      modalRoot.querySelectorAll('[data-tx-color]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.color = btn.dataset.txColor;
          updateIconColors();
        });
      });

      modalRoot.querySelector('#txDeleteBtn')?.addEventListener('click', async () => {
        if (!initial?.id || !onDelete || state.saving) return;
        state.saving = true;
        render();
        try {
          await onDelete(initial.id);
          onClose();
        } catch (err) {
          state.saving = false;
          state.error = err instanceof Error ? err.message : 'Could not delete transaction';
          render();
        }
      });

      modalRoot.querySelector('#txForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        setError(null);
        const numericAmount = Number(state.amount);
        if (!state.name.trim()) {
          setError('Please enter a transaction name.');
          return;
        }
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
          setError('Please enter an amount greater than 0.');
          return;
        }

        const parsedDate = new Date(state.dateTimeLocal);
        const dateISO = Number.isNaN(parsedDate.getTime())
          ? new Date().toISOString()
          : parsedDate.toISOString();

        state.saving = true;
        render();
        try {
          await onSave({
            id: initial?.id,
            name: state.name.trim(),
            category: state.category.trim() || 'Other',
            type: state.type,
            amount: numericAmount,
            dateISO,
            icon: state.icon,
            color: state.color,
            note: state.note.trim(),
          });
          onClose();
        } catch (err) {
          state.saving = false;
          state.error = err instanceof Error ? err.message : 'Could not save transaction';
          render();
        }
      });
    }

    render();
    return () => {
      modalRoot.innerHTML = '';
    };
  }

  PW.mountTransactionModal = mountTransactionModal;
})(window);

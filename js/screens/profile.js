(function (global) {
  const PW = (global.PW = global.PW || {});

  function renderProfileScreen(container, ctx) {
    const {
      computeDashboardTotals,
      CURRENCY_META,
      formatMoney,
      formatMoneyCompact,
      formatTransactionTime,
      goalIconSvg,
      iconSvg,
      pennywyseLogoSvg,
      transactionIconSvg,
      exportTransactionsCsv,
      exportTransactionsPdf,
      getPWAStatus,
      subscribePWA,
      triggerPWAInstall,
      escapeHtml,
      renderBottomNav,
    } = PW;

    const { user, transactions, savingGoals } = ctx.state;
    const totals = computeDashboardTotals(user, transactions);

    const latestTransaction =
      transactions.length > 0
        ? [...transactions].sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())[0]
        : null;

    const local = {
      modal: 'none',
      saving: false,
      exportType: 'all',
      exportFromDate: '',
      exportToDate: '',
      exportFeedback: null,
      nameDraft: user.name,
      taglineDraft: user.tagline,
      openingBalanceDraft: String(user.openingBalance),
      currencyDraft: user.currency,
      budgetDraft: String(user.monthlyBudget),
      goalsDraft: savingGoals.map((g) => ({ ...g })),
    };

    let unsubPWA = null;

    function getExportableTransactions() {
      const fromMs = local.exportFromDate ? new Date(`${local.exportFromDate}T00:00:00`).getTime() : null;
      const toMs = local.exportToDate ? new Date(`${local.exportToDate}T23:59:59.999`).getTime() : null;
      return [...transactions]
        .filter((tx) => {
          if (local.exportType !== 'all' && tx.type !== local.exportType) return false;
          const txMs = new Date(tx.dateISO).getTime();
          if (fromMs !== null && !Number.isNaN(txMs) && txMs < fromMs) return false;
          if (toMs !== null && !Number.isNaN(txMs) && txMs > toMs) return false;
          return true;
        })
        .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());
    }

    function renderMain() {
      const ringRadius = 18;
      const ringCirc = 2 * Math.PI * ringRadius;
      const ringOffset = ringCirc - (totals.budgetUsedPercent / 100) * ringCirc;

      container.innerHTML = `
        <div class="screen">
          <div class="screen-scroll">
            <div class="screen-header">
              ${pennywyseLogoSvg('sm')}
              <button type="button" id="profileSettingsBtn" aria-label="Open Settings" style="min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:flex-end;color:#262626;">
                ${iconSvg('settings', 20)}
              </button>
            </div>

            <div class="profile-hero">
              <div class="avatar-wrap">
                <div class="avatar-circle">
                  ${
                    user.avatarUrl
                      ? `<img src="${escapeHtml(user.avatarUrl)}" alt="${escapeHtml(user.name)}" />`
                      : `<span style="color:#737373;display:inline-flex;">${iconSvg('user', 40)}</span>`
                  }
                </div>
                <input id="avatarFileInput" type="file" accept="image/*" style="display:none;" />
                <button type="button" id="avatarUploadBtn" aria-label="Change profile photo" class="avatar-cam-btn">
                  ${iconSvg('camera', 14)}
                </button>
              </div>

              <button type="button" id="editNameBtn" class="row-center" style="margin-top:10px;gap:6px;color:#0a0a0a;">
                <span class="font-serif" style="font-size:18px;font-weight:700;">${escapeHtml(user.name)}</span>
                <span style="color:#737373;display:inline-flex;">${iconSvg('pencil', 14)}</span>
              </button>

              <button type="button" id="editTaglineBtn" class="row-center" style="margin-top:2px;gap:4px;font-size:12px;color:#737373;">
                <span>${escapeHtml(user.tagline || 'Smart saver • Big dreamer')}</span>
                ${iconSvg('pencil', 10)}
              </button>
            </div>

            <div class="surface-card" style="margin-top:16px;">
              <div class="row-between">
                <span class="font-serif" style="font-size:12px;font-weight:600;color:#404040;">Total Balance</span>
                <button type="button" id="editBalanceBtn" class="row-center" style="gap:4px;font-size:12px;font-weight:500;color:#404040;">
                  <span>Edit</span>
                  ${iconSvg('pencil', 12)}
                </button>
              </div>
              <p class="tabular-nums" style="margin-top:4px;font-size:24px;font-weight:800;color:#0a0a0a;">
                ${escapeHtml(formatMoney(totals.totalBalance, user.currency))}
              </p>
            </div>

            <div class="grid-2" style="margin-top:12px;">
              <div class="surface-card" style="margin-top:0;padding:12px;">
                <div class="row-between" style="font-size:12px;">
                  <span style="font-weight:500;color:#404040;">Income</span>
                  <button type="button" id="profileAddIncomeBtn" class="row-center" style="gap:4px;font-weight:500;color:#404040;">
                    <span>Edit</span>
                    ${iconSvg('pencil', 12)}
                  </button>
                </div>
                <div class="row-between" style="margin-top:6px;">
                  <span class="tabular-nums" style="font-size:16px;font-weight:700;color:#0a0a0a;">
                    ${escapeHtml(formatMoneyCompact(totals.totalIncome, user.currency))}
                  </span>
                  <span style="width:24px;height:24px;border-radius:9999px;background:#ecfdf5;color:#059669;display:inline-flex;align-items:center;justify-content:center;">
                    ${iconSvg('arrowUp', 14)}
                  </span>
                </div>
              </div>

              <div class="surface-card" style="margin-top:0;padding:12px;">
                <div class="row-between" style="font-size:12px;">
                  <span style="font-weight:500;color:#404040;">Expenses</span>
                  <button type="button" id="profileAddExpenseBtn" class="row-center" style="gap:4px;font-weight:500;color:#404040;">
                    <span>Edit</span>
                    ${iconSvg('pencil', 12)}
                  </button>
                </div>
                <div class="row-between" style="margin-top:6px;">
                  <span class="tabular-nums" style="font-size:16px;font-weight:700;color:#0a0a0a;">
                    ${escapeHtml(formatMoneyCompact(totals.totalExpenses, user.currency))}
                  </span>
                  <span style="width:24px;height:24px;border-radius:9999px;background:#fef2f2;color:#B91C1C;display:inline-flex;align-items:center;justify-content:center;">
                    ${iconSvg('arrowDown', 14)}
                  </span>
                </div>
              </div>
            </div>

            <div class="surface-card">
              <div class="row-between">
                <span class="font-serif" style="font-size:14px;font-weight:600;color:#171717;">Budget Overview</span>
                <button type="button" id="editBudgetModalBtn" class="row-center" style="gap:4px;font-size:12px;font-weight:500;color:#404040;">
                  <span>Edit</span>
                  ${iconSvg('pencil', 12)}
                </button>
              </div>

              <div class="row-between" style="margin-top:10px;gap:12px;">
                <div style="flex:1;">
                  <div class="row-between" style="font-size:12px;">
                    <span style="color:#525252;">Monthly Budget</span>
                    <span class="tabular-nums" style="font-weight:700;color:#0a0a0a;">
                      ${escapeHtml(formatMoneyCompact(totals.monthlyBudget, user.currency))}
                    </span>
                  </div>
                  <div class="mini-track" style="margin-top:4px;background:#f5f5f5;">
                    <div class="progress-fill critical" style="width:${totals.budgetUsedPercent}%;background:#B91C1C;"></div>
                  </div>
                </div>

                <div style="text-align:right;">
                  <p style="font-size:11px;color:#737373;">Remaining</p>
                  <p class="tabular-nums" style="font-size:12px;font-weight:700;color:#171717;">
                    ${escapeHtml(formatMoneyCompact(totals.budgetRemaining, user.currency))}
                  </p>
                </div>

                <div style="position:relative;width:48px;height:48px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                  <svg viewBox="0 0 44 44" style="width:48px;height:48px;transform:rotate(-90deg);">
                    <circle cx="22" cy="22" r="${ringRadius}" fill="none" stroke="#FEE2E2" stroke-width="4.5" />
                    <circle cx="22" cy="22" r="${ringRadius}" fill="none" stroke="#B91C1C" stroke-width="4.5" stroke-dasharray="${ringCirc}" stroke-dashoffset="${ringOffset}" stroke-linecap="round" />
                  </svg>
                  <span class="tabular-nums" style="position:absolute;font-size:10px;font-weight:700;color:#171717;">
                    ${totals.budgetUsedPercent}%
                  </span>
                </div>
              </div>
            </div>

            <div class="surface-card">
              <div class="row-between">
                <span class="font-serif" style="font-size:14px;font-weight:600;color:#171717;">Savings Goals</span>
                <button type="button" id="editGoalsModalBtn" class="row-center" style="gap:4px;font-size:12px;font-weight:500;color:#404040;">
                  <span>Edit</span>
                  ${iconSvg('pencil', 12)}
                </button>
              </div>

              <div class="profile-goals-row">
                ${savingGoals
                  .map((g, idx) => {
                    const isEmiTax = g.isSystemEmiTax || idx === 3;
                    const target = isEmiTax ? totals.emiTax.totalMonthlyObligation : g.targetAmount;
                    return `
                      <button type="button" data-profile-goal="${idx}" style="display:flex;flex-direction:column;align-items:center;text-align:center;">
                        <span style="width:40px;height:40px;border-radius:9999px;background:#f5f5f5;color:#A80F0F;display:inline-flex;align-items:center;justify-content:center;">
                          ${goalIconSvg(g.icon, 16)}
                        </span>
                        <span style="margin-top:4px;width:100%;font-size:10px;font-weight:600;color:#262626;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                          ${escapeHtml(g.name)}
                        </span>
                        <span class="tabular-nums" style="font-size:10px;font-weight:700;color:#525252;">
                          ${escapeHtml(formatMoneyCompact(target, user.currency))}
                        </span>
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            </div>

            <div class="surface-card">
              <div class="row-between">
                <span class="font-serif" style="font-size:14px;font-weight:600;color:#171717;">Recent Transactions</span>
                <button type="button" id="profileViewAllTxBtn" class="row-center" style="gap:4px;font-size:12px;font-weight:600;color:#B91C1C;">
                  <span>View All</span>
                  ${iconSvg('arrowRight', 14)}
                </button>
              </div>

              ${
                latestTransaction
                  ? `
                    <button type="button" id="profileLatestTxBtn" class="row-between" style="width:100%;margin-top:10px;padding:4px;border-radius:12px;text-align:left;">
                      <div class="row-center" style="gap:10px;min-width:0;">
                        <span class="tx-icon-box" style="width:36px;height:36px;background-color:${escapeHtml(
                          latestTransaction.color || '#4A90D9'
                        )};box-shadow:none;">
                          ${transactionIconSvg(latestTransaction.icon, 16)}
                        </span>
                        <div style="min-width:0;">
                          <p style="font-size:12px;font-weight:600;color:#171717;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${escapeHtml(latestTransaction.name)}
                          </p>
                          <p style="font-size:10px;color:#737373;">${escapeHtml(
                            formatTransactionTime(latestTransaction.dateISO)
                          )}</p>
                        </div>
                      </div>
                      <span class="tabular-nums" style="font-size:12px;font-weight:700;flex-shrink:0;color:${
                        latestTransaction.type === 'income' ? '#059669' : '#B91C1C'
                      };">
                        ${latestTransaction.type === 'income' ? '+' : '-'}${escapeHtml(
                          formatMoneyCompact(latestTransaction.amount, user.currency)
                        )}
                      </span>
                    </button>
                  `
                  : `<p style="margin-top:8px;font-size:12px;color:#737373;">No transactions yet.</p>`
              }

              <div class="row-between" style="margin-top:12px;padding-top:10px;border-top:1px solid #f5f5f5;">
                <span style="font-size:11px;color:#737373;">Personal Records</span>
                <button type="button" id="profileOpenExportBtn" class="row-center" style="min-height:36px;border-radius:12px;border:1px solid #e5e5e5;background:#fafafa;padding:0 12px;font-size:12px;font-weight:600;color:#262626;gap:6px;">
                  <span style="color:#A80F0F;display:inline-flex;">${iconSvg('download', 14)}</span>
                  <span>Export CSV / PDF</span>
                </button>
              </div>
            </div>
          </div>

          ${renderBottomNav('profile')}
          <div id="profileModalHost"></div>
        </div>
      `;

      container.querySelector('#profileSettingsBtn')?.addEventListener('click', () => {
        local.currencyDraft = user.currency;
        local.modal = 'settings';
        renderModals();
      });
      container.querySelector('#avatarUploadBtn')?.addEventListener('click', () => {
        container.querySelector('#avatarFileInput')?.click();
      });
      container.querySelector('#avatarFileInput')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            const size = 192;
            canvas.width = size;
            canvas.height = size;
            const c2d = canvas.getContext('2d');
            if (!c2d) return;
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;
            c2d.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            await ctx.updateProfile({ avatarUrl: dataUrl });
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });

      const openNameModal = () => {
        local.nameDraft = user.name;
        local.taglineDraft = user.tagline;
        local.modal = 'name';
        renderModals();
      };
      container.querySelector('#editNameBtn')?.addEventListener('click', openNameModal);
      container.querySelector('#editTaglineBtn')?.addEventListener('click', openNameModal);

      container.querySelector('#editBalanceBtn')?.addEventListener('click', () => {
        local.openingBalanceDraft = String(user.openingBalance);
        local.currencyDraft = user.currency;
        local.modal = 'balance';
        renderModals();
      });
      container.querySelector('#profileAddIncomeBtn')?.addEventListener('click', () =>
        ctx.openTransactionModal(null, 'income')
      );
      container.querySelector('#profileAddExpenseBtn')?.addEventListener('click', () =>
        ctx.openTransactionModal(null, 'expense')
      );
      container.querySelector('#editBudgetModalBtn')?.addEventListener('click', () => {
        local.budgetDraft = String(user.monthlyBudget);
        local.modal = 'budget';
        renderModals();
      });
      container.querySelector('#editGoalsModalBtn')?.addEventListener('click', () => {
        local.goalsDraft = savingGoals.map((g) => ({ ...g }));
        local.modal = 'goals';
        renderModals();
      });
      container.querySelectorAll('[data-profile-goal]').forEach((btn) => {
        btn.addEventListener('click', () => ctx.navigate('analytics'));
      });
      container.querySelector('#profileViewAllTxBtn')?.addEventListener('click', () => ctx.navigate('transactions'));
      container.querySelector('#profileLatestTxBtn')?.addEventListener('click', () => {
        if (latestTransaction) ctx.openTransactionModal(latestTransaction);
      });
      container.querySelector('#profileOpenExportBtn')?.addEventListener('click', () => {
        local.exportFeedback = null;
        local.modal = 'export';
        renderModals();
      });

      container.querySelectorAll('[data-nav]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (unsubPWA) {
            unsubPWA();
            unsubPWA = null;
          }
          ctx.navigate(btn.dataset.nav);
        });
      });
    }

    function renderModals() {
      const host = container.querySelector('#profileModalHost');
      if (!host) return;
      if (unsubPWA) {
        unsubPWA();
        unsubPWA = null;
      }

      const closeModal = () => {
        local.modal = 'none';
        renderModals();
      };

      if (local.modal === 'name') {
        host.innerHTML = `
          <div class="modal-backdrop" id="profileModalBackdrop">
            <div class="modal-card">
              <div class="modal-header">
                <h3 class="font-serif" style="font-size:18px;font-weight:700;">Edit Profile</h3>
                <button type="button" id="profileModalCloseBtn" aria-label="Close" class="icon-btn-circle">${iconSvg('x', 20)}</button>
              </div>
              <form id="profileNameForm" class="stack-md" style="margin-top:16px;">
                <div>
                  <label class="field-label" for="prNameInput">Name</label>
                  <input id="prNameInput" type="text" required value="${escapeHtml(local.nameDraft)}" class="input" />
                </div>
                <div>
                  <label class="field-label" for="prTaglineInput">Tagline</label>
                  <input id="prTaglineInput" type="text" value="${escapeHtml(local.taglineDraft)}" class="input" />
                </div>
                <button type="submit" ${local.saving ? 'disabled' : ''} class="btn-primary">
                  ${local.saving ? '<span class="spinner"></span>' : ''}
                  <span>Save Profile</span>
                </button>
              </form>
            </div>
          </div>
        `;
        host.querySelector('#profileModalCloseBtn')?.addEventListener('click', closeModal);
        host.querySelector('#profileModalBackdrop')?.addEventListener('click', (e) => {
          if (e.target.id === 'profileModalBackdrop') closeModal();
        });
        host.querySelector('#prNameInput')?.addEventListener('input', (e) => (local.nameDraft = e.target.value));
        host.querySelector('#prTaglineInput')?.addEventListener('input', (e) => (local.taglineDraft = e.target.value));
        host.querySelector('#profileNameForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (!local.nameDraft.trim()) return;
          local.saving = true;
          renderModals();
          try {
            await ctx.updateProfile({ name: local.nameDraft.trim(), tagline: local.taglineDraft.trim() });
            local.modal = 'none';
          } finally {
            local.saving = false;
          }
        });
        return;
      }

      if (local.modal === 'balance') {
        host.innerHTML = `
          <div class="modal-backdrop" id="profileModalBackdrop">
            <div class="modal-card">
              <div class="modal-header">
                <h3 class="font-serif" style="font-size:18px;font-weight:700;">Edit Balance & Currency</h3>
                <button type="button" id="profileModalCloseBtn" aria-label="Close" class="icon-btn-circle">${iconSvg('x', 20)}</button>
              </div>
              <form id="profileBalanceForm" class="stack-md" style="margin-top:16px;">
                <div>
                  <label class="field-label" for="prOpeningBal">Starting / Opening Balance</label>
                  <input id="prOpeningBal" type="number" min="0" step="any" value="${escapeHtml(local.openingBalanceDraft)}" class="input tabular-nums" />
                  <p style="margin-top:4px;font-size:11px;color:#737373;">
                    Total Balance = Starting Balance + Total Income − Total Expenses
                  </p>
                </div>
                <div>
                  <label class="field-label" for="prCurrencySelect">Currency</label>
                  <select id="prCurrencySelect" class="input">
                    ${Object.keys(CURRENCY_META)
                      .map(
                        (c) => `<option value="${c}" ${local.currencyDraft === c ? 'selected' : ''}>${escapeHtml(CURRENCY_META[c].label)}</option>`
                      )
                      .join('')}
                  </select>
                </div>
                <button type="submit" ${local.saving ? 'disabled' : ''} class="btn-primary">
                  ${local.saving ? '<span class="spinner"></span>' : ''}
                  <span>Update Balance</span>
                </button>
              </form>
            </div>
          </div>
        `;
        host.querySelector('#profileModalCloseBtn')?.addEventListener('click', closeModal);
        host.querySelector('#profileModalBackdrop')?.addEventListener('click', (e) => {
          if (e.target.id === 'profileModalBackdrop') closeModal();
        });
        host.querySelector('#prOpeningBal')?.addEventListener('input', (e) => (local.openingBalanceDraft = e.target.value));
        host.querySelector('#prCurrencySelect')?.addEventListener('change', (e) => (local.currencyDraft = e.target.value));
        host.querySelector('#profileBalanceForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          local.saving = true;
          renderModals();
          try {
            await ctx.updateProfile({
              openingBalance: Math.max(0, Number(local.openingBalanceDraft) || 0),
              currency: local.currencyDraft,
            });
            local.modal = 'none';
          } finally {
            local.saving = false;
          }
        });
        return;
      }

      if (local.modal === 'budget') {
        const symbol = CURRENCY_META[user.currency]?.symbol || 'Rs.';
        host.innerHTML = `
          <div class="modal-backdrop" id="profileModalBackdrop">
            <div class="modal-card">
              <div class="modal-header">
                <h3 class="font-serif" style="font-size:18px;font-weight:700;">Edit Monthly Budget</h3>
                <button type="button" id="profileModalCloseBtn" aria-label="Close" class="icon-btn-circle">${iconSvg('x', 20)}</button>
              </div>
              <form id="profileBudgetForm" class="stack-md" style="margin-top:16px;">
                <div>
                  <label class="field-label" for="prBudgetInput">Monthly Budget Limit (${escapeHtml(symbol)})</label>
                  <input id="prBudgetInput" type="number" min="0" step="any" value="${escapeHtml(local.budgetDraft)}" class="input tabular-nums" />
                </div>
                <button type="submit" ${local.saving ? 'disabled' : ''} class="btn-primary">
                  ${local.saving ? '<span class="spinner"></span>' : ''}
                  <span>Save Budget</span>
                </button>
              </form>
            </div>
          </div>
        `;
        host.querySelector('#profileModalCloseBtn')?.addEventListener('click', closeModal);
        host.querySelector('#profileModalBackdrop')?.addEventListener('click', (e) => {
          if (e.target.id === 'profileModalBackdrop') closeModal();
        });
        host.querySelector('#prBudgetInput')?.addEventListener('input', (e) => (local.budgetDraft = e.target.value));
        host.querySelector('#profileBudgetForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          local.saving = true;
          renderModals();
          try {
            await ctx.updateProfile({ monthlyBudget: Math.max(0, Number(local.budgetDraft) || 0) });
            local.modal = 'none';
          } finally {
            local.saving = false;
          }
        });
        return;
      }

      if (local.modal === 'goals') {
        host.innerHTML = `
          <div class="modal-backdrop" id="profileModalBackdrop">
            <div class="modal-card">
              <div class="modal-header">
                <h3 class="font-serif" style="font-size:18px;font-weight:700;">Edit Saving Goals</h3>
                <button type="button" id="profileModalCloseBtn" aria-label="Close" class="icon-btn-circle">${iconSvg('x', 20)}</button>
              </div>
              <form id="profileGoalsForm" class="stack-md" style="margin-top:16px;gap:12px;">
                ${local.goalsDraft
                  .slice(0, 3)
                  .map(
                    (g, idx) => `
                      <div style="border-radius:12px;border:1px solid #e5e5e5;padding:12px;" class="stack-sm">
                        <input type="text" data-pg-name="${idx}" value="${escapeHtml(g.name)}" class="input-sm" style="font-weight:600;" />
                        <div class="grid-2" style="gap:8px;">
                          <input type="number" min="0" data-pg-saved="${idx}" value="${g.savedAmount}" placeholder="Saved" class="input-sm tabular-nums" />
                          <input type="number" min="0" data-pg-target="${idx}" value="${g.targetAmount}" placeholder="Target" class="input-sm tabular-nums" />
                        </div>
                      </div>
                    `
                  )
                  .join('')}
                <p style="font-size:11px;color:#737373;">
                  EMI & Tax is automatically calculated from your Analytics EMI & Tax calculator.
                </p>
                <button type="submit" ${local.saving ? 'disabled' : ''} class="btn-primary">
                  ${local.saving ? '<span class="spinner"></span>' : ''}
                  <span>Save Goals</span>
                </button>
              </form>
            </div>
          </div>
        `;
        host.querySelector('#profileModalCloseBtn')?.addEventListener('click', closeModal);
        host.querySelector('#profileModalBackdrop')?.addEventListener('click', (e) => {
          if (e.target.id === 'profileModalBackdrop') closeModal();
        });
        host.querySelectorAll('[data-pg-name]').forEach((inp) => {
          inp.addEventListener('input', (e) => {
            local.goalsDraft[Number(inp.dataset.pgName)].name = e.target.value;
          });
        });
        host.querySelectorAll('[data-pg-saved]').forEach((inp) => {
          inp.addEventListener('input', (e) => {
            local.goalsDraft[Number(inp.dataset.pgSaved)].savedAmount = Number(e.target.value) || 0;
          });
        });
        host.querySelectorAll('[data-pg-target]').forEach((inp) => {
          inp.addEventListener('input', (e) => {
            local.goalsDraft[Number(inp.dataset.pgTarget)].targetAmount = Number(e.target.value) || 0;
          });
        });
        host.querySelector('#profileGoalsForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          local.saving = true;
          renderModals();
          try {
            await ctx.updateGoals(local.goalsDraft);
            local.modal = 'none';
          } finally {
            local.saving = false;
          }
        });
        return;
      }

      if (local.modal === 'settings') {
        const renderPwaBtn = () => {
          const pwa = getPWAStatus();
          const pwaHost = host.querySelector('#pwaInstallSlot');
          if (!pwaHost) return;
          if (pwa.isInstalled) {
            pwaHost.innerHTML = '';
            return;
          }
          if (pwa.isInstallable) {
            pwaHost.innerHTML = `
              <button type="button" id="pwaTriggerInstallBtn" class="btn-primary" style="min-height:44px;border-radius:12px;font-size:14px;">
                ${iconSvg('download', 16)}
                <span>Install Android App</span>
              </button>
            `;
            pwaHost.querySelector('#pwaTriggerInstallBtn')?.addEventListener('click', triggerPWAInstall);
          } else {
            pwaHost.innerHTML = `
              <button type="button" id="pwaGuideOpenBtn" class="btn-secondary" style="border-radius:12px;">
                <span style="color:#A80F0F;display:inline-flex;">${iconSvg('smartphone', 16)}</span>
                <span>${pwa.isIOS ? 'Add to iPhone Home Screen' : 'Install as Android App'}</span>
              </button>
            `;
            pwaHost.querySelector('#pwaGuideOpenBtn')?.addEventListener('click', () => {
              local.modal = 'pwaGuide';
              renderModals();
            });
          }
        };

        host.innerHTML = `
          <div class="modal-backdrop" id="profileModalBackdrop">
            <div class="modal-card stack-md" style="gap:16px;">
              <div class="modal-header">
                <h3 class="font-serif" style="font-size:18px;font-weight:700;">App Settings</h3>
                <button type="button" id="profileModalCloseBtn" aria-label="Close" class="icon-btn-circle">${iconSvg('x', 20)}</button>
              </div>

              <div style="font-size:12px;color:#525252;">
                Signed in as <strong style="color:#171717;">${escapeHtml(user.email)}</strong>
              </div>

              <div id="pwaInstallSlot"></div>

              <button type="button" id="settingsExportBtn" class="btn-secondary" style="border-radius:12px;">
                <span style="color:#A80F0F;display:inline-flex;">${iconSvg('download', 16)}</span>
                <span>Export History (CSV / PDF)</span>
              </button>

              <button type="button" id="settingsSignOutBtn" class="btn-danger-outline">
                ${iconSvg('logout', 16)}
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        `;

        renderPwaBtn();
        unsubPWA = subscribePWA(renderPwaBtn);

        host.querySelector('#profileModalCloseBtn')?.addEventListener('click', closeModal);
        host.querySelector('#profileModalBackdrop')?.addEventListener('click', (e) => {
          if (e.target.id === 'profileModalBackdrop') closeModal();
        });
        host.querySelector('#settingsExportBtn')?.addEventListener('click', () => {
          local.exportFeedback = null;
          local.modal = 'export';
          renderModals();
        });
        host.querySelector('#settingsSignOutBtn')?.addEventListener('click', () => {
          closeModal();
          ctx.signOut();
        });
        return;
      }

      if (local.modal === 'pwaGuide') {
        const pwa = getPWAStatus();
        host.innerHTML = `
          <div class="modal-backdrop" id="profileModalBackdrop">
            <div class="modal-card" style="max-width:384px;border-radius:16px;">
              <h3 class="font-serif" style="font-size:18px;font-weight:700;color:#171717;">Install Pennywyse on Your Phone</h3>
              <p style="margin-top:8px;font-size:14px;color:#525252;line-height:1.5;">
                ${
                  pwa.isIOS
                    ? '1. Tap the <strong>Share</strong> icon in Safari.<br/>2. Scroll down and tap <strong>Add to Home Screen</strong>.'
                    : 'Open this page in <strong>Chrome on Android</strong>, tap the browser menu (<strong>⋮</strong>), and select <strong>Install app</strong> or <strong>Add to Home screen</strong> to launch Pennywyse with its app icon.'
                }
              </p>
              <button type="button" id="pwaGuideGotItBtn" class="btn-primary" style="margin-top:16px;min-height:44px;border-radius:12px;font-size:14px;">
                Got it
              </button>
            </div>
          </div>
        `;
        host.querySelector('#pwaGuideGotItBtn')?.addEventListener('click', () => {
          local.modal = 'settings';
          renderModals();
        });
        host.querySelector('#profileModalBackdrop')?.addEventListener('click', (e) => {
          if (e.target.id === 'profileModalBackdrop') {
            local.modal = 'settings';
            renderModals();
          }
        });
        return;
      }

      if (local.modal === 'export') {
        const updateExportSummary = () => {
          const list = getExportableTransactions();
          const countEl = host.querySelector('#exportRecordCount');
          if (countEl) countEl.textContent = `${list.length} transaction(s)`;
          const fbEl = host.querySelector('#exportFeedbackBox');
          if (fbEl) {
            fbEl.textContent = local.exportFeedback || '';
            fbEl.style.display = local.exportFeedback ? 'block' : 'none';
          }
          host.querySelectorAll('[data-export-type]').forEach((btn) => {
            btn.classList.toggle('active-crimson', btn.dataset.exportType === local.exportType);
          });
        };

        host.innerHTML = `
          <div class="modal-backdrop" id="profileModalBackdrop">
            <div class="modal-card stack-md" style="gap:16px;">
              <div class="modal-header">
                <div>
                  <h3 class="font-serif" style="font-size:18px;font-weight:700;color:#171717;">Export Transaction History</h3>
                  <p style="font-size:12px;color:#737373;">Download your personal records as CSV or PDF</p>
                </div>
                <button type="button" id="profileModalCloseBtn" aria-label="Close export modal" class="icon-btn-circle">${iconSvg('x', 20)}</button>
              </div>

              <div>
                <label class="field-label" style="margin-bottom:6px;">Include Transactions</label>
                <div class="segment-box-3">
                  <button type="button" data-export-type="all" class="segment-btn ${local.exportType === 'all' ? 'active-crimson' : ''}">All</button>
                  <button type="button" data-export-type="income" class="segment-btn ${local.exportType === 'income' ? 'active-crimson' : ''}">Income</button>
                  <button type="button" data-export-type="expense" class="segment-btn ${local.exportType === 'expense' ? 'active-crimson' : ''}">Expenses</button>
                </div>
              </div>

              <div class="grid-2">
                <div>
                  <label class="field-label" for="exportFromInput">From Date (Optional)</label>
                  <input id="exportFromInput" type="date" value="${escapeHtml(local.exportFromDate)}" class="input-sm" />
                </div>
                <div>
                  <label class="field-label" for="exportToInput">To Date (Optional)</label>
                  <input id="exportToInput" type="date" value="${escapeHtml(local.exportToDate)}" class="input-sm" />
                </div>
              </div>

              <div class="row-between" style="border-radius:12px;border:1px solid #e5e5e5;background:#fafafa;padding:10px 14px;font-size:12px;">
                <span style="color:#525252;">Records ready to export</span>
                <span id="exportRecordCount" class="tabular-nums" style="font-weight:700;color:#171717;">
                  ${getExportableTransactions().length} transaction(s)
                </span>
              </div>

              <p id="exportFeedbackBox" style="display:none;border-radius:12px;border:1px solid #a7f3d0;background:#ecfdf5;padding:8px 12px;font-size:12px;font-weight:500;color:#065f46;"></p>

              <div class="grid-2">
                <button type="button" id="downloadCsvBtn" class="btn-secondary">
                  <span style="color:#047857;display:inline-flex;">${iconSvg('spreadsheet', 16)}</span>
                  <span>Download CSV</span>
                </button>
                <button type="button" id="downloadPdfBtn" class="btn-primary" style="min-height:44px;font-size:14px;">
                  ${iconSvg('fileText', 16)}
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        `;

        host.querySelector('#profileModalCloseBtn')?.addEventListener('click', closeModal);
        host.querySelector('#profileModalBackdrop')?.addEventListener('click', (e) => {
          if (e.target.id === 'profileModalBackdrop') closeModal();
        });
        host.querySelectorAll('[data-export-type]').forEach((btn) => {
          btn.addEventListener('click', () => {
            local.exportType = btn.dataset.exportType;
            local.exportFeedback = null;
            updateExportSummary();
          });
        });
        host.querySelector('#exportFromInput')?.addEventListener('change', (e) => {
          local.exportFromDate = e.target.value;
          local.exportFeedback = null;
          updateExportSummary();
        });
        host.querySelector('#exportToInput')?.addEventListener('change', (e) => {
          local.exportToDate = e.target.value;
          local.exportFeedback = null;
          updateExportSummary();
        });
        host.querySelector('#downloadCsvBtn')?.addEventListener('click', () => {
          const list = getExportableTransactions();
          exportTransactionsCsv({ transactions: list, currency: user.currency });
          local.exportFeedback = `Downloaded CSV with ${list.length} transaction(s).`;
          updateExportSummary();
        });
        host.querySelector('#downloadPdfBtn')?.addEventListener('click', () => {
          const list = getExportableTransactions();
          exportTransactionsPdf({
            user,
            transactions: list,
            totalBalance: totals.totalBalance,
            exportType: local.exportType,
            exportFromDate: local.exportFromDate,
            exportToDate: local.exportToDate,
          });
          local.exportFeedback = `Downloaded PDF statement with ${list.length} transaction(s).`;
          updateExportSummary();
        });
        return;
      }

      host.innerHTML = '';
    }

    renderMain();
  }

  PW.renderProfileScreen = renderProfileScreen;
})(window);

(function (global) {
  const PW = (global.PW = global.PW || {});

  const GOAL_ICONS = ['plane', 'shield', 'home', 'car', 'graduation', 'heart', 'sparkles'];

  function buildMonthOptions() {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      options.push({ key, label });
    }
    return options;
  }

  function renderAnalyticsScreen(container, ctx) {
    const {
      computeAnalyticsData,
      computeDashboardTotals,
      CURRENCY_META,
      formatMoneyCompact,
      goalIconSvg,
      iconSvg,
      pennywyseLogoSvg,
      escapeHtml,
      renderBottomNav,
    } = PW;

    const { user, transactions, savingGoals } = ctx.state;
    const monthOptions = buildMonthOptions();
    const todayISO = new Date().toISOString().slice(0, 10);
    const firstOfMonthISO = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

    const local = {
      period: 'month',
      selectedMonthKey: monthOptions[0].key,
      customStart: firstOfMonthISO,
      customEnd: todayISO,
      editingGoalIdx: null,
      goalDraft: null,
      showEmiTaxModal: false,
      emiDraft: { ...user.emiTaxConfig },
      showSavingsTargetModal: false,
      savingsTargetInput: String(user.monthlySavingsTarget || 0),
      saving: false,
    };

    function getDashboard() {
      const [selYr, selMo] = local.selectedMonthKey.split('-').map(Number);
      const selectedMonthDate = new Date(selYr || new Date().getFullYear(), (selMo || 1) - 1, 1);
      return computeDashboardTotals(user, transactions, selectedMonthDate);
    }

    function renderMain() {
      const analytics = computeAnalyticsData(
        transactions,
        local.period,
        local.selectedMonthKey,
        local.customStart,
        local.customEnd
      );
      const dashboard = getDashboard();
      const pctChange = analytics.percentChange;

      const radius = 48;
      const circumference = 2 * Math.PI * radius;
      let offset = 0;
      const donutSegments = analytics.slices.map((slice) => {
        const len = (slice.percentage / 100) * circumference;
        const seg = {
          ...slice,
          dashArray: `${len} ${Math.max(0, circumference - len)}`,
          dashOffset: -offset,
        };
        offset += len;
        return seg;
      });

      const totalShort = analytics.totalSpending.toLocaleString(CURRENCY_META[user.currency].locale);

      container.innerHTML = `
        <div class="screen">
          <div class="screen-scroll">
            <div class="screen-header">
              ${pennywyseLogoSvg('sm')}
              <div class="screen-header-title">
                ${iconSvg('chart', 20, 2.3)}
                <h1>Analytics</h1>
              </div>
              <button type="button" id="openAiBtn" aria-label="Open Pennywyse AI Assistant" title="Pennywyse AI Money Coach" class="ai-header-btn crimson-gradient">
                ${iconSvg('bot', 16)}
                <span>AI</span>
              </button>
            </div>

            <div class="period-grid">
              ${['week', 'month', 'year', 'custom']
                .map(
                  (p) => `
                    <button type="button" data-period="${p}" class="period-btn ${local.period === p ? 'active' : ''}" style="text-transform:capitalize;">
                      ${p}
                    </button>
                  `
                )
                .join('')}
            </div>

            ${
              local.period === 'custom'
                ? `
                  <div class="grid-2" style="margin-top:12px;border-radius:12px;border:1px solid #e5e5e5;background:#fafafa;padding:10px;gap:8px;">
                    <div>
                      <label class="field-label-xs" for="customStartInput">Start Date</label>
                      <input id="customStartInput" type="date" value="${escapeHtml(local.customStart)}" class="input-sm" />
                    </div>
                    <div>
                      <label class="field-label-xs" for="customEndInput">End Date</label>
                      <input id="customEndInput" type="date" value="${escapeHtml(local.customEnd)}" class="input-sm" />
                    </div>
                  </div>
                `
                : ''
            }

            <div class="row-between" style="margin-top:16px;align-items:flex-start;">
              <div>
                <p class="font-serif" style="font-size:17px;color:#171717;">Total spending:</p>
                <p class="tabular-nums" style="margin-top:2px;font-size:26px;font-weight:800;letter-spacing:-0.02em;color:#0a0a0a;line-height:1.15;">
                  ${escapeHtml(formatMoneyCompact(analytics.totalSpending, user.currency))}
                </p>
                <p style="margin-top:2px;font-size:12px;font-weight:500;">
                  ${
                    pctChange === null
                      ? `<span style="color:#737373;">No prior data ${escapeHtml(analytics.comparisonLabel)}</span>`
                      : `<span style="color:${pctChange > 0 ? '#B91C1C' : '#047857'};">${
                          pctChange > 0 ? `+${pctChange}%` : `${pctChange}%`
                        } ${escapeHtml(analytics.comparisonLabel)}</span>`
                  }
                </p>
              </div>

              ${
                local.period !== 'custom'
                  ? `
                    <div style="position:relative;">
                      <select id="analyticsMonthSelect" aria-label="Select month" style="appearance:none;border-radius:12px;border:1px solid #e5e5e5;background:#fafafa;padding:6px 28px 6px 12px;font-size:12px;font-weight:600;color:#262626;">
                        ${monthOptions
                          .map(
                            (m) => `
                              <option value="${m.key}" ${local.selectedMonthKey === m.key ? 'selected' : ''}>
                                ${escapeHtml(local.period === 'year' ? m.key.slice(0, 4) : m.label)}
                              </option>
                            `
                          )
                          .join('')}
                      </select>
                      <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;color:#525252;display:inline-flex;">
                        ${iconSvg('chevronDown', 14)}
                      </span>
                    </div>
                  `
                  : ''
              }
            </div>

            <div class="donut-section">
              <div class="donut-box">
                <svg viewBox="0 0 130 130" style="width:160px;height:160px;transform:rotate(-90deg);">
                  <circle cx="65" cy="65" r="48" fill="none" stroke="#F3F4F6" stroke-width="20" />
                  ${donutSegments
                    .map(
                      (seg) => `
                        <circle cx="65" cy="65" r="48" fill="none" stroke="${escapeHtml(
                          seg.color
                        )}" stroke-width="20" stroke-dasharray="${seg.dashArray}" stroke-dashoffset="${seg.dashOffset}" />
                      `
                    )
                    .join('')}
                </svg>
                <div class="donut-center">
                  <span class="tabular-nums" style="font-size:14px;font-weight:800;color:#171717;line-height:1.15;">
                    ${escapeHtml(totalShort)}
                  </span>
                  <span style="font-size:11px;font-weight:500;color:#525252;">Total</span>
                </div>
              </div>

              <div class="donut-legend">
                ${
                  analytics.slices.length === 0
                    ? `<p style="font-size:12px;color:#737373;">No expenses recorded for this period yet.</p>`
                    : analytics.slices
                        .map(
                          (slice) => `
                            <div class="legend-item">
                              <div class="row-center" style="gap:6px;min-width:0;">
                                <span style="width:10px;height:10px;border-radius:9999px;flex-shrink:0;background-color:${escapeHtml(
                                  slice.color
                                )};"></span>
                                <span style="color:#262626;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(
                                  slice.category
                                )}:</span>
                              </div>
                              <span class="tabular-nums" style="font-weight:600;color:#171717;flex-shrink:0;">
                                ${slice.percentage}%
                              </span>
                            </div>
                          `
                        )
                        .join('')
                }
              </div>
            </div>

            <div class="savings-cards-grid">
              <button type="button" id="editSavedTargetCard" class="saved-card">
                <div class="row-between">
                  <span class="font-serif" style="font-size:14px;font-weight:500;color:#047857;">Saved:</span>
                  <span style="color:#737373;display:inline-flex;">${iconSvg('pencil', 12)}</span>
                </div>
                <p class="tabular-nums" style="margin-top:4px;font-size:16px;font-weight:700;color:#0a0a0a;">
                  ${escapeHtml(formatMoneyCompact(dashboard.actualSavedThisMonth, user.currency))}
                </p>
                <p class="tabular-nums" style="margin-top:2px;font-size:10px;color:#737373;">
                  Goal: ${escapeHtml(formatMoneyCompact(dashboard.monthlySavingsTarget, user.currency))}
                </p>
              </button>

              <button type="button" id="editRemainingTargetCard" class="remaining-card">
                <div class="row-between">
                  <span class="font-serif" style="font-size:14px;font-weight:500;color:#B91C1C;">Remaining:</span>
                  <span style="color:rgba(185,28,28,0.7);display:inline-flex;">${iconSvg('pencil', 12)}</span>
                </div>
                <p class="tabular-nums" style="margin-top:4px;font-size:16px;font-weight:700;color:#0a0a0a;">
                  ${escapeHtml(formatMoneyCompact(dashboard.remainingToSave, user.currency))}
                </p>
                <p style="margin-top:2px;font-size:10px;color:#525252;">To monthly savings target</p>
              </button>
            </div>

            <div class="goals-grid">
              ${savingGoals
                .map((goal, idx) => {
                  const isEmiTax = goal.isSystemEmiTax || idx === 3;
                  const savedVal = isEmiTax ? dashboard.emiTaxPaidThisMonth : goal.savedAmount;
                  const targetVal = isEmiTax ? dashboard.emiTax.totalMonthlyObligation : goal.targetAmount;
                  return `
                    <button type="button" data-open-goal="${idx}" class="goal-card">
                      <div class="row-between" style="gap:6px;">
                        <div class="row-center" style="gap:6px;min-width:0;">
                          <span style="color:#171717;display:inline-flex;flex-shrink:0;">${goalIconSvg(goal.icon, 16)}</span>
                          <span class="font-serif" style="font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${escapeHtml(goal.name)}
                          </span>
                        </div>
                        <span style="color:#262626;display:inline-flex;flex-shrink:0;">
                          ${isEmiTax ? iconSvg('calculator', 14) : iconSvg('pencil', 12)}
                        </span>
                      </div>
                      <p class="tabular-nums" style="margin-top:6px;font-size:12px;font-weight:700;color:#171717;">
                        ${escapeHtml(formatMoneyCompact(savedVal, user.currency))} / ${escapeHtml(
                    formatMoneyCompact(targetVal, user.currency)
                  )}
                      </p>
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>

          ${renderBottomNav('analytics')}
          <div id="analyticsModalHost"></div>
        </div>
      `;

      container.querySelector('#openAiBtn')?.addEventListener('click', () => ctx.navigate('ai'));
      container.querySelectorAll('[data-period]').forEach((btn) => {
        btn.addEventListener('click', () => {
          local.period = btn.dataset.period;
          renderMain();
        });
      });
      container.querySelector('#customStartInput')?.addEventListener('change', (e) => {
        local.customStart = e.target.value;
        renderMain();
      });
      container.querySelector('#customEndInput')?.addEventListener('change', (e) => {
        local.customEnd = e.target.value;
        renderMain();
      });
      container.querySelector('#analyticsMonthSelect')?.addEventListener('change', (e) => {
        local.selectedMonthKey = e.target.value;
        renderMain();
      });

      const openSavingsModal = () => {
        local.savingsTargetInput = String(user.monthlySavingsTarget || 0);
        local.showSavingsTargetModal = true;
        renderModals();
      };
      container.querySelector('#editSavedTargetCard')?.addEventListener('click', openSavingsModal);
      container.querySelector('#editRemainingTargetCard')?.addEventListener('click', openSavingsModal);

      container.querySelectorAll('[data-open-goal]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.openGoal);
          const g = savingGoals[idx];
          if (!g) return;
          if (g.isSystemEmiTax || idx === 3) {
            local.emiDraft = { ...user.emiTaxConfig };
            local.showEmiTaxModal = true;
            renderModals();
            return;
          }
          local.editingGoalIdx = idx;
          local.goalDraft = { ...g };
          renderModals();
        });
      });

      container.querySelectorAll('[data-nav]').forEach((btn) => {
        btn.addEventListener('click', () => ctx.navigate(btn.dataset.nav));
      });
    }

    function renderModals() {
      const host = container.querySelector('#analyticsModalHost');
      if (!host) return;

      if (local.editingGoalIdx !== null && local.goalDraft) {
        const g = local.goalDraft;
        host.innerHTML = `
          <div class="modal-backdrop" id="analyticsModalBackdrop">
            <div class="modal-card">
              <div class="modal-header">
                <h3 class="font-serif" style="font-size:18px;font-weight:700;color:#171717;">Edit Saving Goal</h3>
                <button type="button" id="closeAnalyticsModalBtn" aria-label="Close" class="icon-btn-circle">
                  ${iconSvg('x', 20)}
                </button>
              </div>
              <form id="goalEditForm" class="stack-md" style="margin-top:16px;">
                <div>
                  <label class="field-label" for="goalNameInput">Goal Name</label>
                  <input id="goalNameInput" type="text" required value="${escapeHtml(g.name)}" class="input" />
                </div>
                <div class="grid-2">
                  <div>
                    <label class="field-label" for="goalSavedInput">Saved So Far</label>
                    <input id="goalSavedInput" type="number" min="0" value="${g.savedAmount}" class="input tabular-nums" />
                  </div>
                  <div>
                    <label class="field-label" for="goalTargetInput">Target Amount</label>
                    <input id="goalTargetInput" type="number" min="0" value="${g.targetAmount}" class="input tabular-nums" />
                  </div>
                </div>
                <div>
                  <label class="field-label" style="margin-bottom:6px;">Icon</label>
                  <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    ${GOAL_ICONS.map(
                      (ic) => `
                        <button type="button" data-goal-icon-pick="${ic}" class="icon-choice ${
                        g.icon === ic ? 'active' : ''
                      }" style="width:40px;color:${g.icon === ic ? '#A80F0F' : '#404040'};border-color:${
                        g.icon === ic ? '#A80F0F' : '#e5e5e5'
                      };background:${g.icon === ic ? '#fef2f2' : '#ffffff'};">
                          ${goalIconSvg(ic, 16)}
                        </button>
                      `
                    ).join('')}
                  </div>
                </div>
                <button type="submit" ${local.saving ? 'disabled' : ''} class="btn-primary">
                  ${local.saving ? '<span class="spinner"></span>' : ''}
                  <span>Save Goal</span>
                </button>
              </form>
            </div>
          </div>
        `;

        host.querySelector('#closeAnalyticsModalBtn')?.addEventListener('click', () => {
          local.editingGoalIdx = null;
          renderModals();
        });
        host.querySelector('#analyticsModalBackdrop')?.addEventListener('click', (e) => {
          if (e.target.id === 'analyticsModalBackdrop') {
            local.editingGoalIdx = null;
            renderModals();
          }
        });
        host.querySelector('#goalNameInput')?.addEventListener('input', (e) => (local.goalDraft.name = e.target.value));
        host.querySelector('#goalSavedInput')?.addEventListener('input', (e) => {
          local.goalDraft.savedAmount = Math.max(0, Number(e.target.value) || 0);
        });
        host.querySelector('#goalTargetInput')?.addEventListener('input', (e) => {
          local.goalDraft.targetAmount = Math.max(0, Number(e.target.value) || 0);
        });
        host.querySelectorAll('[data-goal-icon-pick]').forEach((btn) => {
          btn.addEventListener('click', () => {
            local.goalDraft.icon = btn.dataset.goalIconPick;
            renderModals();
          });
        });
        host.querySelector('#goalEditForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          local.saving = true;
          renderModals();
          try {
            const updated = savingGoals.map((item, i) => (i === local.editingGoalIdx ? local.goalDraft : item));
            await ctx.updateGoals(updated);
            local.editingGoalIdx = null;
            local.goalDraft = null;
          } finally {
            local.saving = false;
          }
        });
        return;
      }

      if (local.showSavingsTargetModal) {
        const symbol = CURRENCY_META[user.currency]?.symbol || 'Rs.';
        host.innerHTML = `
          <div class="modal-backdrop" id="analyticsModalBackdrop">
            <div class="modal-card">
              <div class="modal-header">
                <h3 class="font-serif" style="font-size:18px;font-weight:700;color:#171717;">Monthly Savings Target</h3>
                <button type="button" id="closeAnalyticsModalBtn" aria-label="Close" class="icon-btn-circle">
                  ${iconSvg('x', 20)}
                </button>
              </div>
              <form id="savingsTargetForm" class="stack-md" style="margin-top:16px;">
                <p style="font-size:12px;color:#525252;line-height:1.45;">
                  Set how much you want to save each month. Pennywyse tracks your net monthly savings against this target under "Saved" and "Remaining".
                </p>
                <div>
                  <label class="field-label" for="savingsTargetInput">Target Amount (${escapeHtml(symbol)})</label>
                  <input id="savingsTargetInput" type="number" min="0" required value="${escapeHtml(local.savingsTargetInput)}" class="input tabular-nums" />
                </div>
                <button type="submit" ${local.saving ? 'disabled' : ''} class="btn-primary">
                  ${local.saving ? '<span class="spinner"></span>' : ''}
                  <span>Update Savings Target</span>
                </button>
              </form>
            </div>
          </div>
        `;

        host.querySelector('#closeAnalyticsModalBtn')?.addEventListener('click', () => {
          local.showSavingsTargetModal = false;
          renderModals();
        });
        host.querySelector('#analyticsModalBackdrop')?.addEventListener('click', (e) => {
          if (e.target.id === 'analyticsModalBackdrop') {
            local.showSavingsTargetModal = false;
            renderModals();
          }
        });
        host.querySelector('#savingsTargetInput')?.addEventListener('input', (e) => {
          local.savingsTargetInput = e.target.value;
        });
        host.querySelector('#savingsTargetForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          local.saving = true;
          renderModals();
          try {
            await ctx.updateProfile({
              monthlySavingsTarget: Math.max(0, Number(local.savingsTargetInput) || 0),
            });
            local.showSavingsTargetModal = false;
          } finally {
            local.saving = false;
          }
        });
        return;
      }

      if (local.showEmiTaxModal) {
        const dashboard = getDashboard();
        const d = local.emiDraft;
        host.innerHTML = `
          <div class="modal-backdrop" id="analyticsModalBackdrop">
            <div class="modal-card">
              <div class="modal-header">
                <h3 class="font-serif" style="font-size:18px;font-weight:700;color:#171717;">EMI & Tax Calculator</h3>
                <button type="button" id="closeAnalyticsModalBtn" aria-label="Close" class="icon-btn-circle">
                  ${iconSvg('x', 20)}
                </button>
              </div>
              <form id="emiTaxForm" class="stack-md" style="margin-top:16px;">
                <div class="teal-box" style="gap:4px;font-size:12px;color:#134e4a;">
                  <p style="font-weight:700;">Calculated Monthly Breakdown</p>
                  <p>
                    Estimated Income Tax: <strong>${escapeHtml(
                      formatMoneyCompact(dashboard.emiTax.monthlyTax, user.currency)
                    )}/mo</strong> (${dashboard.emiTax.effectiveTaxRatePercent}% effective)
                  </p>
                  <p>
                    Monthly Loan EMI: <strong>${escapeHtml(
                      formatMoneyCompact(dashboard.emiTax.monthlyEmi, user.currency)
                    )}/mo</strong>
                  </p>
                  <p style="padding-top:4px;border-top:1px solid #99f6e4;font-weight:700;">
                    Total Monthly EMI & Tax: ${escapeHtml(
                      formatMoneyCompact(dashboard.emiTax.totalMonthlyObligation, user.currency)
                    )}
                  </p>
                </div>

                <div>
                  <label class="field-label" for="emiAnnualIncomeInput">Annual Taxable Income</label>
                  <input id="emiAnnualIncomeInput" type="number" min="0" value="${d.annualIncome}" class="input tabular-nums" />
                </div>

                <div class="grid-2" style="gap:8px;">
                  <button type="button" data-tax-regime="auto" class="currency-choice ${d.taxRegime === 'auto' ? 'active' : ''}" style="min-height:38px;font-size:12px;">
                    Auto Progressive Slabs
                  </button>
                  <button type="button" data-tax-regime="custom" class="currency-choice ${d.taxRegime === 'custom' ? 'active' : ''}" style="min-height:38px;font-size:12px;">
                    Custom Tax %
                  </button>
                </div>

                ${
                  d.taxRegime === 'custom'
                    ? `
                      <div>
                        <label class="field-label" for="emiCustomTaxRate">Tax Rate (%)</label>
                        <input id="emiCustomTaxRate" type="number" min="0" max="60" step="0.5" value="${d.customTaxRatePercent}" class="input tabular-nums" />
                      </div>
                    `
                    : ''
                }

                <div class="stack-sm" style="padding-top:8px;border-top:1px solid #f5f5f5;">
                  <div class="row-between" style="font-size:12px;font-weight:600;color:#262626;">
                    <span>Loan EMI Mode</span>
                    <button type="button" id="toggleLoanCalcModeBtn" style="color:#A80F0F;font-size:12px;font-weight:600;">
                      ${d.useLoanCalculator ? 'Enter direct EMI instead' : 'Calculate from loan principal'}
                    </button>
                  </div>

                  ${
                    !d.useLoanCalculator
                      ? `
                        <div>
                          <label class="field-label" for="emiDirectMonthlyInput">Monthly EMI Amount</label>
                          <input id="emiDirectMonthlyInput" type="number" min="0" value="${d.directMonthlyEmi}" class="input tabular-nums" />
                        </div>
                      `
                      : `
                        <div class="grid-3">
                          <div>
                            <label class="field-label-xs" for="emiLoanPrincipal">Principal</label>
                            <input id="emiLoanPrincipal" type="number" min="0" value="${d.loanPrincipal}" class="input-sm tabular-nums" />
                          </div>
                          <div>
                            <label class="field-label-xs" for="emiLoanRate">Rate %</label>
                            <input id="emiLoanRate" type="number" min="0" step="0.1" value="${d.loanInterestRatePercent}" class="input-sm tabular-nums" />
                          </div>
                          <div>
                            <label class="field-label-xs" for="emiLoanMonths">Months</label>
                            <input id="emiLoanMonths" type="number" min="1" value="${d.loanTenureMonths}" class="input-sm tabular-nums" />
                          </div>
                        </div>
                      `
                  }
                </div>

                <button type="submit" ${local.saving ? 'disabled' : ''} class="btn-primary">
                  ${local.saving ? '<span class="spinner"></span>' : ''}
                  <span>Save EMI & Tax Settings</span>
                </button>
              </form>
            </div>
          </div>
        `;

        host.querySelector('#closeAnalyticsModalBtn')?.addEventListener('click', () => {
          local.showEmiTaxModal = false;
          renderModals();
        });
        host.querySelector('#analyticsModalBackdrop')?.addEventListener('click', (e) => {
          if (e.target.id === 'analyticsModalBackdrop') {
            local.showEmiTaxModal = false;
            renderModals();
          }
        });
        host.querySelector('#emiAnnualIncomeInput')?.addEventListener('input', (e) => {
          local.emiDraft.annualIncome = Number(e.target.value) || 0;
        });
        host.querySelectorAll('[data-tax-regime]').forEach((btn) => {
          btn.addEventListener('click', () => {
            local.emiDraft.taxRegime = btn.dataset.taxRegime;
            renderModals();
          });
        });
        host.querySelector('#emiCustomTaxRate')?.addEventListener('input', (e) => {
          local.emiDraft.customTaxRatePercent = Number(e.target.value) || 0;
        });
        host.querySelector('#toggleLoanCalcModeBtn')?.addEventListener('click', () => {
          local.emiDraft.useLoanCalculator = !local.emiDraft.useLoanCalculator;
          renderModals();
        });
        host.querySelector('#emiDirectMonthlyInput')?.addEventListener('input', (e) => {
          local.emiDraft.directMonthlyEmi = Number(e.target.value) || 0;
        });
        host.querySelector('#emiLoanPrincipal')?.addEventListener('input', (e) => {
          local.emiDraft.loanPrincipal = Number(e.target.value) || 0;
        });
        host.querySelector('#emiLoanRate')?.addEventListener('input', (e) => {
          local.emiDraft.loanInterestRatePercent = Number(e.target.value) || 0;
        });
        host.querySelector('#emiLoanMonths')?.addEventListener('input', (e) => {
          local.emiDraft.loanTenureMonths = Math.max(1, Number(e.target.value) || 1);
        });
        host.querySelector('#emiTaxForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          local.saving = true;
          renderModals();
          try {
            await ctx.updateProfile({ emiTaxConfig: local.emiDraft });
            local.showEmiTaxModal = false;
          } finally {
            local.saving = false;
          }
        });
        return;
      }

      host.innerHTML = '';
    }

    renderMain();
  }

  PW.renderAnalyticsScreen = renderAnalyticsScreen;
})(window);

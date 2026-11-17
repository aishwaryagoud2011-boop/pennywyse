(function (global) {
  const PW = (global.PW = global.PW || {});

  const GOAL_ICON_OPTIONS = [
    { value: 'plane', label: 'Travel' },
    { value: 'shield', label: 'Safety' },
    { value: 'home', label: 'Home' },
    { value: 'car', label: 'Car' },
    { value: 'graduation', label: 'Study' },
    { value: 'heart', label: 'Health' },
    { value: 'sparkles', label: 'Other' },
  ];

  function renderSignUpScreen(container, ctx) {
    const {
      apiRequest,
      setStoredToken,
      buildDefaultGoals,
      calculateMonthlyTaxAndEmi,
      CATEGORY_PRESETS,
      CURRENCY_META,
      formatMoneyCompact,
      iconSvg,
      pennywyseLogoSvg,
      escapeHtml,
    } = PW;

    const existingUser = ctx.state.user && !ctx.state.user.onboardingComplete ? ctx.state.user : null;
    const isProfileCompletion = Boolean(existingUser);

    const local = {
      step: 1,
      name: existingUser?.name || '',
      email: existingUser?.email || '',
      password: '',
      tagline: existingUser?.tagline || 'Smart saver • Big dreamer',
      currency: existingUser?.currency || 'INR',
      openingBalance: '',
      monthlyIncome: '',
      monthlyBudget: '',
      monthlySavingsTarget: '',
      directMonthlyEmi: '',
      useLoanCalc: false,
      loanPrincipal: '',
      loanInterestRate: '9.5',
      loanTenureMonths: '24',
      goals: buildDefaultGoals(),
      initialTransactions: [],
      newTxName: '',
      newTxAmount: '',
      newTxCategory: 'Food & dining',
      newTxType: 'expense',
      loading: false,
      error: null,
    };

    function getPreviewEmiTax() {
      const previewIncomeNum = Math.max(0, Number(local.monthlyIncome) || 0);
      return calculateMonthlyTaxAndEmi(
        {
          annualIncome: previewIncomeNum * 12,
          taxRegime: 'auto',
          customTaxRatePercent: 10,
          loanPrincipal: Number(local.loanPrincipal) || 0,
          loanInterestRatePercent: Number(local.loanInterestRate) || 0,
          loanTenureMonths: Number(local.loanTenureMonths) || 12,
          directMonthlyEmi: Number(local.directMonthlyEmi) || 0,
          useLoanCalculator: local.useLoanCalc,
        },
        local.currency
      );
    }

    function updateEmiPreviewDom() {
      const p = getPreviewEmiTax();
      const totalEl = container.querySelector('#signupEmiTotalPreview');
      const detailEl = container.querySelector('#signupEmiDetailPreview');
      if (totalEl) totalEl.textContent = `${formatMoneyCompact(p.totalMonthlyObligation, local.currency)}/mo`;
      if (detailEl) {
        detailEl.textContent = `Est. Tax: ${formatMoneyCompact(p.monthlyTax, local.currency)}/mo · EMI: ${formatMoneyCompact(
          p.monthlyEmi,
          local.currency
        )}/mo`;
      }
    }

    function setError(msg) {
      local.error = msg;
      const errEl = container.querySelector('#signupErrorMsg');
      if (errEl) {
        errEl.textContent = msg || '';
        errEl.style.display = msg ? 'block' : 'none';
      }
    }

    function render() {
      const previewEmiTax = getPreviewEmiTax();
      const symbol = CURRENCY_META[local.currency]?.symbol || 'Rs.';

      container.innerHTML = `
        <div class="screen" style="padding:20px;">
          <div class="row-between">
            <div class="row-center" style="gap:10px;">
              ${pennywyseLogoSvg('sm')}
              <div>
                <h1 class="font-serif" style="font-size:18px;font-weight:700;color:#171717;">
                  ${isProfileCompletion ? 'Finish Account Setup' : 'Create Account'}
                </h1>
                <p style="font-size:12px;color:#737373;">Step ${local.step} of 3</p>
              </div>
            </div>
            <button type="button" id="signupBackBtn" class="back-btn">
              ${iconSvg('arrowLeft', 16)}
              <span>Back</span>
            </button>
          </div>

          <div class="step-bars">
            ${[1, 2, 3].map((s) => `<div class="step-bar ${s <= local.step ? 'active' : ''}"></div>`).join('')}
          </div>

          <form id="signupForm" style="margin-top:20px;flex:1;display:flex;flex-direction:column;justify-content:space-between;gap:20px;">
            ${
              local.step === 1
                ? `
                  <div class="stack-md">
                    <div>
                      <h2 class="font-serif" style="font-size:16px;font-weight:700;color:#171717;">Your Personal Details</h2>
                      <p style="font-size:12px;color:#737373;margin-top:2px;">This replaces the placeholder profile with your real name and currency.</p>
                    </div>

                    <div>
                      <label class="field-label" for="suName">Full Name</label>
                      <input id="suName" type="text" required value="${escapeHtml(local.name)}" placeholder="e.g., Aishwarya" class="input" />
                    </div>

                    ${
                      !isProfileCompletion
                        ? `
                          <div>
                            <label class="field-label" for="suEmail">Email Address</label>
                            <input id="suEmail" type="email" required value="${escapeHtml(local.email)}" placeholder="you@example.com" class="input" />
                          </div>
                          <div>
                            <label class="field-label" for="suPassword">Password</label>
                            <input id="suPassword" type="password" required minlength="6" value="${escapeHtml(local.password)}" placeholder="Minimum 6 characters" class="input" />
                          </div>
                        `
                        : ''
                    }

                    <div>
                      <label class="field-label" for="suTagline">Profile Tagline</label>
                      <input id="suTagline" type="text" value="${escapeHtml(local.tagline)}" placeholder="Smart saver • Big dreamer" class="input" />
                    </div>

                    <div>
                      <label class="field-label">Preferred Currency</label>
                      <div class="currency-grid">
                        ${Object.keys(CURRENCY_META)
                          .map(
                            (code) => `
                              <button type="button" data-su-currency="${code}" class="currency-choice ${local.currency === code ? 'active' : ''}">
                                ${escapeHtml(CURRENCY_META[code].label)}
                              </button>
                            `
                          )
                          .join('')}
                      </div>
                    </div>
                  </div>
                `
                : local.step === 2
                  ? `
                    <div class="stack-md">
                      <div>
                        <h2 class="font-serif" style="font-size:16px;font-weight:700;color:#171717;">Income, Budget & Savings Plan</h2>
                        <p style="font-size:12px;color:#737373;margin-top:2px;">All balance, budget, and savings cards calculate directly from these numbers.</p>
                      </div>

                      <div class="grid-2">
                        <div>
                          <label class="field-label" for="suOpening">Starting Balance (${escapeHtml(symbol)})</label>
                          <input id="suOpening" type="number" min="0" step="any" value="${escapeHtml(local.openingBalance)}" placeholder="0" class="input tabular-nums" />
                        </div>
                        <div>
                          <label class="field-label" for="suIncome">Monthly Income (${escapeHtml(symbol)})</label>
                          <input id="suIncome" type="number" min="0" step="any" value="${escapeHtml(local.monthlyIncome)}" placeholder="e.g., 80000" class="input tabular-nums" />
                        </div>
                      </div>

                      <div class="grid-2">
                        <div>
                          <label class="field-label" for="suBudget">Monthly Budget (${escapeHtml(symbol)})</label>
                          <input id="suBudget" type="number" min="0" step="any" value="${escapeHtml(local.monthlyBudget)}" placeholder="e.g., 45000" class="input tabular-nums" />
                        </div>
                        <div>
                          <label class="field-label" for="suSavings">Monthly Savings Goal</label>
                          <input id="suSavings" type="number" min="0" step="any" value="${escapeHtml(local.monthlySavingsTarget)}" placeholder="e.g., 20000" class="input tabular-nums" />
                        </div>
                      </div>

                      <div class="teal-box">
                        <div class="row-between">
                          <span style="font-size:12px;font-weight:700;color:#134e4a;">Auto-Calculated EMI & Tax</span>
                          <span id="signupEmiTotalPreview" class="tabular-nums" style="font-size:12px;font-weight:700;color:#0f766e;">
                            ${formatMoneyCompact(previewEmiTax.totalMonthlyObligation, local.currency)}/mo
                          </span>
                        </div>

                        <div class="row-center">
                          <button type="button" data-su-loan-mode="direct" class="teal-mode-btn ${!local.useLoanCalc ? 'active' : ''}">
                            Enter Monthly EMI
                          </button>
                          <button type="button" data-su-loan-mode="calc" class="teal-mode-btn ${local.useLoanCalc ? 'active' : ''}">
                            Calculate from Loan
                          </button>
                        </div>

                        ${
                          !local.useLoanCalc
                            ? `
                              <div>
                                <label class="field-label-xs" for="suDirectEmi" style="color:#134e4a;">Monthly Loan / EMI Amount (optional)</label>
                                <input id="suDirectEmi" type="number" min="0" value="${escapeHtml(local.directMonthlyEmi)}" placeholder="0" class="input-sm tabular-nums" />
                              </div>
                            `
                            : `
                              <div class="grid-3">
                                <div>
                                  <label class="field-label-xs" for="suLoanPrincipal" style="color:#134e4a;">Principal</label>
                                  <input id="suLoanPrincipal" type="number" min="0" value="${escapeHtml(local.loanPrincipal)}" placeholder="100000" class="input-sm tabular-nums" />
                                </div>
                                <div>
                                  <label class="field-label-xs" for="suLoanRate" style="color:#134e4a;">Rate %</label>
                                  <input id="suLoanRate" type="number" min="0" step="0.1" value="${escapeHtml(local.loanInterestRate)}" class="input-sm tabular-nums" />
                                </div>
                                <div>
                                  <label class="field-label-xs" for="suLoanMonths" style="color:#134e4a;">Months</label>
                                  <input id="suLoanMonths" type="number" min="1" value="${escapeHtml(local.loanTenureMonths)}" class="input-sm tabular-nums" />
                                </div>
                              </div>
                            `
                        }

                        <p id="signupEmiDetailPreview" style="font-size:11px;color:#115e59;">
                          Est. Tax: ${formatMoneyCompact(previewEmiTax.monthlyTax, local.currency)}/mo · EMI: ${formatMoneyCompact(previewEmiTax.monthlyEmi, local.currency)}/mo
                        </p>
                      </div>
                    </div>
                  `
                  : `
                    <div class="stack-md">
                      <div>
                        <h2 class="font-serif" style="font-size:16px;font-weight:700;color:#171717;">Your 4 Saving Goals & Initial Expenses</h2>
                        <p style="font-size:12px;color:#737373;margin-top:2px;">Customize your saving goals below (EMI & Tax is auto-calculated by Pennywyse).</p>
                      </div>

                      <div class="stack-sm">
                        ${local.goals
                          .slice(0, 3)
                          .map(
                            (goal, idx) => `
                              <div style="border-radius:12px;border:1px solid #e5e5e5;background:#fafafa;padding:12px;" class="stack-sm">
                                <div class="row-center">
                                  <input type="text" data-goal-name="${idx}" value="${escapeHtml(goal.name)}" placeholder="Goal ${idx + 1}" class="input-sm" style="flex:1;font-weight:600;" />
                                  <select data-goal-icon="${idx}" class="input-sm" style="width:auto;">
                                    ${GOAL_ICON_OPTIONS.map(
                                      (opt) => `<option value="${opt.value}" ${goal.icon === opt.value ? 'selected' : ''}>${opt.label}</option>`
                                    ).join('')}
                                  </select>
                                </div>
                                <div class="grid-2" style="gap:8px;">
                                  <div>
                                    <label class="field-label-xs">Saved so far</label>
                                    <input type="number" min="0" data-goal-saved="${idx}" value="${goal.savedAmount || ''}" placeholder="0" class="input-sm tabular-nums" />
                                  </div>
                                  <div>
                                    <label class="field-label-xs">Target amount</label>
                                    <input type="number" min="0" data-goal-target="${idx}" value="${goal.targetAmount || ''}" placeholder="10000" class="input-sm tabular-nums" />
                                  </div>
                                </div>
                              </div>
                            `
                          )
                          .join('')}

                        <div class="row-between" style="border-radius:12px;border:1px solid #99f6e4;background:#f0fdfa;padding:10px 12px;font-size:12px;">
                          <span style="font-weight:600;color:#134e4a;">4. EMI & Tax (Auto-calculated)</span>
                          <span class="tabular-nums" style="font-weight:700;color:#115e59;">
                            ${formatMoneyCompact(previewEmiTax.totalMonthlyObligation, local.currency)}/mo
                          </span>
                        </div>
                      </div>

                      <div style="border-radius:12px;border:1px solid #e5e5e5;padding:12px;" class="stack-sm">
                        <p style="font-size:12px;font-weight:700;color:#262626;">Add Initial Transactions (Optional)</p>
                        <div class="grid-2" style="gap:8px;">
                          <input id="initTxName" type="text" value="${escapeHtml(local.newTxName)}" placeholder="e.g., Groceries" class="input-sm" />
                          <input id="initTxAmount" type="number" min="0" value="${escapeHtml(local.newTxAmount)}" placeholder="Amount" class="input-sm tabular-nums" />
                        </div>
                        <div class="row-center">
                          <select id="initTxCategory" class="input-sm" style="flex:1;">
                            ${CATEGORY_PRESETS.map(
                              (p) => `<option value="${escapeHtml(p.category)}" ${local.newTxCategory === p.category ? 'selected' : ''}>${escapeHtml(p.category)}</option>`
                            ).join('')}
                          </select>
                          <select id="initTxType" class="input-sm" style="width:auto;">
                            <option value="expense" ${local.newTxType === 'expense' ? 'selected' : ''}>Expense</option>
                            <option value="income" ${local.newTxType === 'income' ? 'selected' : ''}>Income</option>
                          </select>
                          <button type="button" id="addInitTxBtn" style="min-height:38px;border-radius:10px;background:#171717;color:#ffffff;padding:0 12px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                            ${iconSvg('plus', 14)}
                            <span>Add</span>
                          </button>
                        </div>
                        <div id="initTxListContainer" class="stack-sm"></div>
                      </div>
                    </div>
                  `
            }

            <div>
              <p id="signupErrorMsg" class="error-text" style="margin-bottom:8px;display:${local.error ? 'block' : 'none'};">${escapeHtml(local.error || '')}</p>
              <div style="padding-bottom:12px;">
                ${
                  local.step < 3
                    ? `<button type="button" id="signupContinueBtn" class="btn-primary">Continue</button>`
                    : `<button type="submit" id="signupSubmitBtn" ${local.loading ? 'disabled' : ''} class="btn-primary">
                        ${local.loading ? '<span class="spinner"></span>' : iconSvg('check', 16)}
                        <span>${local.loading ? 'Creating Account...' : 'Start Using Pennywyse'}</span>
                      </button>`
                }
              </div>
            </div>
          </form>
        </div>
      `;

      bindEvents();
      if (local.step === 3) renderInitTxList();
    }

    function renderInitTxList() {
      const listEl = container.querySelector('#initTxListContainer');
      if (!listEl) return;
      if (local.initialTransactions.length === 0) {
        listEl.innerHTML = '';
        return;
      }
      listEl.innerHTML = local.initialTransactions
        .map(
          (tx) => `
            <div class="row-between" style="border-radius:8px;background:#fafafa;padding:6px 10px;font-size:12px;">
              <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;color:#262626;">
                ${escapeHtml(tx.name)} (${escapeHtml(tx.category)})
              </span>
              <div class="row-center" style="flex-shrink:0;">
                <span class="tabular-nums" style="font-weight:600;color:${tx.type === 'income' ? '#15803d' : '#b91c1c'};">
                  ${tx.type === 'income' ? '+' : '-'}${formatMoneyCompact(Number(tx.amount), local.currency)}
                </span>
                <button type="button" data-remove-init-tx="${tx.id}" aria-label="Remove transaction" style="color:#a3a3a3;">
                  ${iconSvg('trash', 14)}
                </button>
              </div>
            </div>
          `
        )
        .join('');

      listEl.querySelectorAll('[data-remove-init-tx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.removeInitTx;
          local.initialTransactions = local.initialTransactions.filter((t) => t.id !== id);
          renderInitTxList();
        });
      });
    }

    function bindEvents() {
      container.querySelector('#signupBackBtn')?.addEventListener('click', () => {
        local.error = null;
        if (local.step > 1) {
          local.step -= 1;
          render();
        } else if (existingUser) {
          ctx.signOut();
        } else {
          ctx.navigate('welcome');
        }
      });

      if (local.step === 1) {
        container.querySelector('#suName')?.addEventListener('input', (e) => (local.name = e.target.value));
        container.querySelector('#suEmail')?.addEventListener('input', (e) => (local.email = e.target.value));
        container.querySelector('#suPassword')?.addEventListener('input', (e) => (local.password = e.target.value));
        container.querySelector('#suTagline')?.addEventListener('input', (e) => (local.tagline = e.target.value));
        container.querySelectorAll('[data-su-currency]').forEach((btn) => {
          btn.addEventListener('click', () => {
            local.currency = btn.dataset.suCurrency;
            container.querySelectorAll('[data-su-currency]').forEach((b) => {
              b.classList.toggle('active', b.dataset.suCurrency === local.currency);
            });
          });
        });
      }

      if (local.step === 2) {
        container.querySelector('#suOpening')?.addEventListener('input', (e) => (local.openingBalance = e.target.value));
        container.querySelector('#suIncome')?.addEventListener('input', (e) => {
          local.monthlyIncome = e.target.value;
          updateEmiPreviewDom();
        });
        container.querySelector('#suBudget')?.addEventListener('input', (e) => (local.monthlyBudget = e.target.value));
        container.querySelector('#suSavings')?.addEventListener('input', (e) => (local.monthlySavingsTarget = e.target.value));
        container.querySelector('#suDirectEmi')?.addEventListener('input', (e) => {
          local.directMonthlyEmi = e.target.value;
          updateEmiPreviewDom();
        });
        container.querySelector('#suLoanPrincipal')?.addEventListener('input', (e) => {
          local.loanPrincipal = e.target.value;
          updateEmiPreviewDom();
        });
        container.querySelector('#suLoanRate')?.addEventListener('input', (e) => {
          local.loanInterestRate = e.target.value;
          updateEmiPreviewDom();
        });
        container.querySelector('#suLoanMonths')?.addEventListener('input', (e) => {
          local.loanTenureMonths = e.target.value;
          updateEmiPreviewDom();
        });
        container.querySelectorAll('[data-su-loan-mode]').forEach((btn) => {
          btn.addEventListener('click', () => {
            local.useLoanCalc = btn.dataset.suLoanMode === 'calc';
            render();
          });
        });
      }

      if (local.step === 3) {
        container.querySelectorAll('[data-goal-name]').forEach((inp) => {
          inp.addEventListener('input', (e) => {
            const i = Number(inp.dataset.goalName);
            local.goals[i].name = e.target.value;
          });
        });
        container.querySelectorAll('[data-goal-icon]').forEach((sel) => {
          sel.addEventListener('change', (e) => {
            const i = Number(sel.dataset.goalIcon);
            local.goals[i].icon = e.target.value;
          });
        });
        container.querySelectorAll('[data-goal-saved]').forEach((inp) => {
          inp.addEventListener('input', (e) => {
            const i = Number(inp.dataset.goalSaved);
            local.goals[i].savedAmount = Number(e.target.value) || 0;
          });
        });
        container.querySelectorAll('[data-goal-target]').forEach((inp) => {
          inp.addEventListener('input', (e) => {
            const i = Number(inp.dataset.goalTarget);
            local.goals[i].targetAmount = Number(e.target.value) || 0;
          });
        });

        container.querySelector('#initTxName')?.addEventListener('input', (e) => (local.newTxName = e.target.value));
        container.querySelector('#initTxAmount')?.addEventListener('input', (e) => (local.newTxAmount = e.target.value));
        container.querySelector('#initTxCategory')?.addEventListener('change', (e) => {
          local.newTxCategory = e.target.value;
          const found = CATEGORY_PRESETS.find((p) => p.category === local.newTxCategory);
          if (found) {
            local.newTxType = found.defaultType;
            const typeSel = container.querySelector('#initTxType');
            if (typeSel) typeSel.value = found.defaultType;
          }
        });
        container.querySelector('#initTxType')?.addEventListener('change', (e) => (local.newTxType = e.target.value));
        container.querySelector('#addInitTxBtn')?.addEventListener('click', () => {
          const amt = Number(local.newTxAmount);
          if (!local.newTxName.trim() || !Number.isFinite(amt) || amt <= 0) return;
          local.initialTransactions.push({
            id: `init_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: local.newTxName.trim(),
            category: local.newTxCategory,
            type: local.newTxType,
            amount: String(amt),
          });
          local.newTxName = '';
          local.newTxAmount = '';
          const nameEl = container.querySelector('#initTxName');
          const amtEl = container.querySelector('#initTxAmount');
          if (nameEl) nameEl.value = '';
          if (amtEl) amtEl.value = '';
          renderInitTxList();
        });
      }

      container.querySelector('#signupContinueBtn')?.addEventListener('click', () => {
        setError(null);
        if (local.step === 1) {
          if (!local.name.trim()) {
            setError('Please enter your name.');
            return;
          }
          if (!isProfileCompletion) {
            if (!local.email.includes('@')) {
              setError('Please enter a valid email address.');
              return;
            }
            if (local.password.length < 6) {
              setError('Password must be at least 6 characters.');
              return;
            }
          }
          local.step = 2;
          render();
          return;
        }

        if (local.step === 2) {
          if (!local.monthlyBudget && !local.monthlyIncome && !local.openingBalance) {
            setError('Please enter at least your monthly income or budget so Pennywyse can calculate accurately.');
            return;
          }
          local.step = 3;
          render();
        }
      });

      container.querySelector('#signupForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (local.step < 3) return;
        setError(null);
        local.loading = true;
        render();

        const previewEmiTax = getPreviewEmiTax();
        const previewIncomeNum = Math.max(0, Number(local.monthlyIncome) || 0);

        const formattedGoals = local.goals.map((g, i) =>
          i === 3
            ? {
                ...g,
                name: g.name.trim() || 'EMI & Tax',
                savedAmount: 0,
                targetAmount: previewEmiTax.totalMonthlyObligation,
                isSystemEmiTax: true,
              }
            : {
                ...g,
                name: g.name.trim() || `Goal ${i + 1}`,
                savedAmount: Math.max(0, Number(g.savedAmount) || 0),
                targetAmount: Math.max(0, Number(g.targetAmount) || 0),
              }
        );

        const mappedTransactions = local.initialTransactions.map((tx) => {
          const preset = CATEGORY_PRESETS.find((p) => p.category === tx.category) || CATEGORY_PRESETS[0];
          return {
            id: tx.id,
            name: tx.name,
            category: tx.category,
            type: tx.type,
            amount: Number(tx.amount),
            dateISO: new Date().toISOString(),
            icon: preset.icon,
            color: preset.color,
          };
        });

        const emiTaxConfig = {
          annualIncome: previewIncomeNum * 12,
          taxRegime: 'auto',
          customTaxRatePercent: 10,
          loanPrincipal: Math.max(0, Number(local.loanPrincipal) || 0),
          loanInterestRatePercent: Math.max(0, Number(local.loanInterestRate) || 0),
          loanTenureMonths: Math.max(1, Number(local.loanTenureMonths) || 24),
          directMonthlyEmi: Math.max(0, Number(local.directMonthlyEmi) || 0),
          useLoanCalculator: local.useLoanCalc,
        };

        try {
          if (isProfileCompletion) {
            const res = await apiRequest('/api/user/profile', {
              method: 'PUT',
              body: {
                name: local.name.trim(),
                tagline: local.tagline.trim(),
                currency: local.currency,
                openingBalance: Math.max(0, Number(local.openingBalance) || 0),
                monthlyBudget: Math.max(0, Number(local.monthlyBudget) || 0),
                monthlySavingsTarget: Math.max(0, Number(local.monthlySavingsTarget) || 0),
                initialIncome: previewIncomeNum,
                initialTransactions: mappedTransactions,
                savingGoals: formattedGoals,
                emiTaxConfig,
                onboardingComplete: true,
              },
            });
            ctx.onAuthenticated(res);
          } else {
            const res = await apiRequest('/api/auth/register', {
              method: 'POST',
              body: {
                name: local.name.trim(),
                email: local.email.trim(),
                password: local.password,
                tagline: local.tagline.trim(),
                currency: local.currency,
                openingBalance: Math.max(0, Number(local.openingBalance) || 0),
                monthlyIncome: previewIncomeNum,
                monthlyBudget: Math.max(0, Number(local.monthlyBudget) || 0),
                monthlySavingsTarget: Math.max(0, Number(local.monthlySavingsTarget) || 0),
                emiTaxConfig,
                savingGoals: formattedGoals,
                initialTransactions: mappedTransactions,
              },
            });
            setStoredToken(res.token);
            ctx.onAuthenticated({
              user: res.user,
              transactions: res.transactions,
              savingGoals: res.savingGoals,
            });
          }
        } catch (err) {
          local.loading = false;
          local.error = err instanceof Error ? err.message : 'Could not complete setup';
          render();
        }
      });
    }

    render();
  }

  PW.renderSignUpScreen = renderSignUpScreen;
})(window);

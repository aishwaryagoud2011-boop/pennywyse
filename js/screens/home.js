(function (global) {
  const PW = (global.PW = global.PW || {});

  function renderHomeScreen(container, ctx) {
    const {
      CATEGORY_PRESETS,
      computeDashboardTotals,
      CURRENCY_META,
      formatMoney,
      formatMoneyCompact,
      formatTransactionTime,
      iconSvg,
      pennywyseLogoSvg,
      transactionIconSvg,
      escapeHtml,
      renderBottomNav,
    } = PW;

    const EXPENSE_CATEGORIES = CATEGORY_PRESETS.filter((p) => p.defaultType === 'expense').map(
      (p) => p.category
    );

    const { user, transactions, savingGoals } = ctx.state;

    const local = {
      showNotifications: false,
      showCategoryModal: false,
      savingLimits: false,
      categoryDraft: {},
      bannerAlert: null,
      notifPermission:
        typeof global !== 'undefined' && 'Notification' in global ? Notification.permission : 'unsupported',
    };

    const totals = computeDashboardTotals(user, transactions);
    const sortedRecent = [...transactions]
      .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())
      .slice(0, 5);

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const monthCategorySpending = {};
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const d = new Date(tx.dateISO);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        monthCategorySpending[tx.category] = (monthCategorySpending[tx.category] || 0) + (Number(tx.amount) || 0);
      }
    }

    const categoryThresholdAlerts = [];
    const limits = user.categoryBudgets || {};
    for (const [category, limit] of Object.entries(limits)) {
      if (!limit || limit <= 0) continue;
      const spent = monthCategorySpending[category] || 0;
      const pct = Math.round((spent / limit) * 100);
      if (pct >= 100) {
        categoryThresholdAlerts.push({
          id: `${currentMonthKey}:${category}:100`,
          category,
          threshold: 100,
          percent: pct,
          spent,
          limit,
          title: `${category}: 100% Limit Reached`,
          detail: `Spent ${formatMoneyCompact(spent, user.currency)} of ${formatMoneyCompact(limit, user.currency)} (${pct}%).`,
          tone: 'critical',
        });
      } else if (pct >= 80) {
        categoryThresholdAlerts.push({
          id: `${currentMonthKey}:${category}:80`,
          category,
          threshold: 80,
          percent: pct,
          spent,
          limit,
          title: `${category}: ${pct}% of Limit Used`,
          detail: `Approaching monthly cap (${formatMoneyCompact(spent, user.currency)} / ${formatMoneyCompact(limit, user.currency)}).`,
          tone: 'warn',
        });
      }
    }

    if (totals.monthlyBudget > 0) {
      const overallPct = Math.round((totals.monthExpenses / totals.monthlyBudget) * 100);
      if (overallPct >= 100) {
        categoryThresholdAlerts.push({
          id: `${currentMonthKey}:__overall__:100`,
          category: 'Monthly Budget',
          threshold: 100,
          percent: overallPct,
          spent: totals.monthExpenses,
          limit: totals.monthlyBudget,
          title: 'Overall Monthly Budget Reached (100%)',
          detail: `You have spent ${formatMoneyCompact(totals.monthExpenses, user.currency)} of your ${formatMoneyCompact(
            totals.monthlyBudget,
            user.currency
          )} limit.`,
          tone: 'critical',
        });
      } else if (overallPct >= 80) {
        categoryThresholdAlerts.push({
          id: `${currentMonthKey}:__overall__:80`,
          category: 'Monthly Budget',
          threshold: 80,
          percent: overallPct,
          spent: totals.monthExpenses,
          limit: totals.monthlyBudget,
          title: `Overall Budget at ${overallPct}%`,
          detail: `${formatMoneyCompact(totals.budgetRemaining, user.currency)} remaining out of ${formatMoneyCompact(
            totals.monthlyBudget,
            user.currency
          )}.`,
          tone: 'warn',
        });
      }
    }

    categoryThresholdAlerts.sort((a, b) => b.threshold - a.threshold || b.percent - a.percent);

    if (categoryThresholdAlerts.length > 0) {
      const storageKey = `pennywyse_notified_thresholds_${user.id}`;
      let seen = {};
      try {
        seen = JSON.parse(localStorage.getItem(storageKey) || '{}');
      } catch {
        seen = {};
      }
      const unseen = categoryThresholdAlerts.find((a) => !seen[a.id]);
      if (unseen) {
        local.bannerAlert = unseen;
        seen[unseen.id] = true;
        try {
          localStorage.setItem(storageKey, JSON.stringify(seen));
        } catch {
          // ignore storage errors
        }
        if (
          user.notificationsEnabled &&
          typeof global !== 'undefined' &&
          'Notification' in global &&
          Notification.permission === 'granted'
        ) {
          try {
            if (global.location?.protocol !== 'file:' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready
                .then((reg) =>
                  reg.showNotification(unseen.title, {
                    body: unseen.detail,
                    icon: './pwa-192x192.png',
                    tag: unseen.id,
                  })
                )
                .catch(() => {
                  new Notification(unseen.title, { body: unseen.detail });
                });
            } else {
              new Notification(unseen.title, { body: unseen.detail });
            }
          } catch {
            // ignore browser notification failures
          }
        }
      }
    }

    const infoAlerts = [];
    if (totals.emiTax.totalMonthlyObligation > 0) {
      infoAlerts.push({
        title: 'Monthly EMI & Tax Estimate',
        detail: `Estimated ${formatMoneyCompact(totals.emiTax.totalMonthlyObligation, user.currency)} due this month (${formatMoneyCompact(
          totals.emiTax.monthlyEmi,
          user.currency
        )} EMI + ${formatMoneyCompact(totals.emiTax.monthlyTax, user.currency)} Tax).`,
        tone: 'info',
      });
    }
    const activeGoal = savingGoals.find((g) => !g.isSystemEmiTax && g.targetAmount > 0);
    if (activeGoal) {
      const pct = Math.min(100, Math.round((activeGoal.savedAmount / activeGoal.targetAmount) * 100));
      infoAlerts.push({
        title: `Goal: ${activeGoal.name}`,
        detail: `${pct}% funded (${formatMoneyCompact(activeGoal.savedAmount, user.currency)} / ${formatMoneyCompact(
          activeGoal.targetAmount,
          user.currency
        )}).`,
        tone: 'good',
      });
    }

    const configuredCategories = Object.entries(user.categoryBudgets || {}).filter(([, limit]) => limit > 0);

    function openCategoryLimitsModal() {
      const draft = {};
      const existing = user.categoryBudgets || {};
      for (const cat of EXPENSE_CATEGORIES) {
        draft[cat] = existing[cat] ? String(existing[cat]) : '';
      }
      for (const [k, v] of Object.entries(existing)) {
        if (!(k in draft) && v > 0) draft[k] = String(v);
      }
      local.categoryDraft = draft;
      local.showCategoryModal = true;
      renderModals();
    }

    function renderMain() {
      const budgetBarClass =
        totals.budgetUsedPercent >= 100 ? 'critical' : totals.budgetUsedPercent >= 80 ? 'warn' : '';

      container.innerHTML = `
        <div class="screen">
          <div class="screen-scroll">
            <div class="screen-header">
              ${pennywyseLogoSvg('sm')}
              <div class="screen-header-title">
                ${iconSvg('home', 20, 2.3)}
                <span>Home</span>
              </div>
              <div style="width:32px;" aria-hidden="true"></div>
            </div>

            <div class="greeting-row">
              <p class="greeting-text">Hello, <strong style="font-weight:600;">${escapeHtml(user.name)}</strong></p>
              <button type="button" id="homeBellBtn" aria-label="Notifications" class="bell-btn">
                <span style="display:inline-flex;color:#A80F0F;">${iconSvg('bell', 20)}</span>
                ${
                  categoryThresholdAlerts.length > 0
                    ? `<span class="bell-badge tabular-nums">${categoryThresholdAlerts.length}</span>`
                    : ''
                }
              </button>
            </div>

            <div id="homeBannerHost">
              ${
                local.bannerAlert
                  ? `
                    <div role="alert" class="threshold-banner ${local.bannerAlert.tone === 'critical' ? 'critical' : ''}">
                      <div class="row-center" style="align-items:flex-start;min-width:0;">
                        <span style="margin-top:2px;flex-shrink:0;color:${
                          local.bannerAlert.tone === 'critical' ? '#B91C1C' : '#b45309'
                        };">${iconSvg('alert', 16)}</span>
                        <div style="min-width:0;">
                          <p style="font-weight:700;line-height:1.35;">${escapeHtml(local.bannerAlert.title)}</p>
                          <p style="margin-top:2px;line-height:1.35;opacity:0.9;">${escapeHtml(local.bannerAlert.detail)}</p>
                        </div>
                      </div>
                      <button type="button" id="dismissBannerBtn" aria-label="Dismiss alert" class="icon-btn-circle" style="width:28px;height:28px;flex-shrink:0;">
                        ${iconSvg('x', 14)}
                      </button>
                    </div>
                  `
                  : ''
              }
            </div>

            <div class="balance-card crimson-gradient">
              <p class="font-serif" style="font-size:17px;font-weight:500;color:rgba(255,255,255,0.95);">Total Balance:</p>
              <p class="balance-amount tabular-nums">${escapeHtml(formatMoney(totals.totalBalance, user.currency))}</p>

              <div class="balance-split">
                <button type="button" id="balanceIncomeBtn" class="balance-split-btn">
                  <p class="font-serif" style="font-size:14px;color:rgba(255,255,255,0.85);">Income:</p>
                  <p class="tabular-nums" style="margin-top:2px;font-size:17px;font-weight:600;">
                    ${escapeHtml(formatMoney(totals.totalIncome, user.currency))}
                  </p>
                </button>
                <button type="button" id="balanceExpensesBtn" class="balance-split-btn">
                  <p class="font-serif" style="font-size:14px;color:rgba(255,255,255,0.85);">Expenses:</p>
                  <p class="tabular-nums" style="margin-top:2px;font-size:17px;font-weight:600;">
                    ${escapeHtml(formatMoney(totals.totalExpenses, user.currency))}
                  </p>
                </button>
              </div>
            </div>

            <section style="margin-top:20px;">
              <div class="section-heading-row">
                <h2 class="section-heading">Budget overview:</h2>
                <div class="row-center" style="gap:12px;">
                  <button type="button" id="openCategoryLimitsBtn" class="row-center" style="gap:4px;font-size:12px;font-weight:600;color:#404040;">
                    ${iconSvg('sliders', 12)}
                    <span>Category limits</span>
                  </button>
                  <button type="button" id="homeEditBudgetBtn" style="font-size:12px;font-weight:600;color:#A80F0F;">
                    Edit
                  </button>
                </div>
              </div>

              <div class="stack-md" style="margin-top:10px;gap:12px;">
                <div>
                  <div class="row-between" style="font-size:14px;">
                    <span class="font-serif" style="color:#171717;">Monthly budget</span>
                    <span class="tabular-nums" style="font-weight:600;color:#171717;">${escapeHtml(
                      formatMoney(totals.monthlyBudget, user.currency)
                    )}</span>
                  </div>
                  <div class="progress-row">
                    <div class="progress-track">
                      <div class="progress-fill ${budgetBarClass}" style="width:${totals.budgetUsedPercent}%;"></div>
                    </div>
                    <span class="progress-pct tabular-nums">${totals.budgetUsedPercent}%</span>
                  </div>
                </div>

                <div>
                  <div class="row-between" style="font-size:14px;">
                    <span class="font-serif" style="color:#171717;">Remaining</span>
                    <span class="tabular-nums" style="font-weight:600;color:${
                      totals.budgetRemaining < 0 ? '#b91c1c' : '#171717'
                    };">${escapeHtml(formatMoney(totals.budgetRemaining, user.currency))}</span>
                  </div>
                  <div class="progress-row">
                    <div class="progress-track">
                      <div class="progress-fill" style="width:${totals.budgetRemainingPercent}%;"></div>
                    </div>
                    <span class="progress-pct tabular-nums">${totals.budgetRemainingPercent}%</span>
                  </div>
                </div>

                ${
                  configuredCategories.length > 0
                    ? `
                      <div class="cat-limits-list">
                        ${configuredCategories
                          .map(([cat, limit]) => {
                            const spent = monthCategorySpending[cat] || 0;
                            const pct = Math.round((spent / limit) * 100);
                            const barPct = Math.min(100, pct);
                            const textCol = pct >= 100 ? '#B91C1C' : pct >= 80 ? '#b45309' : '#404040';
                            const fillCls = pct >= 100 ? 'critical' : pct >= 80 ? 'warn' : '';
                            return `
                              <div style="font-size:12px;">
                                <div class="row-between">
                                  <span style="font-weight:500;color:#262626;">${escapeHtml(cat)}</span>
                                  <span class="tabular-nums" style="font-weight:600;color:${textCol};">
                                    ${escapeHtml(formatMoneyCompact(spent, user.currency))} / ${escapeHtml(
                              formatMoneyCompact(limit, user.currency)
                            )} (${pct}%)
                                  </span>
                                </div>
                                <div class="mini-track">
                                  <div class="progress-fill ${fillCls}" style="width:${barPct}%;"></div>
                                </div>
                              </div>
                            `;
                          })
                          .join('')}
                      </div>
                    `
                    : ''
                }
              </div>
            </section>

            <section style="margin-top:24px;">
              <div class="section-heading-row">
                <h2 class="section-heading">Recent Transactions:</h2>
                <button type="button" id="homeSeeAllBtn" style="min-height:36px;padding:0 4px;font-size:14px;font-weight:500;color:#B91C1C;">
                  see all
                </button>
              </div>

              ${
                sortedRecent.length === 0
                  ? `
                    <div class="empty-dashed-card">
                      <p style="font-size:14px;font-weight:500;color:#404040;">No transactions recorded yet</p>
                      <p style="margin-top:4px;font-size:12px;color:#737373;">
                        Add your real income or expenses to track your exact balance.
                      </p>
                      <button type="button" id="homeQuickAddBtn" class="btn-primary" style="width:auto;min-height:40px;margin-top:12px;padding:8px 16px;font-size:12px;">
                        ${iconSvg('plus', 16)}
                        <span>Add Transaction</span>
                      </button>
                    </div>
                  `
                  : `
                    <div class="tx-list">
                      ${sortedRecent
                        .map(
                          (tx) => `
                            <button type="button" data-edit-tx="${escapeHtml(tx.id)}" class="tx-row">
                              <div class="tx-left">
                                <span class="tx-icon-box" style="background-color:${escapeHtml(tx.color || '#4A90D9')};">
                                  ${transactionIconSvg(tx.icon, 20)}
                                </span>
                                <div style="min-width:0;">
                                  <p class="tx-title">${escapeHtml(tx.name)}</p>
                                  <p class="tx-sub">${escapeHtml(formatTransactionTime(tx.dateISO))}</p>
                                </div>
                              </div>
                              <span class="tx-amount tabular-nums ${tx.type === 'income' ? 'income' : 'expense'}">
                                ${tx.type === 'income' ? '+' : '-'}${escapeHtml(formatMoneyCompact(tx.amount, user.currency))}
                              </span>
                            </button>
                          `
                        )
                        .join('')}
                    </div>
                  `
              }
            </section>
          </div>

          ${renderBottomNav('home')}
          <div id="homeModalHost"></div>
        </div>
      `;

      container.querySelector('#homeBellBtn')?.addEventListener('click', () => {
        local.showNotifications = true;
        renderModals();
      });
      container.querySelector('#dismissBannerBtn')?.addEventListener('click', () => {
        local.bannerAlert = null;
        const bh = container.querySelector('#homeBannerHost');
        if (bh) bh.innerHTML = '';
      });
      container.querySelector('#balanceIncomeBtn')?.addEventListener('click', () => ctx.navigate('transactions'));
      container.querySelector('#balanceExpensesBtn')?.addEventListener('click', () => ctx.navigate('transactions'));
      container.querySelector('#openCategoryLimitsBtn')?.addEventListener('click', openCategoryLimitsModal);
      container.querySelector('#homeEditBudgetBtn')?.addEventListener('click', () => ctx.navigate('profile'));
      container.querySelector('#homeSeeAllBtn')?.addEventListener('click', () => ctx.navigate('transactions'));
      container.querySelector('#homeQuickAddBtn')?.addEventListener('click', () => ctx.openTransactionModal(null, 'expense'));

      container.querySelectorAll('[data-edit-tx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const tx = transactions.find((t) => t.id === btn.dataset.editTx);
          if (tx) ctx.openTransactionModal(tx);
        });
      });

      container.querySelectorAll('[data-nav]').forEach((btn) => {
        btn.addEventListener('click', () => ctx.navigate(btn.dataset.nav));
      });
    }

    function renderModals() {
      const host = container.querySelector('#homeModalHost');
      if (!host) return;

      if (local.showNotifications) {
        const permText =
          local.notifPermission === 'granted'
            ? 'Device alerts enabled'
            : local.notifPermission === 'denied'
              ? 'Device alerts blocked in browser'
              : local.notifPermission === 'unsupported'
                ? 'In-app alerts active'
                : 'Enable device notifications';

        host.innerHTML = `
          <div class="modal-backdrop" id="homeModalBackdrop">
            <div class="modal-card stack-sm" style="gap:12px;">
              <div class="modal-header">
                <div>
                  <h3 class="font-serif" style="font-size:18px;font-weight:700;color:#171717;">Pennywyse Alerts</h3>
                  <p style="font-size:11px;color:#737373;">Notifies at 80% and 100% of monthly category limits</p>
                </div>
                <button type="button" id="closeNotifDrawerBtn" aria-label="Close notifications" class="icon-btn-circle">
                  ${iconSvg('x', 20)}
                </button>
              </div>

              <div class="row-between" style="border-radius:12px;border:1px solid #e5e5e5;background:#fafafa;padding:8px 12px;font-size:12px;">
                <div class="row-center">
                  <span style="color:#A80F0F;display:inline-flex;">${iconSvg('bellRing', 16)}</span>
                  <span style="font-weight:500;color:#262626;">${permText}</span>
                </div>
                ${
                  local.notifPermission === 'default'
                    ? `<button type="button" id="enableNotifPermBtn" class="crimson-gradient" style="border-radius:8px;padding:4px 10px;font-size:11px;font-weight:600;">Enable</button>`
                    : local.notifPermission === 'granted'
                      ? `<span style="color:#059669;display:inline-flex;">${iconSvg('checkCircle', 16)}</span>`
                      : ''
                }
              </div>

              <div class="stack-sm" style="max-height:52dvh;overflow-y:auto;">
                ${categoryThresholdAlerts
                  .map(
                    (a) => `
                      <div style="border-radius:12px;border:1px solid ${
                        a.tone === 'critical' ? '#fecaca' : '#fde68a'
                      };background:${a.tone === 'critical' ? '#fef2f2' : '#fffbeb'};padding:12px;font-size:12px;color:${
                        a.tone === 'critical' ? '#450a0a' : '#451a03'
                      };">
                        <div class="row-between">
                          <p style="font-weight:700;">${escapeHtml(a.title)}</p>
                          <span class="tabular-nums" style="font-weight:700;">${a.percent}%</span>
                        </div>
                        <p style="margin-top:2px;line-height:1.45;">${escapeHtml(a.detail)}</p>
                        <div class="mini-track" style="margin-top:8px;background:rgba(255,255,255,0.7);">
                          <div class="progress-fill ${a.tone === 'critical' ? 'critical' : 'warn'}" style="width:${Math.min(
                      100,
                      a.percent
                    )}%;"></div>
                        </div>
                      </div>
                    `
                  )
                  .join('')}

                ${infoAlerts
                  .map(
                    (a) => `
                      <div style="border-radius:12px;border:1px solid ${
                        a.tone === 'good' ? '#a7f3d0' : '#e5e5e5'
                      };background:${a.tone === 'good' ? '#ecfdf5' : '#fafafa'};padding:12px;font-size:12px;color:${
                        a.tone === 'good' ? '#064e3b' : '#262626'
                      };">
                        <p style="font-weight:700;">${escapeHtml(a.title)}</p>
                        <p style="margin-top:2px;line-height:1.45;">${escapeHtml(a.detail)}</p>
                      </div>
                    `
                  )
                  .join('')}

                ${
                  categoryThresholdAlerts.length === 0 && infoAlerts.length === 0
                    ? `<p style="padding:16px 0;text-align:center;font-size:14px;color:#737373;">
                        No alerts yet. Set monthly category limits to get alerted at 80% and 100%.
                      </p>`
                    : ''
                }
              </div>

              <button type="button" id="notifOpenLimitsBtn" class="btn-secondary" style="font-size:12px;">
                <span style="color:#A80F0F;display:inline-flex;">${iconSvg('sliders', 16)}</span>
                <span>Set Monthly Category Limits</span>
              </button>
            </div>
          </div>
        `;

        host.querySelector('#closeNotifDrawerBtn')?.addEventListener('click', () => {
          local.showNotifications = false;
          renderModals();
        });
        host.querySelector('#homeModalBackdrop')?.addEventListener('click', (e) => {
          if (e.target.id === 'homeModalBackdrop') {
            local.showNotifications = false;
            renderModals();
          }
        });
        host.querySelector('#enableNotifPermBtn')?.addEventListener('click', async () => {
          if (typeof global === 'undefined' || !('Notification' in global)) {
            local.notifPermission = 'unsupported';
            renderModals();
            return;
          }
          try {
            const result = await Notification.requestPermission();
            local.notifPermission = result;
            if (result === 'granted' && categoryThresholdAlerts[0]) {
              new Notification(categoryThresholdAlerts[0].title, {
                body: categoryThresholdAlerts[0].detail,
              });
            }
          } catch {
            // ignore permission errors
          }
          renderModals();
        });
        host.querySelector('#notifOpenLimitsBtn')?.addEventListener('click', () => {
          local.showNotifications = false;
          openCategoryLimitsModal();
        });
        return;
      }

      if (local.showCategoryModal) {
        const symbol = CURRENCY_META[user.currency]?.symbol || 'Rs.';
        host.innerHTML = `
          <div class="modal-backdrop" id="homeModalBackdrop">
            <div class="modal-card">
              <div class="modal-header">
                <div>
                  <h3 class="font-serif" style="font-size:18px;font-weight:700;color:#171717;">Monthly Category Limits</h3>
                  <p style="font-size:12px;color:#737373;">Pennywyse alerts you at 80% and 100% of each limit</p>
                </div>
                <button type="button" id="closeLimitsModalBtn" aria-label="Close" class="icon-btn-circle">
                  ${iconSvg('x', 20)}
                </button>
              </div>

              <form id="categoryLimitsForm" class="stack-sm" style="margin-top:16px;">
                ${Object.keys(local.categoryDraft)
                  .map((cat) => {
                    const spent = monthCategorySpending[cat] || 0;
                    return `
                      <div class="row-between" style="border-radius:12px;border:1px solid #e5e5e5;padding:8px 12px;">
                        <div style="min-width:0;">
                          <p style="font-size:12px;font-weight:600;color:#171717;">${escapeHtml(cat)}</p>
                          <p class="tabular-nums" style="font-size:10px;color:#737373;">
                            Spent this month: ${escapeHtml(formatMoneyCompact(spent, user.currency))}
                          </p>
                        </div>
                        <div class="row-center" style="gap:6px;flex-shrink:0;">
                          <span style="font-size:12px;font-weight:600;color:#737373;">${escapeHtml(symbol)}</span>
                          <input type="number" min="0" step="any" placeholder="No limit" data-limit-cat="${escapeHtml(
                            cat
                          )}" value="${escapeHtml(local.categoryDraft[cat])}" class="input-sm tabular-nums" style="width:96px;text-align:right;" />
                        </div>
                      </div>
                    `;
                  })
                  .join('')}

                <button type="submit" ${local.savingLimits ? 'disabled' : ''} class="btn-primary" style="margin-top:8px;">
                  ${local.savingLimits ? '<span class="spinner"></span>' : ''}
                  <span>Save Category Limits</span>
                </button>
              </form>
            </div>
          </div>
        `;

        host.querySelector('#closeLimitsModalBtn')?.addEventListener('click', () => {
          local.showCategoryModal = false;
          renderModals();
        });
        host.querySelector('#homeModalBackdrop')?.addEventListener('click', (e) => {
          if (e.target.id === 'homeModalBackdrop') {
            local.showCategoryModal = false;
            renderModals();
          }
        });
        host.querySelectorAll('[data-limit-cat]').forEach((inp) => {
          inp.addEventListener('input', (e) => {
            local.categoryDraft[inp.dataset.limitCat] = e.target.value;
          });
        });
        host.querySelector('#categoryLimitsForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          local.savingLimits = true;
          renderModals();
          try {
            const cleaned = {};
            for (const [cat, raw] of Object.entries(local.categoryDraft)) {
              const val = Number(raw);
              if (Number.isFinite(val) && val > 0) cleaned[cat] = val;
            }
            await ctx.updateProfile({ categoryBudgets: cleaned });
          } finally {
            local.savingLimits = false;
          }
        });
        return;
      }

      host.innerHTML = '';
    }

    renderMain();
  }

  PW.renderHomeScreen = renderHomeScreen;
})(window);

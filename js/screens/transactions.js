(function (global) {
  const PW = (global.PW = global.PW || {});

  function renderTransactionsScreen(container, ctx) {
    const {
      computeDashboardTotals,
      formatMoney,
      formatMoneyCompact,
      formatTransactionTime,
      iconSvg,
      pennywyseLogoSvg,
      transactionIconSvg,
      escapeHtml,
      renderBottomNav,
    } = PW;

    const { user, transactions } = ctx.state;
    const totals = computeDashboardTotals(user, transactions);

    const local = {
      searchQuery: '',
      filterTab: 'all',
    };

    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
    );

    function getFiltered() {
      const q = local.searchQuery.trim().toLowerCase();
      return sortedTransactions.filter((tx) => {
        if (local.filterTab === 'income' && tx.type !== 'income') return false;
        if (local.filterTab === 'expenses' && tx.type !== 'expense') return false;
        if (!q) return true;
        return (
          tx.name.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          String(tx.amount).includes(q) ||
          formatTransactionTime(tx.dateISO).toLowerCase().includes(q)
        );
      });
    }

    function renderResultsOnly() {
      const host = container.querySelector('#txDynamicBody');
      if (!host) return;

      const filtered = getFiltered();

      container.querySelectorAll('[data-tx-tab]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.txTab === local.filterTab);
      });

      let summaryHtml = '';
      if (local.filterTab === 'income') {
        summaryHtml = `
          <div class="balance-card crimson-gradient" style="margin-top:16px;padding:16px;">
            <div class="row-between">
              <div>
                <p class="font-serif" style="font-size:12px;color:rgba(255,255,255,0.8);">Total Balance</p>
                <p class="tabular-nums" style="font-size:20px;font-weight:700;">${escapeHtml(
                  formatMoney(totals.totalBalance, user.currency)
                )}</p>
              </div>
              <div style="text-align:right;">
                <p class="font-serif" style="font-size:12px;color:rgba(255,255,255,0.8);">Total Income</p>
                <p class="tabular-nums" style="font-size:20px;font-weight:700;color:#a7f3d0;">+${escapeHtml(
                  formatMoney(totals.totalIncome, user.currency)
                )}</p>
              </div>
            </div>
            <p style="margin-top:8px;font-size:11px;color:rgba(255,255,255,0.8);">
              Starting Balance: ${escapeHtml(formatMoneyCompact(user.openingBalance, user.currency))} · This Month Income: ${escapeHtml(
                formatMoneyCompact(totals.monthIncome, user.currency)
              )}
            </p>
          </div>
        `;
      } else if (local.filterTab === 'expenses') {
        const catMap = new Map();
        for (const tx of filtered) {
          if (tx.type !== 'expense') continue;
          const existing = catMap.get(tx.category);
          if (existing) existing.total += tx.amount;
          else catMap.set(tx.category, { total: tx.amount, color: tx.color });
        }
        const categories = Array.from(catMap.entries())
          .map(([category, info]) => ({ category, ...info }))
          .sort((a, b) => b.total - a.total);

        summaryHtml = `
          <div style="margin-top:16px;border-radius:16px;border:1px solid #e5e5e5;background:#fafafa;padding:14px;">
            <div class="row-between" style="margin-bottom:8px;">
              <span class="font-serif" style="font-size:14px;font-weight:700;color:#171717;">Spent by Category</span>
              <span class="tabular-nums" style="font-size:12px;font-weight:700;color:#B91C1C;">
                Total: ${escapeHtml(formatMoneyCompact(totals.totalExpenses, user.currency))}
              </span>
            </div>
            ${
              categories.length === 0
                ? `<p style="font-size:12px;color:#737373;">No expenses match your search.</p>`
                : `
                  <div class="grid-2" style="gap:8px;">
                    ${categories
                      .map(
                        (item) => `
                          <div class="row-between" style="border-radius:12px;background:#ffffff;padding:8px 10px;border:1px solid #f5f5f5;">
                            <div class="row-center" style="gap:6px;min-width:0;">
                              <span style="width:10px;height:10px;border-radius:9999px;flex-shrink:0;background-color:${escapeHtml(
                                item.color
                              )};"></span>
                              <span style="font-size:12px;font-weight:500;color:#262626;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                ${escapeHtml(item.category)}
                              </span>
                            </div>
                            <span class="tabular-nums" style="font-size:12px;font-weight:700;color:#B91C1C;flex-shrink:0;">
                              ${escapeHtml(formatMoneyCompact(item.total, user.currency))}
                            </span>
                          </div>
                        `
                      )
                      .join('')}
                  </div>
                `
            }
          </div>
        `;
      }

      const listHtml =
        filtered.length === 0
          ? `
            <div style="padding:32px 0;text-align:center;">
              <p style="font-size:14px;font-weight:500;color:#525252;">No transactions found</p>
              <p style="margin-top:4px;font-size:12px;color:#a3a3a3;">Tap "Add other" below to add a new transaction.</p>
            </div>
          `
          : filtered
              .map(
                (tx) => `
                  <div data-tx-edit-row="${escapeHtml(tx.id)}" role="button" tabindex="0" class="tx-row" style="cursor:pointer;">
                    <div class="tx-left">
                      <span class="tx-icon-box" style="background-color:${escapeHtml(tx.color || '#4A90D9')};">
                        ${transactionIconSvg(tx.icon, 20)}
                      </span>
                      <div style="min-width:0;">
                        <div class="row-center" style="gap:6px;">
                          <p class="tx-title">${escapeHtml(tx.name)}</p>
                          <span style="color:#a3a3a3;display:inline-flex;flex-shrink:0;">${iconSvg('pencil', 12)}</span>
                        </div>
                        <p class="tx-sub">${escapeHtml(formatTransactionTime(tx.dateISO))} · ${escapeHtml(tx.category)}</p>
                      </div>
                    </div>
                    <span class="tx-amount tabular-nums ${tx.type === 'income' ? 'income' : 'expense'}">
                      ${tx.type === 'income' ? '+' : '-'}${escapeHtml(formatMoneyCompact(tx.amount, user.currency))}
                    </span>
                  </div>
                `
              )
              .join('');

      host.innerHTML = `
        ${summaryHtml}
        <div class="tx-list" style="margin-top:12px;">
          ${listHtml}
          <button type="button" id="addOtherTxBtn" class="tx-row">
            <div class="tx-left">
              <span class="tx-icon-box" style="background:#d4d4d4;color:#404040;box-shadow:none;">
                ${iconSvg('plus', 22)}
              </span>
              <span class="font-serif" style="font-size:15px;font-weight:500;color:#262626;">Add other</span>
            </div>
          </button>
        </div>
      `;

      host.querySelectorAll('[data-tx-edit-row]').forEach((row) => {
        const open = () => {
          const tx = transactions.find((t) => t.id === row.dataset.txEditRow);
          if (tx) ctx.openTransactionModal(tx);
        };
        row.addEventListener('click', open);
        row.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        });
      });

      host.querySelector('#addOtherTxBtn')?.addEventListener('click', () => {
        ctx.openTransactionModal(null, local.filterTab === 'income' ? 'income' : 'expense');
      });
    }

    function renderMain() {
      container.innerHTML = `
        <div class="screen">
          <div class="screen-scroll">
            <div class="screen-header">
              ${pennywyseLogoSvg('sm')}
              <div class="screen-header-title">
                ${iconSvg('receipt', 20, 2.2)}
                <h1>Transactions</h1>
              </div>
              <div style="width:32px;" aria-hidden="true"></div>
            </div>

            <div class="search-wrap">
              <span class="search-icon">${iconSvg('search', 16)}</span>
              <input
                id="txSearchInput"
                type="search"
                value="${escapeHtml(local.searchQuery)}"
                placeholder="Search your transactions"
                aria-label="Search your transactions"
                class="search-input"
              />
            </div>

            <div class="pill-tabs">
              <button type="button" data-tx-tab="all" class="pill-tab active">All</button>
              <button type="button" data-tx-tab="income" class="pill-tab">Income</button>
              <button type="button" data-tx-tab="expenses" class="pill-tab">Expenses</button>
            </div>

            <div id="txDynamicBody"></div>
          </div>

          ${renderBottomNav('transactions')}
        </div>
      `;

      container.querySelector('#txSearchInput')?.addEventListener('input', (e) => {
        local.searchQuery = e.target.value;
        renderResultsOnly();
      });

      container.querySelectorAll('[data-tx-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          local.filterTab = btn.dataset.txTab;
          renderResultsOnly();
        });
      });

      container.querySelectorAll('[data-nav]').forEach((btn) => {
        btn.addEventListener('click', () => ctx.navigate(btn.dataset.nav));
      });

      renderResultsOnly();
    }

    renderMain();
  }

  PW.renderTransactionsScreen = renderTransactionsScreen;
})(window);

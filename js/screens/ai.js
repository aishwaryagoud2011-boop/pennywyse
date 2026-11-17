(function (global) {
  const PW = (global.PW = global.PW || {});

  const QUICK_PROMPTS = [
    'How can I save more money this month?',
    'Review my budget & category limits',
    'Which expenses should I cut first?',
    'How fast can I reach my saving goals?',
    'Tips to optimize my EMI & tax',
  ];

  function renderAiScreen(container, ctx) {
    const {
      apiRequest,
      computeAnalyticsData,
      computeDashboardTotals,
      formatMoneyCompact,
      iconSvg,
      pennywyseLogoSvg,
      escapeHtml,
      renderBottomNav,
    } = PW;

    const { user, transactions, savingGoals } = ctx.state;

    const buildWelcomeMessage = () => ({
      id: 'welcome-ai',
      role: 'assistant',
      content: `Hi ${user.name}! I'm Pennywyse AI, your personal money coach. Based on the numbers you've entered (${
        transactions.length
      } transaction${transactions.length === 1 ? '' : 's'}, ${formatMoneyCompact(
        user.monthlyBudget,
        user.currency
      )} monthly budget, and ${formatMoneyCompact(
        user.monthlySavingsTarget,
        user.currency
      )} savings target), ask me anything about cutting expenses, hitting your goals, or adjusting your budget.`,
    });

    const totals = computeDashboardTotals(user, transactions);
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthAnalytics = computeAnalyticsData(transactions, 'month', monthKey, '', '');

    const monthCategorySpent = {};
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const d = new Date(tx.dateISO);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        monthCategorySpent[tx.category] = (monthCategorySpent[tx.category] || 0) + (Number(tx.amount) || 0);
      }
    }

    const categoryLimitStatus = Object.entries(user.categoryBudgets || {})
      .filter(([, limit]) => Number(limit) > 0)
      .map(([category, limit]) => {
        const spent = monthCategorySpent[category] || 0;
        const pct = Math.round((spent / Number(limit)) * 100);
        return {
          category,
          limit: Number(limit),
          spent,
          percentUsed: pct,
          status: pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'ok',
        };
      });

    const recentTransactions = [...transactions]
      .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())
      .slice(0, 12)
      .map((tx) => ({
        name: tx.name,
        category: tx.category,
        type: tx.type,
        amount: tx.amount,
        dateISO: tx.dateISO,
      }));

    const financialSummary = {
      userName: user.name,
      currency: user.currency,
      totalBalance: totals.totalBalance,
      openingBalance: user.openingBalance,
      totalIncome: totals.totalIncome,
      totalExpenses: totals.totalExpenses,
      monthlyBudget: totals.monthlyBudget,
      monthIncome: totals.monthIncome,
      monthExpenses: totals.monthExpenses,
      budgetRemaining: totals.budgetRemaining,
      budgetUsedPercent: totals.budgetUsedPercent,
      monthlySavingsTarget: totals.monthlySavingsTarget,
      actualSavedThisMonth: totals.actualSavedThisMonth,
      remainingToSaveThisMonth: totals.remainingToSave,
      estimatedMonthlyEmi: totals.emiTax.monthlyEmi,
      estimatedMonthlyTax: totals.emiTax.monthlyTax,
      effectiveTaxRatePercent: totals.emiTax.effectiveTaxRatePercent,
      topExpenseCategoriesThisMonth: monthAnalytics.slices.slice(0, 6),
      categoryLimits: categoryLimitStatus,
      savingGoals: savingGoals.map((g) => ({
        name: g.name,
        saved: g.savedAmount,
        target: g.targetAmount,
        remaining: Math.max(0, g.targetAmount - g.savedAmount),
        progressPercent:
          g.targetAmount > 0 ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100)) : 0,
      })),
      recentTransactions,
    };

    const alertLimitCount = categoryLimitStatus.filter((c) => c.status !== 'ok').length;

    const local = {
      messages: [buildWelcomeMessage()],
      input: '',
      chatLoading: false,
    };

    function updateMessagesDom() {
      const listEl = container.querySelector('#aiMessagesList');
      const scrollEl = container.querySelector('#aiChatScroll');
      const resetBtn = container.querySelector('#aiResetChatBtn');
      const sendBtn = container.querySelector('#aiSendBtn');
      if (resetBtn) resetBtn.disabled = local.chatLoading;
      if (sendBtn) sendBtn.disabled = local.chatLoading || !local.input.trim();
      container.querySelectorAll('[data-ai-prompt]').forEach((b) => {
        b.disabled = local.chatLoading;
      });

      if (!listEl) return;
      listEl.innerHTML = `
        ${local.messages
          .map(
            (msg) => `
              <div class="chat-row ${msg.role}">
                <div class="chat-bubble ${msg.role}">${escapeHtml(msg.content)}</div>
              </div>
            `
          )
          .join('')}
        ${
          local.chatLoading
            ? `
              <div class="chat-row assistant">
                <div class="chat-bubble assistant row-center" style="font-size:12px;color:#525252;">
                  <span class="spinner" style="color:#A80F0F;width:14px;height:14px;"></span>
                  <span>Analyzing your Pennywyse numbers...</span>
                </div>
              </div>
            `
            : ''
        }
      `;

      if (scrollEl) {
        scrollEl.scrollTop = scrollEl.scrollHeight;
      }
    }

    async function sendMessage(textOverride) {
      const messageText = (textOverride ?? local.input).trim();
      if (!messageText || local.chatLoading) return;

      const userMsg = {
        id: `u_${Date.now()}`,
        role: 'user',
        content: messageText,
      };
      local.messages.push(userMsg);
      if (!textOverride) {
        local.input = '';
        const inp = container.querySelector('#aiChatInput');
        if (inp) inp.value = '';
      }
      local.chatLoading = true;
      updateMessagesDom();

      try {
        const res = await apiRequest('/api/ai/chat', {
          method: 'POST',
          body: {
            message: messageText,
            history: local.messages.map((m) => ({ role: m.role, content: m.content })),
            financialSummary,
          },
        });
        local.messages.push({
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: res.reply,
        });
      } catch (err) {
        local.messages.push({
          id: `e_${Date.now()}`,
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Unable to reach Pennywyse AI right now.',
        });
      } finally {
        local.chatLoading = false;
        updateMessagesDom();
      }
    }

    function renderMain() {
      container.innerHTML = `
        <div class="screen" style="height:100dvh;">
          <div class="ai-header">
            <div class="row-center">
              ${pennywyseLogoSvg('sm')}
              <button type="button" id="aiBackBtn" aria-label="Back to Analytics" class="icon-btn-circle">
                ${iconSvg('arrowLeft', 20)}
              </button>
              <div>
                <h1 class="font-serif row-center" style="font-size:16px;font-weight:700;color:#171717;gap:6px;">
                  <span style="color:#A80F0F;display:inline-flex;">${iconSvg('bot', 16)}</span>
                  <span>Pennywyse AI</span>
                </h1>
                <p style="font-size:11px;color:#737373;">Personal money coach</p>
              </div>
            </div>

            <button type="button" id="aiResetChatBtn" aria-label="Reset conversation" class="row-center" style="min-height:36px;border-radius:12px;border:1px solid #e5e5e5;background:#fafafa;padding:0 10px;font-size:12px;font-weight:600;color:#404040;gap:6px;">
              ${iconSvg('rotateCcw', 14)}
              <span>New chat</span>
            </button>
          </div>

          <div class="ai-snapshot-bar">
            <div class="row-between" style="margin-bottom:6px;">
              <span class="row-center" style="gap:4px;font-size:11px;font-weight:600;color:#525252;">
                <span style="color:#A80F0F;display:inline-flex;">${iconSvg('sparkles', 12)}</span>
                <span>Coaching from your live Pennywyse data</span>
              </span>
              ${
                alertLimitCount > 0
                  ? `<button type="button" id="aiAlertShortcutBtn" style="font-size:11px;font-weight:600;color:#A80F0F;">
                      ${alertLimitCount} limit alert${alertLimitCount > 1 ? 's' : ''}
                    </button>`
                  : ''
              }
            </div>

            <div class="ai-snapshot-grid">
              <div class="ai-snapshot-card">
                <p style="font-size:10px;color:#737373;">Balance</p>
                <p class="tabular-nums" style="font-size:12px;font-weight:700;color:#171717;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${escapeHtml(formatMoneyCompact(totals.totalBalance, user.currency))}
                </p>
              </div>
              <div class="ai-snapshot-card">
                <p style="font-size:10px;color:#737373;">${totals.budgetRemaining >= 0 ? 'Budget Left' : 'Over Budget'}</p>
                <p class="tabular-nums" style="font-size:12px;font-weight:700;color:${
                  totals.budgetRemaining >= 0 ? '#171717' : '#B91C1C'
                };white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${escapeHtml(formatMoneyCompact(Math.abs(totals.budgetRemaining), user.currency))}
                </p>
              </div>
              <div class="ai-snapshot-card">
                <p style="font-size:10px;color:#737373;">Saved / Mo</p>
                <p class="tabular-nums" style="font-size:12px;font-weight:700;color:#047857;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${escapeHtml(formatMoneyCompact(totals.actualSavedThisMonth, user.currency))}
                </p>
              </div>
            </div>
          </div>

          <div id="aiChatScroll" class="ai-chat-body">
            <div id="aiMessagesList" class="stack-md" style="gap:12px;"></div>
            <div class="quick-prompts">
              ${QUICK_PROMPTS.map(
                (q) => `<button type="button" data-ai-prompt="${escapeHtml(q)}" class="quick-prompt-btn">${escapeHtml(q)}</button>`
              ).join('')}
            </div>
          </div>

          <form id="aiChatForm" class="ai-composer">
            <input
              id="aiChatInput"
              type="text"
              value=""
              placeholder="Ask about your budget, goals, or spending..."
              class="input"
              style="border-radius:16px;flex:1;"
            />
            <button type="submit" id="aiSendBtn" disabled aria-label="Send message" class="ai-send-btn crimson-gradient">
              ${iconSvg('send', 16)}
            </button>
          </form>

          ${renderBottomNav('ai')}
        </div>
      `;

      container.querySelector('#aiBackBtn')?.addEventListener('click', () => ctx.navigate('analytics'));
      container.querySelector('#aiResetChatBtn')?.addEventListener('click', () => {
        if (local.chatLoading) return;
        local.messages = [buildWelcomeMessage()];
        updateMessagesDom();
      });
      container.querySelector('#aiAlertShortcutBtn')?.addEventListener('click', () => {
        sendMessage('Which of my category limits are close to or over 100%, and how should I adjust?');
      });
      container.querySelectorAll('[data-ai-prompt]').forEach((btn) => {
        btn.addEventListener('click', () => sendMessage(btn.dataset.aiPrompt));
      });
      container.querySelector('#aiChatInput')?.addEventListener('input', (e) => {
        local.input = e.target.value;
        const sendBtn = container.querySelector('#aiSendBtn');
        if (sendBtn) sendBtn.disabled = local.chatLoading || !local.input.trim();
      });
      container.querySelector('#aiChatForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage();
      });
      container.querySelectorAll('[data-nav]').forEach((btn) => {
        btn.addEventListener('click', () => ctx.navigate(btn.dataset.nav));
      });

      updateMessagesDom();
    }

    renderMain();
  }

  PW.renderAiScreen = renderAiScreen;
})(window);

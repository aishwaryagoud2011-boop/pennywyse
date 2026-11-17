(function (global) {
  const PW = (global.PW = global.PW || {});

  const CURRENCY_META = {
    INR: { symbol: 'Rs.', locale: 'en-IN', label: 'INR (Rs.)' },
    USD: { symbol: '$', locale: 'en-US', label: 'USD ($)' },
    EUR: { symbol: '€', locale: 'de-DE', label: 'EUR (€)' },
    GBP: { symbol: '£', locale: 'en-GB', label: 'GBP (£)' },
  };

  const CATEGORY_PRESETS = [
    { category: 'Food & dining', icon: 'food', color: '#4A90D9', defaultType: 'expense' },
    { category: 'Transport', icon: 'transport', color: '#E86C00', defaultType: 'expense' },
    { category: 'Salary', icon: 'salary', color: '#16A34A', defaultType: 'income' },
    { category: 'Shopping', icon: 'shopping', color: '#E11D74', defaultType: 'expense' },
    { category: 'Entertainment', icon: 'entertainment', color: '#7C3AED', defaultType: 'expense' },
    { category: 'Investment', icon: 'investment', color: '#DC2626', defaultType: 'expense' },
    { category: 'Premiums', icon: 'premiums', color: '#CA8A04', defaultType: 'expense' },
    { category: 'Loan & EMI', icon: 'loan', color: '#0D9488', defaultType: 'expense' },
    { category: 'Utilities', icon: 'utilities', color: '#0284C7', defaultType: 'expense' },
    { category: 'Healthcare', icon: 'health', color: '#DB2777', defaultType: 'expense' },
    { category: 'Freelance & Bonus', icon: 'wallet', color: '#059669', defaultType: 'income' },
    { category: 'Gift & Refund', icon: 'gift', color: '#9333EA', defaultType: 'income' },
  ];

  const COLOR_SWATCHES = [
    '#4A90D9',
    '#E86C00',
    '#16A34A',
    '#E11D74',
    '#7C3AED',
    '#DC2626',
    '#CA8A04',
    '#0D9488',
    '#0284C7',
    '#334155',
  ];

  function formatMoney(amount, currency = 'INR', options = {}) {
    const meta = CURRENCY_META[currency] || CURRENCY_META.INR;
    const decimals = options.decimals ?? 2;
    const abs = Math.abs(Number.isFinite(amount) ? amount : 0);
    const formatted = abs.toLocaleString(meta.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    const sign = options.showSign ? (amount < 0 ? '-' : amount > 0 ? '+' : '') : amount < 0 ? '-' : '';
    const space = currency === 'INR' ? ' ' : '';
    return `${sign}${meta.symbol}${space}${formatted}`;
  }

  function formatMoneyCompact(amount, currency = 'INR') {
    const hasCents = Math.abs(amount % 1) > 0.005;
    return formatMoney(amount, currency, { decimals: hasCents ? 2 : 0 });
  }

  function formatTransactionTime(dateISO) {
    const date = new Date(dateISO);
    if (Number.isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDays = Math.round((startOfToday - startOfTarget) / (1000 * 60 * 60 * 24));
    const timeStr = date
      .toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      .toLowerCase();

    if (diffDays === 0) return `Today, ${timeStr}`;
    if (diffDays === 1) return `Yesterday, ${timeStr}`;
    const datePart = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    return `${datePart}, ${timeStr}`;
  }

  function calculateMonthlyTaxAndEmi(config, currency = 'INR') {
    const annualIncome = Math.max(0, config?.annualIncome || 0);
    let annualTax = 0;

    if (config?.taxRegime === 'custom') {
      annualTax = annualIncome * (Math.max(0, Math.min(60, config.customTaxRatePercent || 0)) / 100);
    } else if (currency === 'INR') {
      if (annualIncome <= 400000) {
        annualTax = 0;
      } else if (annualIncome <= 800000) {
        annualTax = (annualIncome - 400000) * 0.05;
      } else if (annualIncome <= 1200000) {
        annualTax = 20000 + (annualIncome - 800000) * 0.1;
      } else if (annualIncome <= 1600000) {
        annualTax = 60000 + (annualIncome - 1200000) * 0.15;
      } else if (annualIncome <= 2000000) {
        annualTax = 120000 + (annualIncome - 1600000) * 0.2;
      } else if (annualIncome <= 2400000) {
        annualTax = 200000 + (annualIncome - 2000000) * 0.25;
      } else {
        annualTax = 300000 + (annualIncome - 2400000) * 0.3;
      }
    } else if (annualIncome <= 14600) {
      annualTax = 0;
    } else if (annualIncome <= 47000) {
      annualTax = (annualIncome - 14600) * 0.12;
    } else if (annualIncome <= 100000) {
      annualTax = 3888 + (annualIncome - 47000) * 0.22;
    } else {
      annualTax = 15548 + (annualIncome - 100000) * 0.24;
    }

    const monthlyTax = Math.round(annualTax / 12);

    let monthlyEmi = Math.max(0, config?.directMonthlyEmi || 0);
    if (config?.useLoanCalculator && config.loanPrincipal > 0 && config.loanTenureMonths > 0) {
      const monthlyRate = (Math.max(0, config.loanInterestRatePercent || 0) / 100) / 12;
      const n = Math.max(1, Math.round(config.loanTenureMonths));
      if (monthlyRate === 0) {
        monthlyEmi = Math.round(config.loanPrincipal / n);
      } else {
        const factor = Math.pow(1 + monthlyRate, n);
        monthlyEmi = Math.round((config.loanPrincipal * monthlyRate * factor) / (factor - 1));
      }
    }

    return {
      monthlyTax,
      monthlyEmi,
      totalMonthlyObligation: monthlyTax + monthlyEmi,
      effectiveTaxRatePercent: annualIncome > 0 ? Number(((annualTax / annualIncome) * 100).toFixed(1)) : 0,
    };
  }

  function computeDashboardTotals(user, transactions, referenceMonthDate = new Date()) {
    let totalIncome = 0;
    let totalExpenses = 0;
    let monthIncome = 0;
    let monthExpenses = 0;

    const targetYear = referenceMonthDate.getFullYear();
    const targetMonth = referenceMonthDate.getMonth();

    for (const tx of transactions) {
      const amt = Math.max(0, Number(tx.amount) || 0);
      if (tx.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpenses += amt;
      }
      const d = new Date(tx.dateISO);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
        if (tx.type === 'income') monthIncome += amt;
        else monthExpenses += amt;
      }
    }

    const totalBalance = (Number(user.openingBalance) || 0) + totalIncome - totalExpenses;
    const monthlyBudget = Math.max(0, Number(user.monthlyBudget) || 0);
    const budgetRemaining = monthlyBudget - monthExpenses;
    const budgetUsedPercent =
      monthlyBudget > 0 ? Math.min(100, Math.round((monthExpenses / monthlyBudget) * 100)) : 0;
    const budgetRemainingPercent = Math.max(0, 100 - budgetUsedPercent);

    const monthlySavingsTarget = Math.max(0, Number(user.monthlySavingsTarget) || 0);
    const actualSavedThisMonth = Math.max(0, monthIncome - monthExpenses);
    const remainingToSave = Math.max(0, monthlySavingsTarget - actualSavedThisMonth);

    const emiTax = calculateMonthlyTaxAndEmi(user.emiTaxConfig, user.currency);
    const emiTaxPaidThisMonth = transactions
      .filter((tx) => {
        const d = new Date(tx.dateISO);
        const inMonth =
          !Number.isNaN(d.getTime()) && d.getFullYear() === targetYear && d.getMonth() === targetMonth;
        if (!inMonth || tx.type !== 'expense') return false;
        const lower = `${tx.category} ${tx.name}`.toLowerCase();
        return lower.includes('emi') || lower.includes('loan') || lower.includes('tax');
      })
      .reduce((sum, tx) => sum + Math.max(0, Number(tx.amount) || 0), 0);

    return {
      totalIncome,
      totalExpenses,
      totalBalance,
      monthIncome,
      monthExpenses,
      monthlyBudget,
      budgetRemaining,
      budgetUsedPercent,
      budgetRemainingPercent,
      monthlySavingsTarget,
      actualSavedThisMonth,
      remainingToSave,
      emiTax,
      emiTaxPaidThisMonth,
    };
  }

  function getPeriodRange(period, selectedMonthKey, customStart, customEnd) {
    const [yrStr, moStr] = selectedMonthKey.split('-');
    const yr = Number(yrStr) || new Date().getFullYear();
    const mo = (Number(moStr) || new Date().getMonth() + 1) - 1;

    if (period === 'week') {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      const prevEnd = new Date(start.getTime() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 6);
      prevStart.setHours(0, 0, 0, 0);
      return { start, end, prevStart, prevEnd, comparisonLabel: 'vs last week' };
    }

    if (period === 'year') {
      const start = new Date(yr, 0, 1, 0, 0, 0, 0);
      const end = new Date(yr, 11, 31, 23, 59, 59, 999);
      const prevStart = new Date(yr - 1, 0, 1, 0, 0, 0, 0);
      const prevEnd = new Date(yr - 1, 11, 31, 23, 59, 59, 999);
      return { start, end, prevStart, prevEnd, comparisonLabel: 'vs last year' };
    }

    if (period === 'custom') {
      const s = customStart ? new Date(`${customStart}T00:00:00`) : new Date(yr, mo, 1);
      const e = customEnd ? new Date(`${customEnd}T23:59:59`) : new Date(yr, mo + 1, 0, 23, 59, 59);
      const spanMs = Math.max(86400000, e.getTime() - s.getTime());
      const prevEnd = new Date(s.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - spanMs);
      return { start: s, end: e, prevStart, prevEnd, comparisonLabel: 'vs prev range' };
    }

    const start = new Date(yr, mo, 1, 0, 0, 0, 0);
    const end = new Date(yr, mo + 1, 0, 23, 59, 59, 999);
    const prevStart = new Date(yr, mo - 1, 1, 0, 0, 0, 0);
    const prevEnd = new Date(yr, mo, 0, 23, 59, 59, 999);
    return { start, end, prevStart, prevEnd, comparisonLabel: 'vs last month' };
  }

  const PIE_FALLBACK_COLORS = [
    '#38BDF8',
    '#F97316',
    '#22C55E',
    '#EC4899',
    '#8B5CF6',
    '#EF4444',
    '#EAB308',
    '#14B8A6',
  ];

  function computeAnalyticsData(transactions, period, selectedMonthKey, customStart, customEnd) {
    const { start, end, prevStart, prevEnd, comparisonLabel } = getPeriodRange(
      period,
      selectedMonthKey,
      customStart,
      customEnd
    );

    const inRange = (tx, s, e) => {
      const t = new Date(tx.dateISO).getTime();
      return !Number.isNaN(t) && t >= s.getTime() && t <= e.getTime();
    };

    const currentExpenses = transactions.filter((tx) => tx.type === 'expense' && inRange(tx, start, end));
    const currentIncome = transactions.filter((tx) => tx.type === 'income' && inRange(tx, start, end));
    const prevExpenses = transactions.filter((tx) => tx.type === 'expense' && inRange(tx, prevStart, prevEnd));

    const totalSpending = currentExpenses.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const totalPeriodIncome = currentIncome.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const prevTotalSpending = prevExpenses.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

    let percentChange = null;
    if (prevTotalSpending > 0) {
      percentChange = Math.round(((totalSpending - prevTotalSpending) / prevTotalSpending) * 100);
    }

    const byCategory = new Map();
    for (const tx of currentExpenses) {
      const existing = byCategory.get(tx.category);
      if (existing) {
        existing.amount += Number(tx.amount) || 0;
      } else {
        byCategory.set(tx.category, {
          amount: Number(tx.amount) || 0,
          color: tx.color || PIE_FALLBACK_COLORS[byCategory.size % PIE_FALLBACK_COLORS.length],
        });
      }
    }

    const sorted = Array.from(byCategory.entries())
      .map(([category, info], idx) => ({
        category,
        amount: info.amount,
        color: info.color || PIE_FALLBACK_COLORS[idx % PIE_FALLBACK_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);

    const slices = sorted.map((item) => ({
      ...item,
      percentage: totalSpending > 0 ? Math.round((item.amount / totalSpending) * 100) : 0,
    }));

    if (slices.length > 0 && totalSpending > 0) {
      const sumPct = slices.reduce((s, x) => s + x.percentage, 0);
      if (sumPct !== 100) {
        slices[0].percentage += 100 - sumPct;
      }
    }

    return {
      totalSpending,
      totalPeriodIncome,
      prevTotalSpending,
      percentChange,
      comparisonLabel,
      slices,
      filteredTransactions: currentExpenses,
    };
  }

  function buildDefaultGoals(goalInputs) {
    const defaults = [
      { id: 'goal-1', name: 'Vacation', savedAmount: 0, targetAmount: 10000, icon: 'plane' },
      { id: 'goal-2', name: 'Emergency fund', savedAmount: 0, targetAmount: 50000, icon: 'shield' },
      { id: 'goal-3', name: 'New house', savedAmount: 0, targetAmount: 100000, icon: 'home' },
      { id: 'goal-4', name: 'EMI & Tax', savedAmount: 0, targetAmount: 0, icon: 'calculator', isSystemEmiTax: true },
    ];
    if (!goalInputs || goalInputs.length === 0) return defaults;
    return defaults.map((def, idx) => {
      const custom = goalInputs[idx];
      if (!custom) return def;
      return {
        ...def,
        name: custom.name?.trim() || def.name,
        savedAmount: Math.max(0, Number(custom.savedAmount) || 0),
        targetAmount: Math.max(0, Number(custom.targetAmount) || def.targetAmount),
        icon: custom.icon || def.icon,
      };
    });
  }

  PW.CURRENCY_META = CURRENCY_META;
  PW.CATEGORY_PRESETS = CATEGORY_PRESETS;
  PW.COLOR_SWATCHES = COLOR_SWATCHES;
  PW.formatMoney = formatMoney;
  PW.formatMoneyCompact = formatMoneyCompact;
  PW.formatTransactionTime = formatTransactionTime;
  PW.calculateMonthlyTaxAndEmi = calculateMonthlyTaxAndEmi;
  PW.computeDashboardTotals = computeDashboardTotals;
  PW.getPeriodRange = getPeriodRange;
  PW.computeAnalyticsData = computeAnalyticsData;
  PW.buildDefaultGoals = buildDefaultGoals;
})(window);

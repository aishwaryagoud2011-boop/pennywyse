(function (global) {
  const PW = (global.PW = global.PW || {});

  const TOKEN_KEY = 'pennywyse_auth_token';
  const LOCAL_DB_KEY = 'pennywyse_local_db_v1';

  function isLocalFileMode() {
    return global.location?.protocol === 'file:';
  }

  function getStoredToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  function setStoredToken(token) {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // ignore storage errors in restricted contexts
    }
  }

  function readLocalDb() {
    try {
      const raw = localStorage.getItem(LOCAL_DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          workspaces: parsed.workspaces || {},
          emailToUserId: parsed.emailToUserId || {},
          verificationCodes: parsed.verificationCodes || {},
        };
      }
    } catch {
      // ignore parse errors
    }
    return { workspaces: {}, emailToUserId: {}, verificationCodes: {} };
  }

  function writeLocalDb(db) {
    try {
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
    } catch {
      // ignore storage errors
    }
  }

  function localDefaultGoals() {
    return [
      { id: 'goal-1', name: 'Vacation', savedAmount: 0, targetAmount: 10000, icon: 'plane' },
      { id: 'goal-2', name: 'Emergency fund', savedAmount: 0, targetAmount: 50000, icon: 'shield' },
      { id: 'goal-3', name: 'New house', savedAmount: 0, targetAmount: 100000, icon: 'home' },
      { id: 'goal-4', name: 'EMI & Tax', savedAmount: 0, targetAmount: 0, icon: 'calculator', isSystemEmiTax: true },
    ];
  }

  function sanitizeLocalUser(user) {
    const copy = { ...user };
    delete copy.password;
    return copy;
  }

  function genId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function buildLocalCoachReply(message, summary) {
    const q = String(message || '').toLowerCase();
    const cur = summary.currency || 'INR';
    const fmt = (n) => PW.formatMoneyCompact(Number(n) || 0, cur);
    const lines = [];

    const topCats = Array.isArray(summary.topExpenseCategoriesThisMonth)
      ? summary.topExpenseCategoriesThisMonth
      : [];
    const alerts = (Array.isArray(summary.categoryLimits) ? summary.categoryLimits : []).filter(
      (c) => c.percentUsed >= 80
    );
    const goals = (Array.isArray(summary.savingGoals) ? summary.savingGoals : []).filter(
      (g) => g.target > 0
    );

    if (q.includes('limit') || q.includes('budget')) {
      lines.push(
        `Monthly budget check: You've spent ${fmt(summary.monthExpenses)} of ${fmt(summary.monthlyBudget)} (${summary.budgetUsedPercent}% used, ${fmt(summary.budgetRemaining)} remaining).`
      );
      if (alerts.length > 0) {
        lines.push(
          `Category alerts: ${alerts
            .map((a) => `${a.category} is at ${a.percentUsed}% (${fmt(a.spent)} / ${fmt(a.limit)})`)
            .join('; ')}.`
        );
      } else {
        lines.push('No category limits are above 80% right now—nice pacing!');
      }
    } else if (q.includes('cut') || q.includes('save') || q.includes('spend')) {
      if (topCats.length > 0) {
        const top = topCats[0];
        const tenPct = Math.round(top.amount * 0.15);
        lines.push(
          `Your biggest expense this month is ${top.category} at ${fmt(top.amount)} (${top.percentage}% of monthly spending). Trimming it by 15% frees up ${fmt(tenPct)} toward your ${fmt(summary.monthlySavingsTarget)} savings target.`
        );
      } else {
        lines.push(
          `Your current balance is ${fmt(summary.totalBalance)}. Add a few expenses so I can spot which categories to trim first.`
        );
      }
      if (summary.remainingToSaveThisMonth > 0) {
        lines.push(
          `You still need ${fmt(summary.remainingToSaveThisMonth)} more net savings this month to hit your target.`
        );
      }
    } else if (q.includes('goal')) {
      if (goals.length > 0) {
        lines.push(
          goals
            .map((g) => `${g.name}: ${fmt(g.saved)} / ${fmt(g.target)} (${g.progressPercent}% funded, ${fmt(g.remaining)} left)`)
            .join('\n')
        );
      } else {
        lines.push('Set target amounts on your saving goals in Analytics to track timelines.');
      }
    } else if (q.includes('emi') || q.includes('tax')) {
      lines.push(
        `Estimated monthly EMI & Tax is ${fmt((summary.estimatedMonthlyEmi || 0) + (summary.estimatedMonthlyTax || 0))} (${fmt(summary.estimatedMonthlyEmi)} EMI + ${fmt(summary.estimatedMonthlyTax)} tax at ${summary.effectiveTaxRatePercent || 0}% effective rate).`
      );
    } else {
      lines.push(
        `Here is your snapshot: Balance ${fmt(summary.totalBalance)}, Income ${fmt(summary.monthIncome)}, Expenses ${fmt(summary.monthExpenses)}, Saved this month ${fmt(summary.actualSavedThisMonth)}.`
      );
      if (topCats.length > 0) {
        lines.push(`Top spending category: ${topCats[0].category} (${fmt(topCats[0].amount)}).`);
      }
    }

    lines.push(
      '(Local file mode: for full Gemini AI replies, run "npm start" in this folder and open http://localhost:3000.)'
    );
    return lines.join('\n\n');
  }

  function handleLocalFileApi(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body || {};
    const db = readLocalDb();
    const token = getStoredToken();

    const requireLocalWorkspace = () => {
      if (!token || !db.workspaces[token]) {
        throw new Error('Authentication required');
      }
      return db.workspaces[token];
    };

    if (path === '/api/health') {
      return { ok: true, mode: 'local-file' };
    }

    if (path === '/api/auth/register' && method === 'POST') {
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!name || !email || !email.includes('@')) {
        throw new Error('Please provide your name and a valid email address.');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      if (db.emailToUserId[email]) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }

      const userId = genId('usr');
      const monthlyIncome = Math.max(0, Number(body.monthlyIncome) || 0);
      const currency = ['INR', 'USD', 'EUR', 'GBP'].includes(body.currency) ? body.currency : 'INR';
      const user = {
        id: userId,
        name,
        email,
        password,
        authProvider: 'email',
        emailVerified: true,
        tagline: String(body.tagline || '').trim() || 'Smart saver • Big dreamer',
        avatarUrl: '',
        currency,
        openingBalance: Math.max(0, Number(body.openingBalance) || 0),
        monthlyBudget: Math.max(0, Number(body.monthlyBudget) || 0),
        monthlySavingsTarget: Math.max(0, Number(body.monthlySavingsTarget) || 0),
        emiTaxConfig: {
          annualIncome: Math.max(0, Number(body.emiTaxConfig?.annualIncome) || monthlyIncome * 12),
          taxRegime: body.emiTaxConfig?.taxRegime === 'custom' ? 'custom' : 'auto',
          customTaxRatePercent: Math.max(0, Number(body.emiTaxConfig?.customTaxRatePercent) || 10),
          loanPrincipal: Math.max(0, Number(body.emiTaxConfig?.loanPrincipal) || 0),
          loanInterestRatePercent: Math.max(0, Number(body.emiTaxConfig?.loanInterestRatePercent) || 9.5),
          loanTenureMonths: Math.max(0, Number(body.emiTaxConfig?.loanTenureMonths) || 24),
          directMonthlyEmi: Math.max(0, Number(body.emiTaxConfig?.directMonthlyEmi) || 0),
          useLoanCalculator: Boolean(body.emiTaxConfig?.useLoanCalculator),
        },
        notificationsEnabled: true,
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
      };

      const transactions = Array.isArray(body.initialTransactions)
        ? body.initialTransactions.map((tx) => ({
            id: tx.id || genId('tx'),
            name: String(tx.name || 'Transaction').trim(),
            category: String(tx.category || 'Other').trim(),
            type: tx.type === 'income' ? 'income' : 'expense',
            amount: Math.max(0, Number(tx.amount) || 0),
            dateISO: tx.dateISO || new Date().toISOString(),
            icon: tx.icon || 'wallet',
            color: tx.color || '#4A90D9',
            note: tx.note || '',
          }))
        : [];

      if (monthlyIncome > 0 && !transactions.some((t) => t.type === 'income')) {
        transactions.unshift({
          id: genId('tx'),
          name: 'Salary',
          category: 'Salary',
          type: 'income',
          amount: monthlyIncome,
          dateISO: new Date().toISOString(),
          icon: 'salary',
          color: '#16A34A',
          note: 'Monthly income',
        });
      }

      const savingGoals =
        Array.isArray(body.savingGoals) && body.savingGoals.length === 4
          ? body.savingGoals
          : localDefaultGoals();

      db.workspaces[userId] = { user, transactions, savingGoals };
      db.emailToUserId[email] = userId;
      writeLocalDb(db);
      return { token: userId, user: sanitizeLocalUser(user), transactions, savingGoals };
    }

    if (path === '/api/auth/send-code' && method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address.');
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      db.verificationCodes[email] = {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000,
        name: String(body.name || '').trim() || undefined,
      };
      writeLocalDb(db);
      return {
        sent: true,
        existingAccount: Boolean(db.emailToUserId[email]),
        verificationCodePreview: code,
      };
    }

    if (path === '/api/auth/verify-email' && method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      const code = String(body.code || '').trim();
      const password = String(body.password || '');
      if (!email || !email.includes('@')) {
        throw new Error('Valid email is required.');
      }
      const existingUserId = db.emailToUserId[email];
      if (existingUserId && password) {
        const ws = db.workspaces[existingUserId];
        if (!ws || ws.user.password !== password) {
          throw new Error('Incorrect email or password.');
        }
        return {
          token: existingUserId,
          user: sanitizeLocalUser(ws.user),
          transactions: ws.transactions,
          savingGoals: ws.savingGoals,
        };
      }
      const pending = db.verificationCodes[email];
      if (!pending || pending.expiresAt < Date.now() || pending.code !== code) {
        throw new Error('Invalid or expired verification code.');
      }
      delete db.verificationCodes[email];
      if (existingUserId && db.workspaces[existingUserId]) {
        const ws = db.workspaces[existingUserId];
        ws.user.emailVerified = true;
        writeLocalDb(db);
        return {
          token: existingUserId,
          user: sanitizeLocalUser(ws.user),
          transactions: ws.transactions,
          savingGoals: ws.savingGoals,
        };
      }
      const userId = genId('usr');
      const rawName = String(body.name || pending.name || email.split('@')[0]).replace(/[._-]+/g, ' ');
      const user = {
        id: userId,
        name: rawName.charAt(0).toUpperCase() + rawName.slice(1),
        email,
        password,
        authProvider: 'email',
        emailVerified: true,
        tagline: 'Smart saver • Big dreamer',
        avatarUrl: '',
        currency: 'INR',
        openingBalance: 0,
        monthlyBudget: 0,
        monthlySavingsTarget: 0,
        emiTaxConfig: {
          annualIncome: 0,
          taxRegime: 'auto',
          customTaxRatePercent: 10,
          loanPrincipal: 0,
          loanInterestRatePercent: 9.5,
          loanTenureMonths: 24,
          directMonthlyEmi: 0,
          useLoanCalculator: false,
        },
        notificationsEnabled: true,
        onboardingComplete: false,
        createdAt: new Date().toISOString(),
      };
      db.workspaces[userId] = { user, transactions: [], savingGoals: localDefaultGoals() };
      db.emailToUserId[email] = userId;
      writeLocalDb(db);
      return {
        token: userId,
        user: sanitizeLocalUser(user),
        transactions: [],
        savingGoals: db.workspaces[userId].savingGoals,
      };
    }

    if (path === '/api/auth/google' && method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      const name = String(body.name || '').trim();
      if (!email || !email.includes('@') || !name) {
        throw new Error('Please provide your Google account name and email.');
      }
      const existingUserId = db.emailToUserId[email];
      if (existingUserId && db.workspaces[existingUserId]) {
        const ws = db.workspaces[existingUserId];
        return {
          token: existingUserId,
          user: sanitizeLocalUser(ws.user),
          transactions: ws.transactions,
          savingGoals: ws.savingGoals,
        };
      }
      const userId = genId('usr');
      const user = {
        id: userId,
        name,
        email,
        password: '',
        authProvider: 'google',
        emailVerified: true,
        tagline: 'Smart saver • Big dreamer',
        avatarUrl: '',
        currency: 'INR',
        openingBalance: 0,
        monthlyBudget: 0,
        monthlySavingsTarget: 0,
        emiTaxConfig: {
          annualIncome: 0,
          taxRegime: 'auto',
          customTaxRatePercent: 10,
          loanPrincipal: 0,
          loanInterestRatePercent: 9.5,
          loanTenureMonths: 24,
          directMonthlyEmi: 0,
          useLoanCalculator: false,
        },
        notificationsEnabled: true,
        onboardingComplete: false,
        createdAt: new Date().toISOString(),
      };
      db.workspaces[userId] = { user, transactions: [], savingGoals: localDefaultGoals() };
      db.emailToUserId[email] = userId;
      writeLocalDb(db);
      return {
        token: userId,
        user: sanitizeLocalUser(user),
        transactions: [],
        savingGoals: db.workspaces[userId].savingGoals,
      };
    }

    if (path === '/api/auth/me' && method === 'GET') {
      const ws = requireLocalWorkspace();
      return {
        user: sanitizeLocalUser(ws.user),
        transactions: ws.transactions,
        savingGoals: ws.savingGoals,
      };
    }

    if (path === '/api/user/profile' && method === 'PUT') {
      const ws = requireLocalWorkspace();
      const u = ws.user;
      if (typeof body.name === 'string' && body.name.trim()) u.name = body.name.trim();
      if (typeof body.tagline === 'string') u.tagline = body.tagline.trim() || 'Smart saver • Big dreamer';
      if (typeof body.avatarUrl === 'string') u.avatarUrl = body.avatarUrl;
      if (body.currency && ['INR', 'USD', 'EUR', 'GBP'].includes(body.currency)) u.currency = body.currency;
      if (body.openingBalance !== undefined) u.openingBalance = Math.max(0, Number(body.openingBalance) || 0);
      if (body.monthlyBudget !== undefined) u.monthlyBudget = Math.max(0, Number(body.monthlyBudget) || 0);
      if (body.monthlySavingsTarget !== undefined) {
        u.monthlySavingsTarget = Math.max(0, Number(body.monthlySavingsTarget) || 0);
      }
      if (body.categoryBudgets && typeof body.categoryBudgets === 'object') {
        const cleaned = {};
        for (const [k, v] of Object.entries(body.categoryBudgets)) {
          const num = Math.max(0, Number(v) || 0);
          if (k.trim() && num > 0) cleaned[k.trim()] = num;
        }
        u.categoryBudgets = cleaned;
      }
      if (typeof body.notificationsEnabled === 'boolean') u.notificationsEnabled = body.notificationsEnabled;
      if (typeof body.onboardingComplete === 'boolean') u.onboardingComplete = body.onboardingComplete;
      if (body.emiTaxConfig) {
        u.emiTaxConfig = { ...u.emiTaxConfig, ...body.emiTaxConfig };
      }
      if (Array.isArray(body.initialTransactions) && body.initialTransactions.length > 0) {
        for (const tx of body.initialTransactions) {
          ws.transactions.push({
            id: tx.id || genId('tx'),
            name: String(tx.name || 'Transaction').trim(),
            category: String(tx.category || 'Other').trim(),
            type: tx.type === 'income' ? 'income' : 'expense',
            amount: Math.max(0, Number(tx.amount) || 0),
            dateISO: tx.dateISO || new Date().toISOString(),
            icon: tx.icon || 'wallet',
            color: tx.color || '#4A90D9',
            note: tx.note || '',
          });
        }
      }
      if (typeof body.initialIncome === 'number' && body.initialIncome > 0 && ws.transactions.length === 0) {
        ws.transactions.unshift({
          id: genId('tx'),
          name: 'Salary',
          category: 'Salary',
          type: 'income',
          amount: body.initialIncome,
          dateISO: new Date().toISOString(),
          icon: 'salary',
          color: '#16A34A',
          note: 'Monthly income',
        });
      }
      if (Array.isArray(body.savingGoals) && body.savingGoals.length === 4) {
        ws.savingGoals = body.savingGoals;
      }
      writeLocalDb(db);
      return {
        user: sanitizeLocalUser(u),
        transactions: ws.transactions,
        savingGoals: ws.savingGoals,
      };
    }

    if (path === '/api/transactions' && method === 'POST') {
      const ws = requireLocalWorkspace();
      const items = Array.isArray(body.items) ? body.items : [body];
      const added = [];
      for (const item of items) {
        const name = String(item?.name || '').trim();
        const amount = Number(item?.amount);
        if (!name || !Number.isFinite(amount) || amount <= 0) {
          throw new Error('Transaction name and a positive amount are required.');
        }
        const created = {
          id: genId('tx'),
          name,
          category: String(item.category || 'Other').trim(),
          type: item.type === 'income' ? 'income' : 'expense',
          amount,
          dateISO: item.dateISO || new Date().toISOString(),
          icon: String(item.icon || 'wallet'),
          color: String(item.color || '#4A90D9'),
          note: String(item.note || ''),
        };
        ws.transactions.unshift(created);
        added.push(created);
      }
      writeLocalDb(db);
      return { transactions: ws.transactions, added };
    }

    if (path.startsWith('/api/transactions/') && method === 'PUT') {
      const ws = requireLocalWorkspace();
      const id = path.slice('/api/transactions/'.length);
      const idx = ws.transactions.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error('Transaction not found.');
      const ex = ws.transactions[idx];
      ws.transactions[idx] = {
        ...ex,
        name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : ex.name,
        category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : ex.category,
        type: body.type === 'income' || body.type === 'expense' ? body.type : ex.type,
        amount: body.amount !== undefined && Number(body.amount) > 0 ? Number(body.amount) : ex.amount,
        dateISO: typeof body.dateISO === 'string' && body.dateISO ? body.dateISO : ex.dateISO,
        icon: typeof body.icon === 'string' && body.icon ? body.icon : ex.icon,
        color: typeof body.color === 'string' && body.color ? body.color : ex.color,
        note: typeof body.note === 'string' ? body.note : ex.note,
      };
      writeLocalDb(db);
      return { transactions: ws.transactions };
    }

    if (path.startsWith('/api/transactions/') && method === 'DELETE') {
      const ws = requireLocalWorkspace();
      const id = path.slice('/api/transactions/'.length);
      ws.transactions = ws.transactions.filter((t) => t.id !== id);
      writeLocalDb(db);
      return { transactions: ws.transactions };
    }

    if (path === '/api/goals' && method === 'PUT') {
      const ws = requireLocalWorkspace();
      const goals = body.savingGoals;
      if (!Array.isArray(goals) || goals.length !== 4) {
        throw new Error('Exactly 4 saving goals are required.');
      }
      ws.savingGoals = goals.map((g, i) => ({
        id: g.id || `goal-${i + 1}`,
        name: String(g.name || `Goal ${i + 1}`).trim(),
        savedAmount: Math.max(0, Number(g.savedAmount) || 0),
        targetAmount: Math.max(0, Number(g.targetAmount) || 0),
        icon: String(g.icon || 'sparkles'),
        isSystemEmiTax: Boolean(g.isSystemEmiTax),
      }));
      writeLocalDb(db);
      return { savingGoals: ws.savingGoals };
    }

    if (path === '/api/ai/chat' && method === 'POST') {
      requireLocalWorkspace();
      return {
        reply: buildLocalCoachReply(body.message, body.financialSummary || {}),
      };
    }

    throw new Error('Unsupported offline action.');
  }

  async function apiRequest(path, options = {}) {
    if (isLocalFileMode()) {
      return handleLocalFileApi(path, options);
    }

    const token = getStoredToken();
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(path, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  }

  PW.isLocalFileMode = isLocalFileMode;
  PW.getStoredToken = getStoredToken;
  PW.setStoredToken = setStoredToken;
  PW.apiRequest = apiRequest;
})(window);

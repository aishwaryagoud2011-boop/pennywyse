import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'pennywyse-db.json');
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto
    .createHash('sha256')
    .update(process.env.APP_URL || process.cwd())
    .digest('hex');

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const empty = {
      workspaces: {},
      emailToUserId: {},
      verificationCodes: {},
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2), 'utf-8');
    return empty;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      workspaces: parsed.workspaces || {},
      emailToUserId: parsed.emailToUserId || {},
      verificationCodes: parsed.verificationCodes || {},
    };
  } catch {
    return { workspaces: {}, emailToUserId: {}, verificationCodes: {} };
  }
}

function saveDb(db) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, keyHex] = stored.split(':');
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function signToken(userId) {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return decoded.userId || null;
  } catch {
    return null;
  }
}

function sanitizeUser(user) {
  const { passwordHash: _removed, ...safe } = user;
  return safe;
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function defaultGoals() {
  return [
    { id: 'goal-1', name: 'Vacation', savedAmount: 0, targetAmount: 10000, icon: 'plane' },
    { id: 'goal-2', name: 'Emergency fund', savedAmount: 0, targetAmount: 50000, icon: 'shield' },
    { id: 'goal-3', name: 'New house', savedAmount: 0, targetAmount: 100000, icon: 'home' },
    { id: 'goal-4', name: 'EMI & Tax', savedAmount: 0, targetAmount: 0, icon: 'calculator', isSystemEmiTax: true },
  ];
}

const app = express();
app.use(express.json({ limit: '2mb' }));

function requireAuth(req, res) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const userId = verifyToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  const db = ensureDb();
  const workspace = db.workspaces[userId];
  if (!workspace) {
    res.status(401).json({ error: 'Account session expired. Please sign in again.' });
    return null;
  }
  return { db, workspace };
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Register full account from Sign Up screen
app.post('/api/auth/register', (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!name || !email || !email.includes('@')) {
    res.status(400).json({ error: 'Please provide your name and a valid email address.' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const db = ensureDb();
  if (db.emailToUserId[email]) {
    res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
    return;
  }

  const userId = `usr_${crypto.randomUUID()}`;
  const monthlyIncome = Math.max(0, Number(body.monthlyIncome) || 0);
  const currency = ['INR', 'USD', 'EUR', 'GBP'].includes(body.currency) ? body.currency : 'INR';

  const user = {
    id: userId,
    name,
    email,
    passwordHash: hashPassword(password),
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
        id: tx.id || `tx_${crypto.randomUUID()}`,
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
      id: `tx_${crypto.randomUUID()}`,
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
    Array.isArray(body.savingGoals) && body.savingGoals.length === 4 ? body.savingGoals : defaultGoals();

  db.workspaces[userId] = { user, transactions, savingGoals };
  db.emailToUserId[email] = userId;
  saveDb(db);

  const token = signToken(userId);
  res.status(201).json({
    token,
    user: sanitizeUser(user),
    transactions,
    savingGoals,
  });
});

// Send 6-digit email verification code
app.post('/api/auth/send-code', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const name = String(req.body?.name || '').trim();
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  const db = ensureDb();
  const code = String(crypto.randomInt(100000, 999999));
  db.verificationCodes[email] = {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
    name: name || undefined,
  };
  saveDb(db);

  const existingUserId = db.emailToUserId[email];
  res.json({
    sent: true,
    existingAccount: Boolean(existingUserId),
    verificationCodePreview: code,
  });
});

// Verify code OR password for Continue with Email
app.post('/api/auth/verify-email', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const code = String(req.body?.code || '').trim();
  const password = String(req.body?.password || '');
  const name = String(req.body?.name || '').trim();

  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email is required.' });
    return;
  }

  const db = ensureDb();
  const existingUserId = db.emailToUserId[email];

  if (existingUserId && password) {
    const ws = db.workspaces[existingUserId];
    if (!ws || !verifyPassword(password, ws.user.passwordHash)) {
      res.status(401).json({ error: 'Incorrect email or password.' });
      return;
    }
    const token = signToken(existingUserId);
    res.json({
      token,
      user: sanitizeUser(ws.user),
      transactions: ws.transactions,
      savingGoals: ws.savingGoals,
    });
    return;
  }

  const pending = db.verificationCodes[email];
  if (!pending || pending.expiresAt < Date.now() || pending.code !== code) {
    res.status(400).json({ error: 'Invalid or expired verification code.' });
    return;
  }
  delete db.verificationCodes[email];

  if (existingUserId && db.workspaces[existingUserId]) {
    const ws = db.workspaces[existingUserId];
    ws.user.emailVerified = true;
    saveDb(db);
    const token = signToken(existingUserId);
    res.json({
      token,
      user: sanitizeUser(ws.user),
      transactions: ws.transactions,
      savingGoals: ws.savingGoals,
    });
    return;
  }

  const userId = `usr_${crypto.randomUUID()}`;
  const derivedName = name || pending.name || email.split('@')[0].replace(/[._-]+/g, ' ');
  const formattedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);
  const user = {
    id: userId,
    name: formattedName,
    email,
    passwordHash: password ? hashPassword(password) : '',
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

  db.workspaces[userId] = { user, transactions: [], savingGoals: defaultGoals() };
  db.emailToUserId[email] = userId;
  saveDb(db);

  const token = signToken(userId);
  res.status(201).json({
    token,
    user: sanitizeUser(user),
    transactions: [],
    savingGoals: db.workspaces[userId].savingGoals,
  });
});

// Continue with Google verification
app.post('/api/auth/google', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const name = String(req.body?.name || '').trim();
  if (!email || !email.includes('@') || !name) {
    res.status(400).json({ error: 'Please provide your Google account name and email.' });
    return;
  }

  const db = ensureDb();
  const existingUserId = db.emailToUserId[email];
  if (existingUserId && db.workspaces[existingUserId]) {
    const ws = db.workspaces[existingUserId];
    const token = signToken(existingUserId);
    res.json({
      token,
      user: sanitizeUser(ws.user),
      transactions: ws.transactions,
      savingGoals: ws.savingGoals,
    });
    return;
  }

  const userId = `usr_${crypto.randomUUID()}`;
  const user = {
    id: userId,
    name,
    email,
    passwordHash: '',
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

  db.workspaces[userId] = { user, transactions: [], savingGoals: defaultGoals() };
  db.emailToUserId[email] = userId;
  saveDb(db);

  const token = signToken(userId);
  res.status(201).json({
    token,
    user: sanitizeUser(user),
    transactions: [],
    savingGoals: db.workspaces[userId].savingGoals,
  });
});

// Current authenticated session
app.get('/api/auth/me', (req, res) => {
  const ctx = requireAuth(req, res);
  if (!ctx) return;
  res.json({
    user: sanitizeUser(ctx.workspace.user),
    transactions: ctx.workspace.transactions,
    savingGoals: ctx.workspace.savingGoals,
  });
});

// Complete onboarding or update user profile
app.put('/api/user/profile', (req, res) => {
  const ctx = requireAuth(req, res);
  if (!ctx) return;
  const { db, workspace } = ctx;
  const b = req.body || {};

  const u = workspace.user;
  if (typeof b.name === 'string' && b.name.trim()) u.name = b.name.trim();
  if (typeof b.tagline === 'string') u.tagline = b.tagline.trim() || 'Smart saver • Big dreamer';
  if (typeof b.avatarUrl === 'string') u.avatarUrl = b.avatarUrl;
  if (b.currency && ['INR', 'USD', 'EUR', 'GBP'].includes(b.currency)) u.currency = b.currency;
  if (b.openingBalance !== undefined) u.openingBalance = Math.max(0, Number(b.openingBalance) || 0);
  if (b.monthlyBudget !== undefined) u.monthlyBudget = Math.max(0, Number(b.monthlyBudget) || 0);
  if (b.monthlySavingsTarget !== undefined) {
    u.monthlySavingsTarget = Math.max(0, Number(b.monthlySavingsTarget) || 0);
  }
  if (b.categoryBudgets && typeof b.categoryBudgets === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(b.categoryBudgets)) {
      const key = String(k).trim();
      const num = Math.max(0, Number(v) || 0);
      if (key && num > 0) cleaned[key] = num;
    }
    u.categoryBudgets = cleaned;
  }
  if (typeof b.notificationsEnabled === 'boolean') u.notificationsEnabled = b.notificationsEnabled;
  if (typeof b.onboardingComplete === 'boolean') u.onboardingComplete = b.onboardingComplete;
  if (b.emiTaxConfig) {
    u.emiTaxConfig = {
      ...u.emiTaxConfig,
      ...b.emiTaxConfig,
      annualIncome: Math.max(0, Number(b.emiTaxConfig.annualIncome ?? u.emiTaxConfig.annualIncome) || 0),
      customTaxRatePercent: Math.max(
        0,
        Number(b.emiTaxConfig.customTaxRatePercent ?? u.emiTaxConfig.customTaxRatePercent) || 0
      ),
      loanPrincipal: Math.max(0, Number(b.emiTaxConfig.loanPrincipal ?? u.emiTaxConfig.loanPrincipal) || 0),
      loanInterestRatePercent: Math.max(
        0,
        Number(b.emiTaxConfig.loanInterestRatePercent ?? u.emiTaxConfig.loanInterestRatePercent) || 0
      ),
      loanTenureMonths: Math.max(
        0,
        Number(b.emiTaxConfig.loanTenureMonths ?? u.emiTaxConfig.loanTenureMonths) || 0
      ),
      directMonthlyEmi: Math.max(
        0,
        Number(b.emiTaxConfig.directMonthlyEmi ?? u.emiTaxConfig.directMonthlyEmi) || 0
      ),
      useLoanCalculator: Boolean(b.emiTaxConfig.useLoanCalculator ?? u.emiTaxConfig.useLoanCalculator),
    };
  }

  if (Array.isArray(b.initialTransactions) && b.initialTransactions.length > 0) {
    for (const tx of b.initialTransactions) {
      workspace.transactions.push({
        id: tx.id || `tx_${crypto.randomUUID()}`,
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

  if (typeof b.initialIncome === 'number' && b.initialIncome > 0 && workspace.transactions.length === 0) {
    workspace.transactions.unshift({
      id: `tx_${crypto.randomUUID()}`,
      name: 'Salary',
      category: 'Salary',
      type: 'income',
      amount: b.initialIncome,
      dateISO: new Date().toISOString(),
      icon: 'salary',
      color: '#16A34A',
      note: 'Monthly income',
    });
  }

  if (Array.isArray(b.savingGoals) && b.savingGoals.length === 4) {
    workspace.savingGoals = b.savingGoals;
  }

  saveDb(db);
  res.json({
    user: sanitizeUser(u),
    transactions: workspace.transactions,
    savingGoals: workspace.savingGoals,
  });
});

// Add transaction(s)
app.post('/api/transactions', (req, res) => {
  const ctx = requireAuth(req, res);
  if (!ctx) return;
  const { db, workspace } = ctx;

  const items = Array.isArray(req.body?.items) ? req.body.items : [req.body];
  const added = [];
  for (const item of items) {
    const name = String(item?.name || '').trim();
    const amount = Number(item?.amount);
    if (!name || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'Transaction name and a positive amount are required.' });
      return;
    }
    const created = {
      id: `tx_${crypto.randomUUID()}`,
      name,
      category: String(item.category || 'Other').trim(),
      type: item.type === 'income' ? 'income' : 'expense',
      amount,
      dateISO: item.dateISO || new Date().toISOString(),
      icon: String(item.icon || 'wallet'),
      color: String(item.color || '#4A90D9'),
      note: String(item.note || ''),
    };
    workspace.transactions.unshift(created);
    added.push(created);
  }

  saveDb(db);
  res.status(201).json({ transactions: workspace.transactions, added });
});

// Update transaction
app.put('/api/transactions/:id', (req, res) => {
  const ctx = requireAuth(req, res);
  if (!ctx) return;
  const { db, workspace } = ctx;
  const idx = workspace.transactions.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Transaction not found.' });
    return;
  }

  const existing = workspace.transactions[idx];
  const b = req.body || {};
  workspace.transactions[idx] = {
    ...existing,
    name: typeof b.name === 'string' && b.name.trim() ? b.name.trim() : existing.name,
    category: typeof b.category === 'string' && b.category.trim() ? b.category.trim() : existing.category,
    type: b.type === 'income' || b.type === 'expense' ? b.type : existing.type,
    amount: b.amount !== undefined && Number(b.amount) > 0 ? Number(b.amount) : existing.amount,
    dateISO: typeof b.dateISO === 'string' && b.dateISO ? b.dateISO : existing.dateISO,
    icon: typeof b.icon === 'string' && b.icon ? b.icon : existing.icon,
    color: typeof b.color === 'string' && b.color ? b.color : existing.color,
    note: typeof b.note === 'string' ? b.note : existing.note,
  };

  saveDb(db);
  res.json({ transactions: workspace.transactions });
});

// Delete transaction
app.delete('/api/transactions/:id', (req, res) => {
  const ctx = requireAuth(req, res);
  if (!ctx) return;
  const { db, workspace } = ctx;
  workspace.transactions = workspace.transactions.filter((t) => t.id !== req.params.id);
  saveDb(db);
  res.json({ transactions: workspace.transactions });
});

// Update saving goals
app.put('/api/goals', (req, res) => {
  const ctx = requireAuth(req, res);
  if (!ctx) return;
  const { db, workspace } = ctx;
  const goals = req.body?.savingGoals;
  if (!Array.isArray(goals) || goals.length !== 4) {
    res.status(400).json({ error: 'Exactly 4 saving goals are required.' });
    return;
  }
  workspace.savingGoals = goals.map((g, i) => ({
    id: g.id || `goal-${i + 1}`,
    name: String(g.name || `Goal ${i + 1}`).trim(),
    savedAmount: Math.max(0, Number(g.savedAmount) || 0),
    targetAmount: Math.max(0, Number(g.targetAmount) || 0),
    icon: String(g.icon || 'sparkles'),
    isSystemEmiTax: Boolean(g.isSystemEmiTax),
  }));
  saveDb(db);
  res.json({ savingGoals: workspace.savingGoals });
});

// Gemini AI Financial Coach Chat
app.post('/api/ai/chat', async (req, res) => {
  const ctx = requireAuth(req, res);
  if (!ctx) return;

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error: 'Gemini API key is not configured on the server yet. Please configure GEMINI_API_KEY in Settings > Secrets.',
    });
    return;
  }

  const message = String(req.body?.message || '').trim();
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const financialSummary = req.body?.financialSummary || {};

  if (!message) {
    res.status(400).json({ error: 'Please enter a message.' });
    return;
  }

  try {
    const systemInstruction = [
      'You are Pennywyse AI, a practical, warm, concise personal finance coach inside the Pennywyse mobile app.',
      'Your advice must be grounded strictly in the user-entered Pennywyse data provided in the snapshot (their balance, monthly budget, category limits, transactions, monthly savings target, 4 saving goals, and calculated EMI & tax).',
      'Refer to exact numbers, categories, category limits (>=80% warnings or exceeded categories), and goal gaps from their snapshot when helpful.',
      'Help the user explore "what-if" savings plans, cut discretionary spending, prioritize saving goals, or manage monthly EMI & tax obligations.',
      'Never invent fake transactions, fake balances, or claim live external bank/UPI connections.',
      'Keep answers crisp, structured for mobile screens (short paragraphs or concise bullet points), and always use the user currency.',
      `Current User Financial Snapshot: ${JSON.stringify(financialSummary)}`,
    ].join('\n');

    const conversationContext = history
      .slice(-10)
      .map((m) => `${m.role === 'user' ? 'User' : 'Pennywyse AI'}: ${m.content}`)
      .join('\n');

    const prompt = conversationContext
      ? `${conversationContext}\nUser: ${message}\nPennywyse AI:`
      : `User: ${message}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    const reply =
      response.text?.trim() ||
      'I reviewed your Pennywyse numbers—try trimming your top discretionary category by 10% this month to reach your savings target faster.';
    res.json({ reply });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'AI request failed';
    res.status(500).json({ error: `Pennywyse AI encountered an issue: ${errMsg}` });
  }
});

// Serve plain HTML, CSS, and JavaScript assets
const rootDir = process.cwd();
const publicAssetsDir = path.resolve(rootDir, 'public', 'assets');
const distDir = path.resolve(rootDir, 'dist');
const useDist =
  process.env.NODE_ENV === 'production' && fs.existsSync(path.join(distDir, 'index.html'));
const entryDir = useDist ? distDir : rootDir;

// Kill-switch for any legacy vite-plugin-pwa /dev-sw.js registration in the user's browser
app.get('/dev-sw.js', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('application/javascript').send(`
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.navigate(client.url);
    }
  })());
});
`);
});

app.get('/registerSW.js', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('application/javascript').send('// Handled by ./js/pwa.js\n');
});

app.get('/manifest.webmanifest', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.type('application/manifest+json');
  res.sendFile(path.join(entryDir, 'manifest.webmanifest'));
});

app.get('/sw.js', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('application/javascript');
  res.sendFile(path.join(entryDir, 'sw.js'));
});

if (useDist) {
  app.use(
    express.static(distDir, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('sw.js') || filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        } else {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );
} else {
  const staticOpts = {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-cache');
    },
  };
  app.use('/css', express.static(path.join(rootDir, 'css'), staticOpts));
  app.use('/js', express.static(path.join(rootDir, 'js'), staticOpts));
  if (fs.existsSync(publicAssetsDir)) {
    app.use('/assets', express.static(publicAssetsDir, staticOpts));
  }

  const rootAssetFiles = [
    '/icon.svg',
    '/apple-touch-icon.png',
    '/pwa-192x192.png',
    '/pwa-512x512.png',
    '/pwa-maskable-512x512.png',
    '/favicon.ico',
  ];
  for (const rel of rootAssetFiles) {
    app.get(rel, (_req, res) => {
      const target = path.join(rootDir, rel.slice(1));
      if (!fs.existsSync(target)) {
        res.status(404).end();
        return;
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(target);
    });
  }

  app.get(['/', '/index.html'], (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(rootDir, 'index.html'));
  });
}

app.get('*', (req, res) => {
  const reqPath = req.path || '';
  if (
    reqPath.startsWith('/api/') ||
    reqPath.startsWith('/@') ||
    reqPath.startsWith('/src/') ||
    /\.(js|mjs|ts|tsx|jsx|css|map|png|jpg|jpeg|gif|svg|ico|webp|woff2?|json|webmanifest)$/i.test(reqPath)
  ) {
    res.status(404).end();
    return;
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(entryDir, 'index.html'));
});

const PORT = Number(process.env.PORT) || 3000;
const httpServer = http.createServer(app);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(
    `Pennywyse server running on http://0.0.0.0:${PORT} (serving ${useDist ? 'dist/' : 'root index.html'})`
  );
});

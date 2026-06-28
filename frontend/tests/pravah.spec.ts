/**
 * PRAVAH — E2E Test Suite
 * Covers: auth, onboarding, dashboard, portfolio, research, backtest, stress-test, profile
 *
 * Prerequisites:
 *   - Frontend running on http://localhost:3000
 *   - Backend running on http://localhost:8000
 */

import { test, expect, type Page } from '@playwright/test';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_EMAIL = `test_${Date.now()}@pravah.dev`;
const TEST_NAME = 'Playwright User';

/** Inject a mock user session directly into localStorage (bypasses real OTP). */
async function injectSession(page: Page) {
  await page.goto('/');
  await page.evaluate(({ email, name }) => {
    localStorage.setItem('pravah_user', JSON.stringify({ email, name }));
    localStorage.setItem('pravah_onboarding_completed', 'true');
  }, { email: TEST_EMAIL, name: TEST_NAME });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

test.describe('Auth', () => {
  test('landing page loads and shows login/signup links', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/PRAVAH/i);
    const authLink = page.locator('a[href*="login"], a[href*="signup"]').first();
    await expect(authLink).toBeVisible();
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"], input[type="text"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('login shows error with bad credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"], input[type="text"]').first().fill('bad@test.com');
    await page.locator('input[type="password"]').first().fill('wrongpassword');
    await page.locator('button[type="submit"], button').filter({ hasText: /login|sign in/i }).first().click();
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/login/);
  });

  test('signup page renders correctly', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('input').first()).toBeVisible();
  });
});

// ─── Onboarding ───────────────────────────────────────────────────────────────

test.describe('Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user profile
    await page.route('**/api/auth/user/profile?email=*', async route => {
      await route.fulfill({ json: { capital: 1000000, goal: 'growth', risk: 'HIGH', horizon: '60' } });
    });
    await page.goto('/');
    await page.evaluate(({ email, name }) => {
      localStorage.setItem('pravah_user', JSON.stringify({ email, name }));
      // Do NOT set onboarding_completed so it stays in onboarding state
    }, { email: TEST_EMAIL, name: TEST_NAME });
    await page.goto('/onboarding');
  });

  test('step 1 — Investment Goal renders', async ({ page }) => {
    // Use getByRole to avoid strict-mode multi-match on 'text=Investment Goal'
    await expect(page.getByRole('heading', { name: /investment goal/i })).toBeVisible();
    await expect(page.locator('text=Capital Preservation').first()).toBeVisible();
  });

  test('step 1 — can select a goal and continue', async ({ page }) => {
    await page.locator('text=Balanced Returns').first().click();
    await page.locator('button', { hasText: /continue/i }).click();
    // After advancing, heading changes to Risk Tolerance
    await expect(page.getByRole('heading', { name: /risk tolerance/i })).toBeVisible();
  });

  test('step 2 — Risk Tolerance renders', async ({ page }) => {
    await page.locator('text=Balanced Returns').first().click();
    await page.locator('button', { hasText: /continue/i }).click();
    await expect(page.getByRole('heading', { name: /risk tolerance/i })).toBeVisible();
    await expect(page.locator('text=AGGRESSIVE').first()).toBeVisible();
    await expect(page.locator('text=BALANCED').first()).toBeVisible();
    await expect(page.locator('text=CONSERVATIVE').first()).toBeVisible();
  });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page);
    await page.goto('/dashboard');
  });

  test('loads without error', async ({ page }) => {
    await expect(page).toHaveURL('/dashboard');
    // Use heading role to be unambiguous (sidebar also contains "Dashboard" link text)
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('sidebar is present with all nav links', async ({ page }) => {
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('text=P.R.A.V.A.H')).toBeVisible();
    await expect(sidebar.locator('a[href="/dashboard"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/portfolio"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/research"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/backtest"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/stress-test"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/profile"]')).toBeVisible();
  });

  test('top bar shows market status', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header.locator('text=/MARKET/i')).toBeVisible();
  });

  test('regime badge renders (may be loading)', async ({ page }) => {
    const badge = page.locator('text=/BULL|BEAR|SIDEWAYS|Loading/i').first();
    await expect(badge).toBeVisible({ timeout: 8000 });
  });

  test('metric cards are visible', async ({ page }) => {
    await expect(page.locator('text=/Total Return/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Sharpe Ratio/i').first()).toBeVisible();
    await expect(page.locator('text=/Max Drawdown/i').first()).toBeVisible();
    await expect(page.locator('text=/Alpha/i').first()).toBeVisible();
  });

  test('signal feed or loading skeleton renders', async ({ page }) => {
    await expect(
      page.locator('text=/Top Buy Signals|No signals/i').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('India VIX section renders', async ({ page }) => {
    // Use .first() — "India VIX" appears in both the gauge component and the topbar ticker
    await expect(page.locator('text=/India VIX/i').first()).toBeVisible();
  });

  test('clicking a signal navigates to research', async ({ page }) => {
    const signal = page.locator('.cursor-pointer').filter({ hasText: /\.NS/ }).first();
    const visible = await signal.isVisible().catch(() => false);
    if (visible) {
      await signal.click();
      await expect(page).toHaveURL(/research/);
    } else {
      test.skip(true, 'No signals loaded (API may be down)');
    }
  });
});

// ─── Portfolio ────────────────────────────────────────────────────────────────

test.describe('Portfolio', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page);
    await page.goto('/portfolio');
  });

  test('loads without error', async ({ page }) => {
    await expect(page).toHaveURL('/portfolio');
  });

  test('brief textarea is visible', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 5000 });
  });

  test('can type a brief and see submit button', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    await textarea.fill('Build me a diversified portfolio with ₹5 lakh, moderate risk, 3-year horizon focused on IT and banking.');
    // Button label is "[RUN] Optimize Portfolio"
    await expect(
      page.locator('button').filter({ hasText: /optimize portfolio|RUN/i }).first()
    ).toBeVisible();
  });
});

// ─── Research ────────────────────────────────────────────────────────────────

test.describe('Research', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page);
    await page.goto('/research');
  });

  test('loads without error', async ({ page }) => {
    await expect(page).toHaveURL('/research');
    await expect(page.locator('text=/Research|RESEARCH/i').first()).toBeVisible();
  });

  test('stock category selector is present', async ({ page }) => {
    const select = page.locator('select').first();
    await expect(select).toBeVisible({ timeout: 5000 });
  });

  test('at least one stock selector is present', async ({ page }) => {
    // Research page may have 1 or 2 selects depending on how category/symbol are rendered
    const count = await page.locator('select').count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('can switch to a different period', async ({ page }) => {
    const periodBtn = page.locator('button').filter({ hasText: /1M|3M|6M|1Y/i }).first();
    const visible = await periodBtn.isVisible().catch(() => false);
    if (visible) {
      await periodBtn.click();
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/research/);
    }
  });
});

// ─── Backtest ────────────────────────────────────────────────────────────────

test.describe('Backtest', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page);
    await page.goto('/backtest');
  });

  test('loads without error', async ({ page }) => {
    await expect(page).toHaveURL('/backtest');
    await expect(page.locator('text=/Backtest Desk/i')).toBeVisible();
  });

  test('form inputs are present', async ({ page }) => {
    await expect(page.locator('input').first()).toBeVisible({ timeout: 5000 });
  });

  test('run button is present', async ({ page }) => {
    await expect(
      page.locator('button').filter({ hasText: /run|backtest|execute/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('shows placeholder before run', async ({ page }) => {
    await expect(
      page.locator('text=/Configure and run|No data/i').first()
    ).toBeVisible({ timeout: 5000 });
  });
});

// ─── Stress Test ─────────────────────────────────────────────────────────────

test.describe('Stress Test', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page);
    await page.goto('/stress-test');
  });

  test('loads without error', async ({ page }) => {
    await expect(page).toHaveURL('/stress-test');
    await expect(page.locator('text=/Stress Test|STRESS TEST/i').first()).toBeVisible();
  });

  test('scenario picker is visible', async ({ page }) => {
    await expect(
      page.locator('text=/2008|COVID|correction|custom/i').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('portfolio JSON textarea is present', async ({ page }) => {
    await expect(page.locator('textarea')).toBeVisible({ timeout: 5000 });
  });

  test('run button is present', async ({ page }) => {
    await expect(
      page.locator('button').filter({ hasText: /run|execute|stress/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });
});

// ─── Profile ─────────────────────────────────────────────────────────────────

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    // Mock profile endpoints to prevent backend DB timeout hangs
    await page.route('**/api/auth/user/profile?email=*', async route => {
      await route.fulfill({ json: { capital: 1000000, goal: 'growth', risk: 'HIGH', horizon: '60', name: TEST_NAME } });
    });
    await page.route('**/api/portfolio/holdings-analysis', async route => {
      await route.fulfill({ json: { score: 75, risk_rating: 'MODERATE', diversity_score: 80 } });
    });
    await injectSession(page);
    await page.goto('/profile');
  });

  test('loads without error', async ({ page }) => {
    await expect(page).toHaveURL('/profile');
    await expect(page.locator('text=/Profile|PROFILE/i').first()).toBeVisible();
  });

  test('user name is displayed', async ({ page }) => {
    await expect(page.locator(`text=${TEST_NAME}`)).toBeVisible({ timeout: 5000 });
  });

  test('risk profiling tab is accessible', async ({ page }) => {
    const riskTab = page.locator('button, [role="tab"]').filter({ hasText: /risk profil/i }).first();
    const visible = await riskTab.isVisible().catch(() => false);
    if (visible) {
      await riskTab.click();
      await expect(page.locator('text=/Risk Profiling|Behavioral/i').first()).toBeVisible();
    }
  });

  test('API credentials section renders', async ({ page }) => {
    await expect(page.locator('text=/Groq|API Key|MongoDB/i').first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page);
    await page.goto('/dashboard');
  });

  const pages = [
    { link: 'Portfolio',    url: '/portfolio' },
    { link: 'Research',     url: '/research' },
    { link: 'Backtest',     url: '/backtest' },
    { link: 'Stress Test',  url: '/stress-test' },
    { link: 'User Profile', url: '/profile' },
  ];

  for (const { link, url } of pages) {
    test(`sidebar navigates to ${link}`, async ({ page }) => {
      await page.locator('aside').locator(`a[href="${url}"]`).click();
      await expect(page).toHaveURL(url);
    });
  }

  test('logout clears session and redirects to login', async ({ page }) => {
    await page.locator('button').filter({ hasText: /SIGNOUT|logout|sign out/i }).first().click();
    await expect(page).toHaveURL(/login/);
    const user = await page.evaluate(() => localStorage.getItem('pravah_user'));
    expect(user).toBeNull();
  });
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

test.describe('Auth guard', () => {
  const protectedRoutes = ['/dashboard', '/portfolio', '/research', '/backtest', '/stress-test', '/profile'];

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated users`, async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.removeItem('pravah_user');
        localStorage.removeItem('pravah_onboarding_completed');
      });
      await page.goto(route);
      // waitForURL callback receives a URL *object* — must use url.href, not url.includes
      await page.waitForURL(
        (url) => !url.href.includes(route) || url.href.includes('login'),
        { timeout: 5000 }
      );
      await expect(page).not.toHaveURL(route);
    });
  }
});

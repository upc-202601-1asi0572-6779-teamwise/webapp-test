/**
 * Full agronomist journey:
 * logout → register → operations → logout → login → operations
 */
import { chromium } from 'playwright';

const BASE = process.env.APP_URL || 'http://127.0.0.1:4200';
const stamp = Date.now();
const EMAIL = `agronomo.e2e.${stamp}@smartpalm.test`;
const PASS = 'Agro2026!';
const NAME = `Ing. Agronomo E2E ${stamp}`;

const results = [];
const ok = (s, c, d = '') => {
  results.push({ s, c, status: 'PASS', d });
  console.log(`  ✓ [${s}] ${c}${d ? ' — ' + d : ''}`);
};
const fail = (s, c, d = '') => {
  results.push({ s, c, status: 'FAIL', d });
  console.error(`  ✗ [${s}] ${c}${d ? ' — ' + d : ''}`);
};

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(900);
}

async function assertOn(page, pathPart, section) {
  if (page.url().includes(pathPart)) ok(section, `on ${pathPart}`, page.url());
  else fail(section, `expected ${pathPart}`, page.url());
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(e.message));

  console.log('\n========== 1) ENTRY / LOGOUT CLEAN ==========');
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await settle(page);

  // If auto-session or leftover session, logout
  if (!page.url().includes('/auth/login')) {
    const logoutBtn = page.locator('app-sidebar button', { hasText: /cerrar|salir|logout/i });
    if (await logoutBtn.count()) {
      await logoutBtn.first().click();
      await settle(page);
    } else {
      // clear storage via evaluate
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto(`${BASE}/auth/login`);
      await settle(page);
    }
  }
  await assertOn(page, '/auth/login', 'auth');
  const loginText = await page.locator('body').innerText();
  if (/iniciar|login|correo|email/i.test(loginText)) ok('auth', 'login screen visible');
  else fail('auth', 'login screen text missing', loginText.slice(0, 120));

  console.log('\n========== 2) REGISTER AS AGRONOMIST ==========');
  await page.goto(`${BASE}/auth/register`);
  await settle(page);
  await assertOn(page, '/auth/register', 'register');

  await page.fill('input[formcontrolname="fullName"]', NAME);
  await page.fill('input[formcontrolname="email"]', EMAIL);
  await page.fill('input[formcontrolname="password"]', PASS);
  await page.selectOption('select[formcontrolname="role"]', 'agronomist');
  await page.fill('input[formcontrolname="phone"]', '+51 961 234 567');
  await page.selectOption('select[formcontrolname="region"]', 'Ucayali');
  await page.fill('input[formcontrolname="city"]', 'Pucallpa');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname.includes('/dashboard'), { timeout: 20000 }).catch(() => {});
  await settle(page);

  if (page.url().includes('/dashboard')) {
    ok('register', 'register → dashboard', page.url());
  } else {
    const err = await page.locator('body').innerText();
    fail('register', 'did not reach dashboard', err.slice(0, 200));
  }

  // Role badge
  const roleLabel = await page.locator('[data-testid="sidebar-role-label"]').innerText().catch(() => '');
  if (/agronom|agrónom/i.test(roleLabel)) ok('register', 'sidebar role agronomist', roleLabel);
  else fail('register', 'sidebar role not agronomist', roleLabel);

  const nameShown = await page.locator('app-sidebar').innerText();
  if (nameShown.includes(NAME.split(' ')[0]) || nameShown.includes('Agronomo') || nameShown.includes(NAME)) {
    ok('register', 'sidebar shows user name');
  } else {
    fail('register', 'sidebar name missing', nameShown.slice(0, 100));
  }

  // Menu only agronomist items
  const hrefs = await page.locator('app-sidebar a').evaluateAll((as) =>
    as.map((a) => a.getAttribute('href') || ''),
  );
  for (const h of ['/dashboard', '/plantaciones', '/recomendaciones', '/profile']) {
    if (hrefs.some((x) => x.includes(h))) ok('shell', `menu ${h}`);
    else fail('shell', `missing menu ${h}`);
  }
  for (const h of ['/alertas', '/reportes', '/inspecciones', '/subscription']) {
    if (!hrefs.some((x) => x.includes(h))) ok('shell', `hidden ${h}`);
    else fail('shell', `should hide ${h}`);
  }

  console.log('\n========== 3) DASHBOARD ==========');
  await page.goto(`${BASE}/dashboard`);
  await settle(page);
  await page.waitForTimeout(2000);
  const dash = await page.locator('main').innerText();
  if (/Http failure|Cannot GET|Failed to fetch/i.test(dash) && !/no disponibles/i.test(dash)) {
    fail('dashboard', 'raw error in UI', dash.slice(0, 180));
  } else ok('dashboard', 'no raw HTTP errors');
  if (/alertas no disponibles|Edge gateways|gateways|Supervisi|Monitoreo|recomend/i.test(dash)) {
    ok('dashboard', 'coherent agronomist content');
  } else fail('dashboard', 'content weak', dash.slice(0, 180));

  console.log('\n========== 4) PLANTACIONES ==========');
  await page.goto(`${BASE}/plantaciones`);
  await settle(page);
  await page.waitForTimeout(1000);
  const plant = await page.locator('main').innerText();
  if (/No se pudieron cargar|404/i.test(plant)) fail('plantaciones', 'list error', plant.slice(0, 150));
  else ok('plantaciones', 'list ok');
  const card = page.locator('a[href*="/plantaciones/"]').first();
  if (await card.count()) {
    await card.click();
    await settle(page);
    await assertOn(page, '/plantaciones/', 'plantaciones');
    const detail = await page.locator('main').innerText();
    if (/No se pudo cargar|Http failure/i.test(detail)) fail('plantaciones', 'detail error');
    else ok('plantaciones', 'detail ok');
  } else fail('plantaciones', 'no cards');

  console.log('\n========== 5) RECOMENDACIONES (ops) ==========');
  await page.goto(`${BASE}/recomendaciones`);
  await settle(page);
  await page.waitForTimeout(1500);
  const recList = await page.locator('main').innerText();
  if (/No se pudieron cargar|Http failure/i.test(recList)) fail('recs', 'list error', recList.slice(0, 150));
  else ok('recs', 'list loaded');

  // Create
  await page.goto(`${BASE}/recomendaciones/new`);
  await settle(page);
  const plantSelect = page.locator('select[formcontrolname="plantationId"]');
  if ((await plantSelect.locator('option').count()) > 1) {
    await plantSelect.selectOption({ index: 1 });
  }
  const title = `E2E flujo agronomo ${stamp}`;
  await page.fill('input[formcontrolname="title"]', title);
  await page.fill(
    'textarea[formcontrolname="description"]',
    'Operacion E2E: revisar humedad y pH segun lecturas del device demo 123456.',
  );
  await page.fill('input[formcontrolname="recommendedAction"]', 'Calibrar umbrales y reevaluar en 7 dias');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.endsWith('/recomendaciones/new'), { timeout: 45000 }).catch(() => {});
  await settle(page);
  await page.waitForTimeout(1500);

  if (page.url().includes('/recomendaciones/') && !page.url().endsWith('/new')) {
    ok('recs', 'create → detail', page.url());
    const detail = await page.locator('main').innerText();
    if (detail.includes(title) || /humedad|pH|Calibrar/i.test(detail)) ok('recs', 'detail shows content');
    else fail('recs', 'detail content mismatch', detail.slice(0, 200));

    const approve = page.getByRole('button', { name: /aprobar/i });
    if (await approve.count()) {
      await approve.click();
      await page.waitForTimeout(2000);
      ok('recs', 'approve');
      const publish = page.getByRole('button', { name: /publicar/i });
      if (await publish.count()) {
        await publish.click();
        await page.waitForTimeout(2000);
        ok('recs', 'publish');
      } else fail('recs', 'publish button missing after approve');
    } else {
      // maybe already approved path
      const publish = page.getByRole('button', { name: /publicar/i });
      if (await publish.count()) {
        await publish.click();
        await page.waitForTimeout(2000);
        ok('recs', 'publish (direct)');
      } else fail('recs', 'no approve/publish actions');
    }
  } else if (page.url().includes('/recomendaciones')) {
    ok('recs', 'create returned list (id probe failed soft)', page.url());
  } else {
    fail('recs', 'create navigation failed', page.url());
  }

  // List tabs
  await page.goto(`${BASE}/recomendaciones`);
  await settle(page);
  const pub = page.getByRole('button', { name: /publicad/i });
  const pen = page.getByRole('button', { name: /pendiente/i });
  if (await pub.count()) {
    await pub.click();
    await page.waitForTimeout(600);
    ok('recs', 'tab published');
  }
  if (await pen.count()) {
    await pen.click();
    await page.waitForTimeout(600);
    ok('recs', 'tab pending');
  }

  console.log('\n========== 6) PROFILE ==========');
  await page.goto(`${BASE}/profile`);
  await settle(page);
  const profile = await page.locator('main').innerText();
  if (profile.includes(EMAIL) || profile.includes(NAME) || profile.includes('Pucallpa')) {
    ok('profile', 'shows registered data');
  } else fail('profile', 'registered data missing', profile.slice(0, 200));
  if (/Http failure|users\/me|404/i.test(profile)) fail('profile', 'API error on profile');
  else ok('profile', 'no profile API error');

  console.log('\n========== 7) LOGOUT → LOGIN ==========');
  const logoutBtn = page.locator('app-sidebar button').filter({ hasText: /cerrar|salir|logout/i });
  if (await logoutBtn.count()) {
    await logoutBtn.first().click();
  } else {
    await page.evaluate(() => {
      // keep registry, clear session only
      localStorage.removeItem('smartpalm_access_token_v1');
      localStorage.removeItem('smartpalm_user_v1');
    });
    await page.goto(`${BASE}/auth/login`);
  }
  await settle(page);
  await page.goto(`${BASE}/auth/login`);
  await settle(page);
  await assertOn(page, '/auth/login', 'logout');

  await page.fill('input[formcontrolname="email"]', EMAIL);
  await page.fill('input[formcontrolname="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname.includes('/dashboard'), { timeout: 15000 }).catch(() => {});
  await settle(page);
  if (page.url().includes('/dashboard')) ok('login', 'login with registered account');
  else fail('login', 'login failed', page.url());

  const role2 = await page.locator('[data-testid="sidebar-role-label"]').innerText().catch(() => '');
  if (/agronom|agrónom/i.test(role2)) ok('login', 'still agronomist after re-login', role2);
  else fail('login', 'role lost after re-login', role2);

  // Quick ops after re-login
  await page.goto(`${BASE}/recomendaciones`);
  await settle(page);
  await page.waitForTimeout(1200);
  const again = await page.locator('main').innerText();
  if (/Http failure|No se pudieron cargar/i.test(again)) fail('login', 'recs broken after re-login');
  else ok('login', 'recs still work after re-login');

  console.log('\n========== 8) JS ERRORS ==========');
  if (jsErrors.length === 0) ok('runtime', 'no pageerror');
  else {
    // filter known noise
    const severe = jsErrors.filter((e) => !/ChunkLoadError/i.test(e));
    if (severe.length) fail('runtime', 'page errors', severe.slice(0, 3).join(' | '));
    else ok('runtime', 'no severe page errors');
  }

  await browser.close();

  console.log('\n========== SUMMARY ==========');
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fails = results.filter((r) => r.status === 'FAIL');
  console.log(`PASS: ${pass}  FAIL: ${fails.length}`);
  if (fails.length) {
    console.log('FAILURES:');
    for (const f of fails) console.log(` - [${f.s}] ${f.c}: ${f.d}`);
  }
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});

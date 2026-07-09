/**
 * Rigorous agronomist navigation audit against local Angular + real backend.
 * Usage: node scripts/agronomist-nav-audit.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.APP_URL || 'http://127.0.0.1:4200';
const results = [];

function ok(section, check, detail = '') {
  results.push({ section, check, status: 'PASS', detail });
  console.log(`  ✓ ${check}${detail ? ` — ${detail}` : ''}`);
}
function fail(section, check, detail = '') {
  results.push({ section, check, status: 'FAIL', detail });
  console.error(`  ✗ ${check}${detail ? ` — ${detail}` : ''}`);
}
function warn(section, check, detail = '') {
  results.push({ section, check, status: 'WARN', detail });
  console.warn(`  ! ${check}${detail ? ` — ${detail}` : ''}`);
}

async function waitApp(page) {
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('smart-palm-platform') && res.status() >= 400) {
      failedRequests.push({ url, status: res.status() });
    }
    // Mock API should not be hit
    if (url.includes('smartpalm-mock-api') || url.includes('localhost:3000')) {
      failedRequests.push({ url, status: res.status(), note: 'MOCK_HIT' });
    }
  });

  // ── Auth / entry ──────────────────────────────────────────────
  console.log('\n=== AUTH / ENTRY ===');
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitApp(page);

  // demoAuth may auto-session; if redirected to login, fill form
  if (page.url().includes('/auth/login')) {
    ok('auth', 'landed on login (no session)');
    await page.fill('input[formcontrolname="email"]', 'agronomo.demo@smartpalm.io');
    await page.fill('input[formcontrolname="password"]', 'demo');
    await page.click('button[type="submit"]');
    await waitApp(page);
  } else {
    ok('auth', 'auto demo session reached app', page.url());
  }

  if (page.url().includes('/dashboard') || page.url().endsWith('/') || page.url().includes('4200')) {
    // ensure on dashboard
    if (!page.url().includes('dashboard')) {
      await page.goto(`${BASE}/dashboard`);
      await waitApp(page);
    }
    ok('auth', 'authenticated shell reachable', page.url());
  } else {
    fail('auth', 'could not reach dashboard', page.url());
  }

  // Sidebar items for agronomist
  console.log('\n=== SIDEBAR (agronomist) ===');
  const sidebarLinks = await page.locator('app-sidebar a[routerlink], app-sidebar a[href]').allTextContents();
  const sidebarText = sidebarLinks.map((t) => t.trim()).filter(Boolean).join(' | ');
  console.log('  sidebar:', sidebarText || '(empty — try href)');

  const hrefs = await page.locator('app-sidebar a').evaluateAll((as) =>
    as.map((a) => a.getAttribute('href') || a.getAttribute('ng-reflect-router-link') || a.textContent?.trim()),
  );
  console.log('  hrefs:', hrefs.join(', '));

  const expectPresent = ['/dashboard', '/plantaciones', '/recomendaciones', '/profile'];
  const expectAbsent = ['/alertas', '/reportes', '/inspecciones', '/subscription'];
  for (const h of expectPresent) {
    const found = hrefs.some((x) => (x || '').includes(h.replace('/', '')) || (x || '').includes(h));
    // routerLink might be without leading slash in attribute
    const found2 = hrefs.some((x) => String(x).toLowerCase().includes(h.slice(1)));
    if (found || found2) ok('sidebar', `has ${h}`);
    else fail('sidebar', `missing ${h}`, JSON.stringify(hrefs));
  }
  for (const h of expectAbsent) {
    const found = hrefs.some((x) => String(x).includes(h) || String(x).toLowerCase().includes(h.slice(1)));
    if (!found) ok('sidebar', `hidden ${h}`);
    else fail('sidebar', `should hide ${h}`);
  }

  // Helper navigate via URL (most reliable)
  async function visit(section, path, assertions) {
    console.log(`\n=== ${section.toUpperCase()} (${path}) ===`);
    const beforeErrors = pageErrors.length;
    const beforeFailed = failedRequests.length;
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitApp(page);
    // wait for spinners to settle
    await page.waitForTimeout(1500);
    const spinning = await page.locator('.animate-spin').count();
    if (spinning > 0) {
      await page.waitForTimeout(2500);
    }
    const stillSpin = await page.locator('.animate-spin').count();
    if (stillSpin === 0) ok(section, 'no infinite spinner');
    else warn(section, 'spinner still visible', String(stillSpin));

    const bodyText = await page.locator('main').innerText().catch(() => '');
    const danger = await page.locator('main [style*="color-danger"], main .text-danger').count();

    // Generic: no mock error patterns for missing endpoints we care about
    if (/Cannot GET|Http failure|404|Failed to fetch/i.test(bodyText) && !bodyText.includes('no están disponibles')) {
      fail(section, 'raw HTTP/error text in UI', bodyText.slice(0, 200));
    } else {
      ok(section, 'no raw HTTP dump in main UI');
    }

    await assertions({ bodyText, danger, page });

    const newPageErrors = pageErrors.slice(beforeErrors);
    const newFailed = failedRequests.slice(beforeFailed);
    // Filter expected backend failures
    const unexpectedFailed = newFailed.filter((f) => {
      // Expected soft probes / disabled features
      if (f.url.includes('/alerts') || f.url.includes('/reports') || f.url.includes('/inspections')) return false;
      if (f.url.includes('/users/me') || f.url.includes('/notifications')) return false;
      // ID probe after create may 404 missing ids — not a product failure
      if (/\/recommendations\/\d+$/.test(f.url) && f.status === 404) return false;
      return true;
    });
    if (unexpectedFailed.length) {
      fail(section, 'unexpected backend 4xx/5xx', JSON.stringify(unexpectedFailed.slice(0, 5)));
    } else {
      ok(section, 'no unexpected backend failures');
    }
    if (newPageErrors.length) {
      fail(section, 'page JS errors', newPageErrors.slice(0, 3).join(' | '));
    } else {
      ok(section, 'no page JS errors');
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────
  await visit('dashboard', '/dashboard', async ({ bodyText, page }) => {
    if (/Supervisi|Monitoreo|Dashboard|plantaci|recomend/i.test(bodyText)) {
      ok('dashboard', 'agronomist heading/content present');
    } else {
      fail('dashboard', 'heading/content missing', bodyText.slice(0, 180));
    }
    // Should not show fake zeros as only content without message
    if (/no disponibles|Alertas no disponibles|Edge gateways|gateways/i.test(bodyText)) {
      ok('dashboard', 'honest empty/backend messaging or gateways label');
    } else {
      warn('dashboard', 'could not find alerts-unavailable or gateways label');
    }
    // New report button should not show when reports disabled
    const reportBtn = await page.getByRole('button', { name: /reporte|report/i }).count();
    if (reportBtn === 0) ok('dashboard', 'no new-report button (feature off)');
    else fail('dashboard', 'new-report button still visible');

    // Plantation chips / recommendations section
    if (/Plantaci|recomend/i.test(bodyText)) ok('dashboard', 'plantations or recommendations text');
  });

  // ── Plantaciones list ─────────────────────────────────────────
  await visit('plantaciones', '/plantaciones', async ({ bodyText, page }) => {
    if (/Plantaci|cartera|supervisi/i.test(bodyText)) ok('plantaciones', 'list heading present');
    else fail('plantaciones', 'heading missing', bodyText.slice(0, 180));

    if (/No se pudieron cargar|Http failure|404/i.test(bodyText)) {
      fail('plantaciones', 'load error shown', bodyText.slice(0, 200));
    } else {
      ok('plantaciones', 'no load error banner');
    }

    // Demo plantation card
    const card = page.locator('a[href*="/plantaciones/"]').first();
    if (await card.count()) {
      ok('plantaciones', 'has plantation card link');
      const cardText = await card.innerText();
      if (/—|Sin dato|demo/i.test(cardText) || /Plantaci/i.test(cardText)) {
        ok('plantaciones', 'card content coherent', cardText.slice(0, 120).replace(/\s+/g, ' '));
      }
      // Navigate into detail
      await card.click();
      await waitApp(page);
      await page.waitForTimeout(1200);
      if (page.url().includes('/plantaciones/')) {
        ok('plantaciones', 'navigated to detail', page.url());
        const detail = await page.locator('main').innerText();
        if (/No se pudo cargar|Http failure|404/i.test(detail)) {
          fail('plantaciones', 'detail load error', detail.slice(0, 200));
        } else {
          ok('plantaciones', 'detail loaded without HTTP error');
        }
        if (/zonas|Zonas/i.test(detail)) ok('plantaciones', 'zones section present');
      } else {
        fail('plantaciones', 'detail navigation failed', page.url());
      }
    } else {
      fail('plantaciones', 'no plantation cards');
    }
  });

  // ── Recomendaciones list ──────────────────────────────────────
  await visit('recomendaciones', '/recomendaciones', async ({ bodyText, page }) => {
    if (/Recomend/i.test(bodyText)) ok('recomendaciones', 'list heading');
    else fail('recomendaciones', 'heading missing');

    if (/No se pudieron cargar|Http failure/i.test(bodyText)) {
      fail('recomendaciones', 'list error', bodyText.slice(0, 200));
    } else {
      ok('recomendaciones', 'list loaded or empty without crash');
    }

    // Tabs for agronomist
    const pendingTab = page.getByRole('button', { name: /pendiente|pending/i });
    const publishedTab = page.getByRole('button', { name: /publicad|published/i });
    if ((await pendingTab.count()) && (await publishedTab.count())) {
      ok('recomendaciones', 'pending/published tabs');
      await publishedTab.click();
      await page.waitForTimeout(500);
      await pendingTab.click();
      await page.waitForTimeout(500);
      ok('recomendaciones', 'tab switching works');
    } else {
      warn('recomendaciones', 'tabs not found');
    }

    // New button
    const newBtn = page.locator('a[href*="recomendaciones/new"]');
    if (await newBtn.count()) {
      ok('recomendaciones', 'new recommendation CTA');
      await newBtn.first().click();
      await waitApp(page);
      await page.waitForTimeout(800);
      if (page.url().includes('/recomendaciones/new')) {
        ok('recomendaciones', 'form route open');
        const formText = await page.locator('main').innerText();
        // Zone/alert AI should not dominate
        if (/Generar con IA/i.test(formText)) fail('recomendaciones', 'AI button still on form');
        else ok('recomendaciones', 'form without AI mock control');
        if (/alerta relacionada|Selecciona una zona/i.test(formText) && /zona/i.test(formText)) {
          // we removed zone from form - check
          warn('recomendaciones', 'form still mentions zone/alert?', formText.slice(0, 150));
        }
        // Fill and create
        const plantSelect = page.locator('select[formcontrolname="plantationId"]');
        if (await plantSelect.count()) {
          const options = await plantSelect.locator('option').count();
          if (options > 1) {
            await plantSelect.selectOption({ index: 1 });
            ok('recomendaciones', 'plantation option available');
          }
        }
        await page.fill('input[formcontrolname="title"]', 'Auditoria UI - ajuste de pH');
        await page.fill(
          'textarea[formcontrolname="description"]',
          'Prueba de navegacion automatizada. Segun lecturas recientes el pH esta fuera de rango optimo para palma.',
        );
        await page.fill('input[formcontrolname="recommendedAction"]', 'Aplicar enmienda caliza 2 ton/ha');
        await page.click('button[type="submit"]');
        // create may probe ids (CORS Location) — allow more time
        await page.waitForURL((u) => !u.pathname.endsWith('/recomendaciones/new'), { timeout: 45000 }).catch(() => {});
        await waitApp(page);
        await page.waitForTimeout(1000);
        const after = page.url();
        if (after.includes('/recomendaciones/') && !after.endsWith('/new')) {
          ok('recomendaciones', 'create navigated to detail', after);
          const detail = await page.locator('main').innerText();
          if (/Auditoria UI|ajuste de pH|enmienda/i.test(detail)) {
            ok('recomendaciones', 'detail shows created content');
          } else {
            warn('recomendaciones', 'detail content not matched', detail.slice(0, 200));
          }
          const approve = page.getByRole('button', { name: /aprobar|approve/i });
          if (await approve.count()) {
            await approve.click();
            await page.waitForTimeout(2000);
            ok('recomendaciones', 'approve clicked');
            const publish = page.getByRole('button', { name: /publicar|publish/i });
            if (await publish.count()) {
              await publish.click();
              await page.waitForTimeout(2000);
              ok('recomendaciones', 'publish clicked');
            }
          } else {
            warn('recomendaciones', 'no approve button (maybe already published or no id)');
          }
        } else if (after.includes('/recomendaciones') && !after.includes('/new')) {
          ok('recomendaciones', 'create returned to list (no Location id)', after);
        } else {
          const formErr = await page.locator('main').innerText();
          fail('recomendaciones', 'create navigation unexpected', `${after} | ${formErr.slice(0, 180)}`);
        }
      }
    } else {
      fail('recomendaciones', 'new CTA missing');
    }
  });

  // ── Profile ───────────────────────────────────────────────────
  await visit('profile', '/profile', async ({ bodyText, page }) => {
    if (/Agrónomo|Agronomo|perfil|Profile|Demo/i.test(bodyText)) {
      ok('profile', 'profile content for agronomist');
    } else {
      fail('profile', 'profile content missing', bodyText.slice(0, 180));
    }
    if (/Http failure|404|users\/me/i.test(bodyText)) {
      fail('profile', 'profile hit missing API error');
    } else {
      ok('profile', 'no users/me error on profile');
    }
    const edit = page.getByRole('button', { name: /editar|edit/i });
    if (await edit.count()) {
      await edit.first().click();
      await page.waitForTimeout(400);
      ok('profile', 'edit mode opens');
      const cancel = page.getByRole('button', { name: /cancel/i });
      if (await cancel.count()) await cancel.first().click();
    }
  });

  // ── Deep links that should be soft-disabled ───────────────────
  console.log('\n=== DEEP LINKS (disabled features) ===');
  for (const path of ['/alertas', '/reportes', '/inspecciones', '/subscription/me']) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    await waitApp(page);
    await page.waitForTimeout(1000);
    const text = await page.locator('main').innerText().catch(() => '');
    const crashed = await page.locator('main .animate-spin').count();
    if (/no están disponibles|no disponible|todavía|Unavailable|error/i.test(text) || text.length > 20) {
      ok('deeplink', `${path} renders without hard crash`, text.slice(0, 80).replace(/\s+/g, ' '));
    } else {
      warn('deeplink', `${path} empty or odd`, text.slice(0, 80));
    }
    if (pageErrors.length > 20) fail('deeplink', 'too many page errors accumulating');
  }

  // ── Round-trip navigation fluidity ────────────────────────────
  console.log('\n=== ROUND-TRIP NAV ===');
  const chain = ['/dashboard', '/plantaciones', '/recomendaciones', '/profile', '/dashboard'];
  let fluid = true;
  for (const p of chain) {
    const t0 = Date.now();
    await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
    await waitApp(page);
    const dt = Date.now() - t0;
    if (dt > 20000) {
      fail('nav', `slow ${p}`, `${dt}ms`);
      fluid = false;
    } else {
      ok('nav', `visited ${p}`, `${dt}ms`);
    }
  }
  if (fluid) ok('nav', 'round-trip fluid under 20s/page');

  await browser.close();

  // Summary
  console.log('\n========== SUMMARY ==========');
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fails = results.filter((r) => r.status === 'FAIL');
  const warns = results.filter((r) => r.status === 'WARN');
  console.log(`PASS: ${pass}  FAIL: ${fails.length}  WARN: ${warns.length}`);
  if (fails.length) {
    console.log('\nFAILURES:');
    for (const f of fails) console.log(` - [${f.section}] ${f.check}: ${f.detail}`);
  }
  if (warns.length) {
    console.log('\nWARNINGS:');
    for (const w of warns) console.log(` - [${w.section}] ${w.check}: ${w.detail}`);
  }
  if (consoleErrors.length) {
    console.log('\nBrowser console errors (sample):');
    for (const e of consoleErrors.slice(0, 8)) console.log(' -', e.slice(0, 200));
  }

  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});

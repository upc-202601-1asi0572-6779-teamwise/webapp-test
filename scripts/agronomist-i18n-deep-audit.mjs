/**
 * Deep i18n audit: ES ↔ EN text snapshots per agronomist section.
 * Reports Spanish leaks in EN and missing EN markers.
 */
import { chromium } from 'playwright';

const BASE = process.env.APP_URL || 'http://127.0.0.1:4200';
const results = [];
const ok = (s, c, d = '') => {
  results.push({ s, c, st: 'PASS', d });
  console.log(`  ✓ [${s}] ${c}${d ? ' — ' + d : ''}`);
};
const fail = (s, c, d = '') => {
  results.push({ s, c, st: 'FAIL', d });
  console.error(`  ✗ [${s}] ${c}${d ? ' — ' + d : ''}`);
};
const warn = (s, c, d = '') => {
  results.push({ s, c, st: 'WARN', d });
  console.warn(`  ! [${s}] ${c}${d ? ' — ' + d : ''}`);
};

async function settle(page, ms = 900) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
}

async function setLocale(page, locale) {
  try {
    await page.evaluate((loc) => localStorage.setItem('app-locale', loc), locale);
  } catch {
    // about:blank or restricted document — navigate first
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.evaluate((loc) => localStorage.setItem('app-locale', loc), locale);
  }
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(async () => {
    await page.goto(page.url() || `${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  });
  await page.waitForTimeout(1100);
}

async function textOf(page, sel = 'main') {
  const primary = await page.locator(sel).innerText().catch(() => null);
  if (primary) return primary.replace(/\s+/g, ' ').trim();
  return (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
}

async function ensureAuth(page) {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await settle(page);
  if (!page.url().includes('/auth/login')) return;

  const email = 'i18n.deep@smartpalm.test';
  const password = 'Agro2026!';

  await page.fill('input[formcontrolname="email"]', email);
  await page.fill('input[formcontrolname="password"]', password);
  await page.click('button[type="submit"]');
  await settle(page, 1500);

  if (page.url().includes('/auth/login')) {
    // register then login
    await page.goto(`${BASE}/auth/register`);
    await settle(page);
    await page.fill('input[formcontrolname="fullName"]', 'I18n Deep Tester').catch(() => {});
    await page.fill('input[formcontrolname="email"]', email).catch(() => {});
    await page.fill('input[formcontrolname="password"]', password).catch(() => {});
    await page.fill('input[formcontrolname="phone"]', '999888777').catch(() => {});
    await page.fill('input[formcontrolname="region"]', 'Lima').catch(() => {});
    await page.fill('input[formcontrolname="city"]', 'Lima').catch(() => {});
    // role may default to agronomist
    await page.click('button[type="submit"]').catch(() => {});
    await settle(page, 2000);
    if (page.url().includes('/auth/')) {
      await page.goto(`${BASE}/auth/login`);
      await settle(page);
      await page.fill('input[formcontrolname="email"]', email);
      await page.fill('input[formcontrolname="password"]', password);
      await page.click('button[type="submit"]');
      await settle(page, 1500);
    }
  }
}

/** Spanish UI phrases that must NOT appear when locale=en */
const ES_LEAKS = [
  /Iniciar sesi[oó]n/i,
  /Cerrar sesi[oó]n/i,
  /Panel de control/i,
  /Cartera de plantaciones/i,
  /Mi perfil/i,
  /Nueva recomendaci[oó]n/i,
  /Crear recomendaci[oó]n/i,
  /Crear cuenta/i,
  /Correo electr[oó]nico/i,
  /¿No tienes cuenta\?/i,
  /Regístrate/i,
  /Contraseña/i,
  /Pendientes(?! review)/i,
  /Publicadas/i,
  /Recomendaciones agron[oó]micas/i,
  /Volver a (cartera|plantaciones|recomendaciones|dashboard|panel)/i,
  /Cargando (detalle|recomendaciones|plantaciones|reporte|formulario|perfil)/i,
  /No se pudo(ron)? /i,
  /Alertas no disponibles/i,
  /hectareas disponibles/i,
  /Selecciona una zona/i,
  /Sin zonas disponibles/i,
  /Enviando\.\.\./i,
  /Enviar instrucciones/i,
  /Volver al inicio de sesi[oó]n/i,
  /Centro de operaciones/i,
  /Recuperar contrase[nñ]a/i,
  /Nueva plantaci[oó]n/i,
  /Gestion de alertas/i,
  /Confirmar recepcion/i,
  /No se pudieron cargar/i,
];

const sections = [
  {
    name: 'login',
    auth: false,
    prep: async (page) => {
      await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
      await settle(page);
      await page.evaluate(() => {
        localStorage.removeItem('smartpalm_user_v1');
        localStorage.removeItem('smartpalm_access_token_v1');
      });
      await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
      await settle(page);
    },
    scope: 'body',
    esMust: [/Iniciar sesi[oó]n|CORREO|CONTRASEÑA|Regístrate/i],
    enMust: [/Log in|EMAIL|PASSWORD|Sign up|Register/i],
  },
  {
    name: 'register',
    auth: false,
    prep: async (page) => {
      await page.goto(`${BASE}/auth/register`);
      await settle(page);
    },
    scope: 'body',
    esMust: [/Crear cuenta|Agr[oó]nomo|Correo|Contraseña|Tel[eé]fono|Regi[oó]n|Ciudad/i],
    enMust: [/Create account|Agronomist|Email|Password|Phone|Region|City/i],
  },
  {
    name: 'recover-password',
    auth: false,
    prep: async (page) => {
      await page.goto(`${BASE}/auth/recover-password`);
      await settle(page);
    },
    scope: 'body',
    esMust: [/Recuperar contrase[nñ]a|Enviar instrucciones|Correo|Volver/i],
    enMust: [/Recover password|Send instructions|Email|Back to sign in/i],
  },
  {
    name: 'sidebar',
    auth: true,
    prep: async (page) => {
      await page.goto(`${BASE}/dashboard`);
      await settle(page, 1200);
    },
    scope: 'app-sidebar',
    esMust: [/Centro de operaciones|Panel de control|Cartera de plantaciones|Recomendaciones|Mi perfil|Cerrar sesi[oó]n/i],
    enMust: [/Operations center|Dashboard|Plantation portfolio|Recommendations|My profile|Log out/i],
  },
  {
    name: 'navbar-locale-toggle',
    auth: true,
    prep: async (page) => {
      await page.goto(`${BASE}/dashboard`);
      await settle(page);
    },
    scope: 'body',
    esMust: [/\bES\b|\bEN\b/i],
    enMust: [/\bES\b|\bEN\b/i],
  },
  {
    name: 'dashboard',
    auth: true,
    prep: async (page) => {
      await page.goto(`${BASE}/dashboard`);
      await settle(page, 1500);
    },
    scope: 'main',
    esMust: [/Panel|Supervisi|Alertas no disponibles|Recomend|Plantaci|Gateway/i],
    enMust: [/Dashboard|Monitor|Alerts are not available|Recommend|Plantation|Gateway/i],
  },
  {
    name: 'plantaciones-list',
    auth: true,
    prep: async (page) => {
      await page.goto(`${BASE}/plantaciones`);
      await settle(page, 1200);
    },
    scope: 'main',
    esMust: [/Cartera de plantaciones|plantacion|Dashboard|hect/i],
    enMust: [/Plantation portfolio|plantation|Dashboard|ha|hect/i],
  },
  {
    name: 'plantacion-detail',
    auth: true,
    prep: async (page) => {
      await page.goto(`${BASE}/plantaciones`);
      await settle(page, 1200);
      const link = page.locator('a[href*="/plantaciones/"]').first();
      if ((await link.count()) === 0) throw new Error('NO_PLANTATION_LINK');
      await link.click();
      await settle(page, 1200);
    },
    scope: 'main',
    esMust: [/Volver|zona|suelo|salud|plantaci/i],
    enMust: [/Back|zone|soil|health|plantation/i],
  },
  {
    name: 'plantacion-form-new',
    auth: true,
    // /plantaciones/new is grower-guarded; agronomist is redirected to dashboard.
    // Keep the check as redirect-aware (not a false i18n failure).
    prep: async (page) => {
      await page.goto(`${BASE}/plantaciones/new`);
      await settle(page, 1200);
      if (!page.url().includes('/plantaciones/new')) {
        throw new Error('NO_AGRONOMIST_ACCESS_GROWER_ROUTE');
      }
    },
    scope: 'main',
    esMust: [/Nueva plantaci[oó]n|Volver a plantaciones|Nombre|Hect|suelo|fase|Cancelar/i],
    enMust: [/New plantation|Back to plantations|name|Hect|soil|phase|Cancel/i],
  },
  {
    name: 'recomendaciones-list',
    auth: true,
    prep: async (page) => {
      await page.goto(`${BASE}/recomendaciones`);
      await settle(page, 1500);
    },
    scope: 'main',
    esMust: [/Recomendaciones|Pendientes|Publicadas|Nueva/i],
    enMust: [/Recommendations|Pending|Published|New/i],
  },
  {
    name: 'recomendaciones-new',
    auth: true,
    prep: async (page) => {
      await page.goto(`${BASE}/recomendaciones/new`);
      await settle(page, 1000);
    },
    scope: 'main',
    esMust: [/Nueva recomendaci[oó]n|Plantaci[oó]n|T[ií]tulo|Descripci[oó]n|Prioridad|Cancelar/i],
    enMust: [/New recommendation|Plantation|Title|Description|Priority|Cancel/i],
  },
  {
    name: 'recomendacion-detail',
    auth: true,
    prep: async (page) => {
      await page.goto(`${BASE}/recomendaciones`);
      await settle(page, 1500);
      const hrefs = await page.locator('a[href*="/recomendaciones/"]').evaluateAll((as) =>
        as.map((a) => a.getAttribute('href')).filter(Boolean),
      );
      const detailHref = hrefs.find((h) => /\/recomendaciones\/\d+/.test(h || ''));
      if (!detailHref) throw new Error('NO_REC_LINK');
      await page.goto(`${BASE}${detailHref.startsWith('http') ? new URL(detailHref).pathname : detailHref}`);
      await settle(page, 1200);
    },
    scope: 'main',
    esMust: [/Volver|Descripci[oó]n|Prioridad|Public|Aprob|recomend/i],
    enMust: [/Back|Description|Priority|Publish|Approv|recommend/i],
  },
  {
    name: 'profile',
    auth: true,
    prep: async (page) => {
      await page.goto(`${BASE}/profile`);
      await settle(page, 1000);
    },
    scope: 'main',
    esMust: [/perfil|correo|tel[eé]fono|Agr[oó]nomo|editar/i],
    enMust: [/profile|email|phone|Agronomist|edit/i],
  },
  {
    name: 'dispositivos',
    auth: true,
    prep: async (page) => {
      await page.goto(`${BASE}/dispositivos`);
      await settle(page, 1200);
    },
    scope: 'main',
    esMust: [/Dispositiv|conectad|Dashboard|muestreo|registrar/i],
    enMust: [/Device|connect|Dashboard|sampling|register/i],
  },
];

async function auditSection(page, section, needAuth) {
  console.log(`\n=== ${section.name.toUpperCase()} ===`);
  try {
    if (section.auth && needAuth) {
      // ensure still authenticated
      if (page.url().includes('/auth/')) {
        await ensureAuth(page);
      }
    }
    await section.prep(page);
  } catch (e) {
    if (String(e.message).includes('NO_')) {
      warn(section.name, 'skipped', e.message);
      return;
    }
    fail(section.name, 'prep failed', String(e.message || e).slice(0, 200));
    return;
  }

  // ES
  await setLocale(page, 'es');
  // re-run prep after locale reload may reset route
  try {
    await section.prep(page);
  } catch (e) {
    if (String(e.message).includes('NO_')) {
      warn(section.name, 'skipped ES (no data)', e.message);
      return;
    }
  }
  await page.evaluate(() => localStorage.setItem('app-locale', 'es'));
  // if prep navigated without reload, force translation load by toggle if needed
  let locale = await page.evaluate(() => localStorage.getItem('app-locale'));
  if (locale !== 'es') await setLocale(page, 'es');
  await settle(page, 700);

  const scopeSel = section.scope.includes(',')
    ? section.scope.split(',').map((s) => s.trim())
    : [section.scope];
  let esText = '';
  for (const s of scopeSel) {
    esText = await textOf(page, s);
    if (esText && esText.length > 10) break;
  }
  console.log(`  [ES sample] ${esText.slice(0, 180)}`);
  const esHits = section.esMust.filter((re) => re.test(esText)).length;
  if (esHits > 0) ok(section.name, 'ES markers', `${esHits}/${section.esMust.length}`);
  else fail(section.name, 'ES markers missing', esText.slice(0, 200));

  // EN
  await setLocale(page, 'en');
  try {
    await section.prep(page);
  } catch (e) {
    if (String(e.message).includes('NO_')) {
      warn(section.name, 'skipped EN (no data)', e.message);
      return;
    }
  }
  await page.evaluate(() => localStorage.setItem('app-locale', 'en'));
  locale = await page.evaluate(() => localStorage.getItem('app-locale'));
  if (locale !== 'en') await setLocale(page, 'en');
  await settle(page, 900);

  let enText = '';
  for (const s of scopeSel) {
    enText = await textOf(page, s);
    if (enText && enText.length > 10) break;
  }
  console.log(`  [EN sample] ${enText.slice(0, 180)}`);
  const enHits = section.enMust.filter((re) => re.test(enText)).length;
  if (enHits > 0) ok(section.name, 'EN markers', `${enHits}/${section.enMust.length}`);
  else fail(section.name, 'EN markers missing', enText.slice(0, 200));

  const leaks = ES_LEAKS.filter((re) => re.test(enText));
  if (leaks.length === 0) ok(section.name, 'no hard Spanish leaks in EN');
  else fail(section.name, 'Spanish leaks in EN', leaks.map((r) => r.source).join(' | ') + ' || ' + enText.slice(0, 220));

  // quick toggle reactivity without full reload (navbar toggle if present)
  const toggle = page
    .locator(
      '[data-testid="locale-toggle"], [data-testid="locale-toggle-login"], [data-testid="locale-toggle-register"], button:has-text("English"), button:has-text("Español")',
    )
    .first();
  if ((await toggle.count()) > 0) {
    const before = await page.evaluate(() => localStorage.getItem('app-locale'));
    await toggle.click();
    await settle(page, 1000);
    const after = await page.evaluate(() => localStorage.getItem('app-locale'));
    if (before !== after) ok(section.name, 'locale toggle mutates locale', `${before}→${after}`);
    else warn(section.name, 'locale toggle did not change locale');
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Public sections first
  for (const section of sections.filter((s) => !s.auth)) {
    await auditSection(page, section, false);
  }

  // Auth
  console.log('\n=== AUTH SETUP ===');
  await ensureAuth(page);
  console.log('  URL after auth:', page.url());
  if (page.url().includes('/auth/')) {
    fail('auth', 'could not establish session');
  } else {
    ok('auth', 'session established');
  }

  for (const section of sections.filter((s) => s.auth)) {
    await auditSection(page, section, true);
  }

  await browser.close();

  console.log('\n========== SUMMARY ==========');
  const pass = results.filter((r) => r.st === 'PASS').length;
  const fails = results.filter((r) => r.st === 'FAIL');
  const warns = results.filter((r) => r.st === 'WARN');
  console.log(`PASS: ${pass}  FAIL: ${fails.length}  WARN: ${warns.length}`);
  for (const f of fails) console.log(` - FAIL [${f.s}] ${f.c}: ${f.d}`);
  for (const w of warns) console.log(` - WARN [${w.s}] ${w.c}: ${w.d}`);
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});

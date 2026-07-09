/**
 * Minute i18n audit for agronomist sections: ES ↔ EN toggle.
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

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(700);
}

async function setLocale(page, locale) {
  // Prefer navbar toggle; fall back to login/register toggles
  const toggle = page.locator(
    '[data-testid="locale-toggle"], [data-testid="locale-toggle-login"], [data-testid="locale-toggle-register"]',
  ).first();
  for (let i = 0; i < 4; i++) {
    const current = await page.evaluate(() => localStorage.getItem('app-locale') || 'es');
    if (current === locale) return;
    if ((await toggle.count()) === 0) {
      // force via storage + reload
      await page.evaluate((loc) => localStorage.setItem('app-locale', loc), locale);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      return;
    }
    await toggle.click();
    await page.waitForTimeout(1000);
  }
}

async function textOf(page, sel = 'main') {
  return (await page.locator(sel).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Login as agronomist (demo)
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await settle(page);
  if (page.url().includes('/auth/login')) {
    await page.fill('input[formcontrolname="email"]', 'i18n.agronomo@smartpalm.test');
    await page.fill('input[formcontrolname="password"]', 'Agro2026!');
    await page.click('button[type="submit"]');
    await settle(page);
  }

  // Ensure session
  if (!page.url().includes('/dashboard') && !page.url().includes('4200')) {
    await page.goto(`${BASE}/dashboard`);
    await settle(page);
  }
  if (page.url().includes('/auth/login')) {
    // still login - try again after clear
    await page.fill('input[formcontrolname="email"]', 'i18n.agronomo@smartpalm.test');
    await page.fill('input[formcontrolname="password"]', 'Agro2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {});
    await settle(page);
  }

  const sections = [
    {
      name: 'login',
      prep: async () => {
        await page.evaluate(() => {
          localStorage.removeItem('smartpalm_user_v1');
          localStorage.removeItem('smartpalm_access_token_v1');
        });
        await page.goto(`${BASE}/auth/login`);
        await settle(page);
      },
      es: [/Iniciar sesión|CORREO|CONTRASEÑA|Regístrate/i],
      en: [/Log in|EMAIL|PASSWORD|Sign up|Register/i],
      hardEsForbiddenInEn: [/Iniciar sesión|Contraseña|Correo electrónico/i],
    },
    {
      name: 'register',
      prep: async () => {
        await page.goto(`${BASE}/auth/register`);
        await settle(page);
      },
      es: [/Crear cuenta|Agrónomo|Correo|Contraseña|Teléfono|Región|Ciudad/i],
      en: [/Create account|Agronomist|Email|Password|Phone|Region|City/i],
      hardEsForbiddenInEn: [/Crear cuenta|Contraseña|Correo electrónico|Teléfono/i],
    },
    {
      name: 'dashboard',
      prep: async () => {
        // re-login if needed
        if (page.url().includes('/auth/')) {
          await page.goto(`${BASE}/auth/login`);
          await settle(page);
          await page.fill('input[formcontrolname="email"]', 'i18n.agronomo@smartpalm.test');
          await page.fill('input[formcontrolname="password"]', 'Agro2026!');
          await page.click('button[type="submit"]');
          await settle(page);
        }
        await page.goto(`${BASE}/dashboard`);
        await settle(page);
        await page.waitForTimeout(1500);
      },
      es: [/Panel|Supervisi|Alertas no disponibles|Recomend|Plantaci/i],
      en: [/Dashboard|Monitor|Alerts are not available|Recommend|Plantation/i],
      hardEsForbiddenInEn: [/Panel de control|Supervisa|Alertas no disponibles|Recomendaciones/i],
    },
    {
      name: 'sidebar',
      prep: async () => {
        await page.goto(`${BASE}/dashboard`);
        await settle(page);
      },
      scope: 'app-sidebar',
      es: [/Panel de control|Cartera de plantaciones|Recomendaciones|Mi perfil|Cerrar sesión|Agrónomo/i],
      en: [/Dashboard|Plantation portfolio|Recommendations|My profile|Log out|Agronomist/i],
      hardEsForbiddenInEn: [/Panel de control|Cartera de plantaciones|Recomendaciones|Mi perfil|Cerrar sesión/i],
    },
    {
      name: 'plantaciones',
      prep: async () => {
        await page.goto(`${BASE}/plantaciones`);
        await settle(page);
        await page.waitForTimeout(800);
      },
      es: [/Cartera de plantaciones|plantaciones|Dashboard|hect/i],
      en: [/Plantation portfolio|plantations|Dashboard|ha|hect/i],
      hardEsForbiddenInEn: [/Cartera de plantaciones|Mis plantaciones/i],
    },
    {
      name: 'recomendaciones',
      prep: async () => {
        await page.goto(`${BASE}/recomendaciones`);
        await settle(page);
        await page.waitForTimeout(1200);
      },
      es: [/Recomendaciones|Pendientes|Publicadas|Nueva/i],
      en: [/Recommendations|Pending|Published|New/i],
      hardEsForbiddenInEn: [/Recomendaciones|Pendientes|Publicadas/i],
    },
    {
      name: 'recomendaciones-new',
      prep: async () => {
        await page.goto(`${BASE}/recomendaciones/new`);
        await settle(page);
      },
      es: [/Nueva recomendación|Plantación|Título|Descripción|Prioridad|Crear recomendación|Cancelar/i],
      en: [/New recommendation|Plantation|Title|Description|Priority|Create recommendation|Cancel/i],
      hardEsForbiddenInEn: [/Nueva recomendación|Descripción|Crear recomendación/i],
    },
    {
      name: 'profile',
      prep: async () => {
        await page.goto(`${BASE}/profile`);
        await settle(page);
      },
      es: [/Agrónomo|correo|tel[eé]fono|perfil|editar/i],
      en: [/Agronomist|email|phone|profile|edit/i],
      hardEsForbiddenInEn: null,
    },
  ];

  for (const section of sections) {
    console.log(`\n=== ${section.name.toUpperCase()} ===`);
    await section.prep();

    // ES
    await setLocale(page, 'es');
    await settle(page);
    await page.waitForTimeout(600);
    let text = await textOf(page, section.scope || 'body');
    let esHits = section.es.filter((re) => re.test(text)).length;
    if (esHits > 0) ok(section.name, 'ES markers present', `${esHits}/${section.es.length}`);
    else fail(section.name, 'ES markers missing', text.slice(0, 160));

    // EN
    await setLocale(page, 'en');
    await settle(page);
    await page.waitForTimeout(900);
    text = await textOf(page, section.scope || 'body');
    const enHits = section.en.filter((re) => re.test(text)).length;
    if (enHits > 0) ok(section.name, 'EN markers present', `${enHits}/${section.en.length}`);
    else fail(section.name, 'EN markers missing', text.slice(0, 160));

    if (section.hardEsForbiddenInEn) {
      const leaks = section.hardEsForbiddenInEn.filter((re) => re.test(text));
      if (leaks.length === 0) ok(section.name, 'no hard Spanish leaks in EN');
      else fail(section.name, 'Spanish leaks in EN UI', leaks.map((r) => r.toString()).join(', ') + ' | ' + text.slice(0, 180));
    }

    // toggle back to ES quickly
    await setLocale(page, 'es');
    await settle(page);
  }

  // Login screen toggle without session
  console.log('\n=== LOGIN TOGGLE RAPID ===');
  await page.evaluate(() => {
    localStorage.removeItem('smartpalm_user_v1');
    localStorage.removeItem('smartpalm_access_token_v1');
  });
  await page.goto(`${BASE}/auth/login`);
  await settle(page);
  await page.waitForSelector('[data-testid="locale-toggle-login"]', { timeout: 10000 });
  await setLocale(page, 'en');
  await settle(page);
  await page.waitForTimeout(1200);
  // Login lives outside <main> (no auth-shell)
  let loginEn = await textOf(page, 'body');
  if (/Log in|EMAIL|PASSWORD|Register|Sign up/i.test(loginEn) && !/Iniciar sesión/.test(loginEn)) {
    ok('login-toggle', 'EN login clean');
  } else fail('login-toggle', 'EN login not clean', loginEn.slice(0, 200));
  await setLocale(page, 'es');
  await settle(page);
  await page.waitForTimeout(1200);
  let loginEs = await textOf(page, 'body');
  if (/Iniciar sesión|CORREO|CONTRASEÑA/i.test(loginEs)) ok('login-toggle', 'ES login restored');
  else fail('login-toggle', 'ES login broken', loginEs.slice(0, 200));

  await browser.close();

  console.log('\n========== SUMMARY ==========');
  const pass = results.filter((r) => r.st === 'PASS').length;
  const fails = results.filter((r) => r.st === 'FAIL');
  console.log(`PASS: ${pass}  FAIL: ${fails.length}`);
  for (const f of fails) console.log(` - [${f.s}] ${f.c}: ${f.d}`);
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});

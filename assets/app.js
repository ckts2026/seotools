'use strict';

/* ---------- Tabs ---------- */
const tabs = document.querySelectorAll('.tab');
tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    localStorage.setItem('seotools_lasttab', btn.dataset.tab);
  });
});
(function restoreTab(){
  const last = localStorage.getItem('seotools_lasttab');
  if (last && document.getElementById('panel-' + last)) {
    document.querySelector(`.tab[data-tab="${last}"]`).click();
  }
})();

/* ---------- Theme ---------- */
const themeToggle = document.getElementById('themeToggle');
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('seotools_theme', t);
}
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});
(function restoreTheme(){
  const saved = localStorage.getItem('seotools_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

/* ---------- Helpers ---------- */
function slugify(s){
  return s.toString().trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}
function downloadCSV(filename, rows){
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
const CURRENT_YEAR = new Date().getFullYear();
const NEXT_YEAR = CURRENT_YEAR + 1;

/* ================= KEYWORDS ================= */
const btnGenKw = document.getElementById('btnGenKw');
const btnExportKw = document.getElementById('btnExportKw');
let lastKeywords = [];

btnGenKw.addEventListener('click', () => {
  const root = document.getElementById('kwRoot').value.trim();
  const cities = document.getElementById('kwCities').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const qualifiers = document.getElementById('kwQualifiers').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const geoMods = document.getElementById('kwGeo').value.split('\n').map(s=>s.trim()).filter(Boolean);

  if (!root){ alert('Renseignez un mot-clé racine.'); return; }

  const out = new Set();
  out.add(root);
  cities.forEach(c => out.add(`${root} ${c}`));
  qualifiers.forEach(q => out.add(`${root} ${q}`));
  cities.forEach(c => qualifiers.forEach(q => out.add(`${root} ${q} ${c}`)));
  geoMods.forEach(g => {
    out.add(`${g} ${root} ${CURRENT_YEAR}`);
    out.add(`${g} ${root} ${NEXT_YEAR}`);
    cities.forEach(c => out.add(`${g} ${root} ${c} ${NEXT_YEAR}`));
  });

  lastKeywords = Array.from(out);
  document.getElementById('kwCount').textContent = lastKeywords.length;
  const box = document.getElementById('kwResult');
  box.innerHTML = lastKeywords.map(k => `<div>${k}</div>`).join('');
});

btnExportKw.addEventListener('click', () => {
  if (!lastKeywords.length){ alert('Générez d\'abord une liste.'); return; }
  downloadCSV('mots-cles-business.csv', [['mot-cle'], ...lastKeywords.map(k => [k])]);
});

/* ================= TITLE LAB ================= */
const canvas = document.createElement('canvas');
const ctx2d = canvas.getContext('2d');
ctx2d.font = '400 20px arial';
const PIXEL_LIMIT = 580;

function measurePx(text){
  return Math.round(ctx2d.measureText(text).width);
}

function updateTitlePreview(){
  const main = document.getElementById('titleMain').value.trim();
  const secondary = document.getElementById('titleSecondary').value.trim();
  const boost = document.getElementById('titleBoost').value.trim();
  const brand = document.getElementById('titleBrand').value.trim();

  let parts = [main];
  if (secondary) parts.push(secondary.split(',').map(s=>s.trim()).filter(Boolean)[0] || '');
  if (boost) parts.push(boost);
  let title = parts.filter(Boolean).join(' | ');
  if (brand) title += ' ' + brand;

  document.getElementById('serpTitlePreview').textContent = title || 'Votre title apparaîtra ici';

  const px = measurePx(title);
  const pct = Math.min(100, Math.round((px / PIXEL_LIMIT) * 100));
  const fill = document.getElementById('pixelFill');
  fill.style.width = pct + '%';
  fill.classList.toggle('over', px > PIXEL_LIMIT);
  document.getElementById('pxValue').textContent = `${px} / ${PIXEL_LIMIT}px`;
  const warn = document.getElementById('pixelWarning');
  warn.textContent = px > PIXEL_LIMIT
    ? '⚠ Title trop long : il sera tronqué dans les résultats Google.'
    : (px < 250 ? 'Il vous reste de la place pour ajouter un mot-clé secondaire ou un booster de CTR.' : 'Longueur correcte.');

  const geoTitle = `Meilleur ${main || '[service]'} ${NEXT_YEAR}${brand ? ' ' + brand : ''}`;
  document.getElementById('titleGeoOut').value = geoTitle;
}
['titleMain','titleSecondary','titleBoost','titleBrand'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateTitlePreview);
});
document.getElementById('btnBuildTitle').addEventListener('click', updateTitlePreview);

document.getElementById('metaDesc').addEventListener('input', function(){
  document.getElementById('metaLen').textContent = this.value.length;
});

/* ================= GSC QUICK WINS ================= */
function parseCSV(text){
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  const rows = lines.map(line => {
    const cells = [];
    let cur = '', inQuotes = false;
    for (let i=0;i<line.length;i++){
      const c = line[i];
      if (c === '"'){ inQuotes = !inQuotes; continue; }
      if (c === ',' && !inQuotes){ cells.push(cur); cur=''; continue; }
      cur += c;
    }
    cells.push(cur);
    return cells;
  });
  return rows;
}

function findCol(header, patterns){
  const lower = header.map(h => h.toLowerCase());
  for (const p of patterns){
    const idx = lower.findIndex(h => h.includes(p));
    if (idx !== -1) return idx;
  }
  return -1;
}

document.getElementById('btnParseGsc').addEventListener('click', () => {
  const file = document.getElementById('gscFile').files[0];
  if (!file){ alert('Sélectionnez un export CSV Google Search Console (onglet Pages).'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const rows = parseCSV(e.target.result);
    if (rows.length < 2){ alert('Fichier vide ou illisible.'); return; }
    const header = rows[0];
    const iPage = findCol(header, ['page','url']);
    const iClicks = findCol(header, ['clic','click']);
    const iImpr = findCol(header, ['impress']);
    const iCtr = findCol(header, ['ctr']);
    const iPos = findCol(header, ['posit']);

    if (iPage === -1 || iClicks === -1 || iImpr === -1 || iPos === -1){
      alert('Colonnes non reconnues. Attendu : Page, Clics/Clicks, Impressions, Position (export GSC standard).');
      return;
    }

    const minImpr = parseFloat(document.getElementById('gscMinImpr').value) || 0;
    const posMin = parseFloat(document.getElementById('gscPosMin').value) || 0;
    const posMax = parseFloat(document.getElementById('gscPosMax').value) || 100;

    const data = rows.slice(1).map(r => ({
      page: r[iPage],
      clicks: parseFloat(r[iClicks]) || 0,
      impressions: parseFloat((r[iImpr]||'0').replace(/\s/g,'')) || 0,
      ctr: iCtr !== -1 ? r[iCtr] : '',
      position: parseFloat((r[iPos]||'0').replace(',','.')) || 0,
    })).filter(r => r.page);

    data.sort((a,b) => b.impressions - a.impressions);

    const tbody = document.querySelector('#gscTable tbody');
    tbody.innerHTML = '';
    data.forEach(r => {
      let verdict = { label: 'OK', cls: 'ok' };
      const isQuickWin = r.impressions >= minImpr && r.position >= posMin && r.position <= posMax;
      if (isQuickWin) verdict = { label: 'Quick win — optimiser', cls: 'priority' };
      else if (r.impressions >= minImpr && r.position > posMax) verdict = { label: 'À surveiller', cls: 'watch' };

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.page}</td>
        <td>${r.clicks}</td>
        <td>${r.impressions}</td>
        <td>${r.ctr}</td>
        <td>${r.position.toFixed(1)}</td>
        <td><span class="badge ${verdict.cls}">${verdict.label}</span></td>
      `;
      tbody.appendChild(tr);
    });
  };
  reader.readAsText(file);
});

/* ================= CANNIBALISATION ================= */
document.getElementById('btnCheckCanni').addEventListener('click', () => {
  const kw = document.getElementById('canniKw').value.trim();
  const urls = document.getElementById('canniUrls').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const box = document.getElementById('canniResult');
  if (!kw || urls.length === 0){ box.innerHTML = '<p class="hint">Renseignez le mot-clé et au moins une URL.</p>'; return; }

  if (urls.length === 1){
    box.innerHTML = `<div class="status ok">✓ Pas de risque de cannibalisation détecté</div>
      <p>Une seule page cible « ${kw} » : ${urls[0]}. Concentrez tous vos efforts (title, contenu, maillage interne) sur cette page.</p>`;
  } else {
    box.innerHTML = `<div class="status danger">⚠ Risque de cannibalisation : ${urls.length} pages ciblent « ${kw} »</div>
      <ul>${urls.map(u => `<li>${u}</li>`).join('')}</ul>
      <p><b>Actions recommandées :</b></p>
      <ul>
        <li>Choisissez la page la plus autoritaire / la mieux positionnée comme page principale.</li>
        <li>Redirigez (301) ou fusionnez le contenu des autres pages vers celle-ci, ou</li>
        <li>Différenciez clairement les angles (ex : mot-clé principal vs sous-thématique précise) et ajustez chaque title pour qu'il ne cible plus le même mot-clé exact.</li>
        <li>Consolidez le maillage interne : tous les liens internes visant « ${kw} » doivent pointer vers la même page.</li>
      </ul>`;
  }
});

/* ================= MAILLAGE INTERNE ================= */
document.getElementById('btnCheckLinking').addEventListener('click', () => {
  const target = document.getElementById('linkTarget').value.trim();
  const lines = document.getElementById('linkSources').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const box = document.getElementById('linkResult');
  if (!target || lines.length === 0){ box.innerHTML = '<p class="hint">Renseignez la page cible et au moins un lien source.</p>'; return; }

  const targetKw = target.replace(/^\//,'').replace(/-/g,' ').toLowerCase();
  const entries = lines.map(l => {
    const [src, anchor] = l.split('|').map(s => (s||'').trim());
    return { src, anchor: anchor || '' };
  });
  const count = entries.length;
  const optimizedAnchors = entries.filter(e => e.anchor && targetKw.split(' ').some(w => w.length>3 && e.anchor.toLowerCase().includes(w))).length;

  let status = count >= 5 ? { label: `✓ ${count} liens internes — seuil atteint`, cls:'ok' }
    : { label: `⚠ ${count}/5 liens internes — seuil non atteint`, cls: count>0 ? 'watch':'danger' };

  box.innerHTML = `
    <div class="status ${status.cls}">${status.label}</div>
    <p>Ancres optimisées (contenant un mot du mot-clé cible) : <b>${optimizedAnchors}/${count}</b></p>
    <p class="hint">Rappel : plus le lien vient d'une page sémantiquement proche (même thématique) et déjà bien positionnée elle-même, plus il compte. Ne sur-optimisez pas non plus toutes les ancres à l'identique — variez naturellement.</p>
  `;
});

/* ================= AUTORITÉ ================= */
document.getElementById('btnCheckAuth').addEventListener('click', () => {
  const dr = parseFloat(document.getElementById('authDR').value) || 0;
  const kd = parseFloat(document.getElementById('authKD').value) || 0;
  const box = document.getElementById('authResult');
  const diff = dr - kd;
  let status;
  if (diff >= 15) status = { label: '✓ Mot-clé accessible', cls:'ok', txt: 'Votre autorité est confortablement au-dessus de la difficulté estimée du mot-clé : vous pouvez attaquer directement, en soignant title + structure de page.' };
  else if (diff >= -10) status = { label: '~ Accessible avec effort', cls:'watch', txt: 'C\'est jouable, mais il faudra probablement renforcer le maillage interne et obtenir quelques backlinks thématiques pour percer en top 10.' };
  else status = { label: '✗ Mot-clé trop concurrentiel pour l\'instant', cls:'danger', txt: 'Le risque : publier une page qui restera coincée en page 3-4 sans jamais décoller, ce qui gaspille du budget éditorial. Priorisez d\'abord des variantes longue traîne (ville, qualificatif) le temps de faire grossir votre autorité.' };

  box.innerHTML = `<div class="status ${status.cls}">${status.label}</div><p>${status.txt}</p>`;
});

const NETLINK_ITEMS = [
  'Prioriser des liens depuis des sites thématiquement proches, jamais hors-sujet.',
  'Vérifier que la page source elle-même se positionne déjà sur des mots-clés SEO (signal de confiance transmis).',
  'Varier les ancres : marque, URL nue, « cliquez ici », et seulement de temps en temps un mot-clé exact sur les meilleurs liens.',
  'Éviter un pic brutal de backlinks sur un site jeune : montée progressive et naturelle.',
  'Attendre le « transition rank » (jusqu\'à ~2 mois) avant de juger l\'effet d\'une action — ne pas paniquer et annuler un changement trop vite.',
  'Se souvenir que les scores DR/AS/TF sont des estimations d\'outils tiers, pas la donnée réelle de Google : suivre plutôt Search Console (clics, positions, mots-clés top 3).',
];
document.getElementById('netlinkChecklist').innerHTML = NETLINK_ITEMS.map((t,i) =>
  `<label><input type="checkbox" data-store="netlink-${i}"> ${t}</label>`).join('');

/* ================= GEO ================= */
document.getElementById('geoYear1').textContent = NEXT_YEAR;

const GEO_ITEMS = [
  `Inclure un pattern « meilleur/top [service] [ville] ${NEXT_YEAR} » dans vos titles — c'est ce que les IA tapent elles-mêmes dans Google pour trouver une réponse fraîche.`,
  'Ajouter des données structurées (schema.org : Organization, LocalBusiness, Service, FAQPage) pour faciliter l\'extraction par les IA.',
  'Construire une page « classement / comparatif » sur votre thématique — mais sans vous auto-désigner n°1, cette pratique est de moins en moins efficace et perçue négativement.',
  'Chercher à être intégré dans les classements tiers déjà bien positionnés (échange de visibilité : « je te cite si tu me cites »).',
  'Publier des preuves fraîches et datées (études de cas chiffrées, témoignages nommés, mise à jour visible de la page).',
  'Tester régulièrement en navigation privée sur ChatGPT/Perplexity/Claude avec des prompts naturels (pas juste le mot-clé) pour voir si votre marque est citée et quelle source est utilisée.',
  'Consolider l\'autorité SEO classique (backlinks, présence multicanal) : le GEO s\'appuie très largement sur les mêmes fondations que le SEO.',
];
document.getElementById('geoChecklist').innerHTML = GEO_ITEMS.map((t,i) =>
  `<label><input type="checkbox" data-store="geo-${i}"> ${t}</label>`).join('');

document.getElementById('btnGeoPrompts').addEventListener('click', () => {
  const seed = document.getElementById('geoPromptSeed').value.trim();
  const box = document.getElementById('geoPromptsOut');
  if (!seed){ box.innerHTML = '<p class="hint">Renseignez un mot-clé business.</p>'; return; }
  const prompts = [
    `Peux-tu me recommander un(e) ${seed} fiable ? Je veux quelqu'un de sérieux avec de bons avis.`,
    `J'hésite entre plusieurs prestataires pour "${seed}", tu me conseilles lequel et pourquoi ?`,
    `C'est quoi le meilleur choix en ce moment pour "${seed}" ? J'ai un budget limité.`,
    `Peux-tu comparer les meilleures options pour "${seed}" et me dire laquelle a le meilleur rapport qualité/prix ?`,
    `Je cherche "${seed}" près de chez moi, tu as des recommandations récentes ?`,
  ];
  box.innerHTML = `<p class="hint">Testez ces formulations naturelles dans ChatGPT / Perplexity / Claude en navigation privée :</p><ul>${prompts.map(p=>`<li>${p}</li>`).join('')}</ul>`;
});

document.getElementById('btnGeoTitle').addEventListener('click', () => {
  const service = document.getElementById('geoTitleService').value.trim();
  const city = document.getElementById('geoTitleCity').value.trim();
  const box = document.getElementById('geoTitleOut');
  if (!service){ box.innerHTML = '<p class="hint">Renseignez un mot-clé de service.</p>'; return; }
  const variants = [
    `Meilleur ${service}${city ? ' ' + city : ''} ${NEXT_YEAR}`,
    `Top ${service}${city ? ' ' + city : ''} ${NEXT_YEAR} : comparatif`,
    `${service}${city ? ' ' + city : ''} : le guide complet ${NEXT_YEAR}`,
  ];
  box.innerHTML = `<ul>${variants.map(v=>`<li>${v}</li>`).join('')}</ul>`;
});

/* Persist checkbox state */
document.addEventListener('change', e => {
  if (e.target.matches('input[type=checkbox][data-store]')){
    localStorage.setItem('seotools_' + e.target.dataset.store, e.target.checked ? '1':'0');
  }
});
function restoreCheckboxes(){
  document.querySelectorAll('input[type=checkbox][data-store]').forEach(cb => {
    cb.checked = localStorage.getItem('seotools_' + cb.dataset.store) === '1';
  });
}
setTimeout(restoreCheckboxes, 0);

/* ================= PLAN D'ACTION ================= */
const TASK_KEY = 'seotools_tasks';
function loadTasks(){ try{ return JSON.parse(localStorage.getItem(TASK_KEY)) || []; } catch(e){ return []; } }
function saveTasks(tasks){ localStorage.setItem(TASK_KEY, JSON.stringify(tasks)); }

function renderTasks(){
  const tasks = loadTasks();
  const list = document.getElementById('taskList');
  list.innerHTML = tasks.map((t,i) => `
    <li class="${t.done ? 'done':''}">
      <input type="checkbox" ${t.done?'checked':''} data-idx="${i}" class="task-check">
      <span class="task-label">${t.label}</span>
      <span class="task-cat">${t.cat}</span>
      <button class="task-del" data-idx="${i}" title="Supprimer">✕</button>
    </li>
  `).join('');
  document.getElementById('taskTotal').textContent = tasks.length;
  document.getElementById('taskDone').textContent = tasks.filter(t=>t.done).length;
}

document.getElementById('btnAddTask').addEventListener('click', () => {
  const input = document.getElementById('taskInput');
  const cat = document.getElementById('taskCategory').value;
  const label = input.value.trim();
  if (!label) return;
  const tasks = loadTasks();
  tasks.push({ label, cat, done:false, created: new Date().toISOString() });
  saveTasks(tasks);
  input.value = '';
  renderTasks();
});

document.getElementById('taskList').addEventListener('click', e => {
  const idx = e.target.dataset.idx;
  if (idx === undefined) return;
  const tasks = loadTasks();
  if (e.target.classList.contains('task-check')){
    tasks[idx].done = e.target.checked;
  } else if (e.target.classList.contains('task-del')){
    tasks.splice(idx,1);
  } else return;
  saveTasks(tasks);
  renderTasks();
});

renderTasks();

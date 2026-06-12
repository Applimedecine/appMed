import { initLayout } from './nav.js';

const THEMES = [
  {
    rank: 1,
    priority: 'Maximale',
    theme: 'Tolérance materno-fœtale',
    freq: 6, total: 7,
    icon: '🤰',
    keyPoints: ['HLA-G/E/F', 'NK déciduales', 'T régulateurs', 'CD55/CD59', 'Interfaces 1 et 2'],
    courses: [{ slug: 'fc03', code: 'FC03', title: 'Développement du SI & immunité de la grossesse' }],
    note: null,
  },
  {
    rank: 2,
    priority: 'Maximale',
    theme: 'Déficits immunitaires primitifs',
    freq: 6, total: 7,
    icon: '🧬',
    keyPoints: ['Cas clinique nourrisson', 'DICS', 'Bruton', 'DICV', 'Immunophénotypage', 'Prise en charge'],
    courses: [{ slug: 'fc18', code: 'FC18', title: 'Déficits immunitaires héréditaires' }],
    note: null,
  },
  {
    rank: 3,
    priority: 'Maximale',
    theme: 'Immunosénescence',
    freq: 7, total: 7,
    icon: '🧓',
    keyPoints: ['Involution thymique', 'Biais myéloïde HSC', 'Lymphocytes naïfs ↓', 'Réponse vaccinale ↓', 'QCM certain'],
    courses: [{ slug: 'fc01', code: 'FC01', title: 'Vieillissement du système immunitaire' }],
    note: null,
  },
  {
    rank: 4,
    priority: 'Maximale',
    theme: 'Activation LT & immunosuppresseurs',
    freq: 5, total: 7,
    icon: '💊',
    keyPoints: ['Signaux 1/2/3', 'Ciclosporine/tacrolimus (calcineurine)', 'Sirolimus (mTOR)', 'Abatacept', 'Basiliximab'],
    courses: [{ slug: 'fc12', code: 'FC12', title: 'Mécanismes d\'action des immunosuppresseurs' }],
    note: null,
  },
  {
    rank: 5,
    priority: 'Haute',
    theme: 'Rejet de greffe',
    freq: 5, total: 7,
    icon: '🫀',
    keyPoints: ['Voies directe et indirecte', 'Cross-match', 'Réaction allo-immune adaptative', 'HLA'],
    courses: [{ slug: 'fc15', code: 'FC15', title: 'Mécanismes de rejet de greffe' }],
    note: null,
  },
  {
    rank: 6,
    priority: 'Haute',
    theme: 'Immunité anti-tumorale & CAR-T',
    freq: 5, total: 7,
    icon: '🔬',
    keyPoints: ['Échappement tumoral', 'TGFβ / IL-10 / CMH / Treg / IDO / TAM M2', 'Anti-PD1/CTLA4', 'Fabrication CAR-T'],
    courses: [
      { slug: 'fc09', code: 'FC09', title: 'Immunité antitumorale et immunothérapie' },
      { slug: 'fc05', code: 'FC05', title: 'Thérapies cellulaires' },
    ],
    note: null,
  },
  {
    rank: 7,
    priority: 'Haute',
    theme: 'MICI (Crohn / RCH)',
    freq: 6, total: 7,
    icon: '🦠',
    keyPoints: ['NOD2', 'Microbiote', 'Perméabilité intestinale', 'Cellules de Paneth', 'Th1/Th17'],
    courses: [{ slug: 'fc20', code: 'FC20', title: 'Physiopathologie des MICI' }],
    note: null,
  },
  {
    rank: 8,
    priority: 'Haute',
    theme: 'VIH / SIDA',
    freq: 4, total: 7,
    icon: '🎗️',
    keyPoints: ['Entrée dans les muqueuses', 'Dissémination', 'Chute CD4', 'Phase symptomatique', 'Transcriptase inverse'],
    courses: [{ slug: 'fc14', code: 'FC14', title: 'Immunopathologie du VIH' }],
    note: null,
  },
  {
    rank: 9,
    priority: 'Moyenne',
    theme: 'Lupus (LES)',
    freq: 4, total: 7,
    icon: '🦋',
    keyPoints: ['Corps apoptotiques', 'Complexes immuns', 'Voie classique du complément', 'Interféronopathie'],
    courses: [
      { slug: 'fc21', code: 'FC21', title: 'Lupus érythémateux systémique' },
      { slug: 'fc19', code: 'FC19', title: 'Complément et complexes immuns' },
    ],
    note: 'Déjà tombé en 2026 → QCM seulement',
  },
  {
    rank: 10,
    priority: 'Moyenne',
    theme: 'Biothérapies & anticorps monoclonaux',
    freq: 3, total: 7,
    icon: '💉',
    keyPoints: ['Anti-TNF', 'Immunogénicité (chimérique/humanisé/humain)', 'Fab/Fc', 'Biosimilaires', 'Monitoring'],
    courses: [
      { slug: 'fc17', code: 'FC17', title: 'Anticorps thérapeutiques et protéines de fusion' },
      { slug: 'fc16', code: 'FC16', title: 'Cibles et mécanismes d\'action des cytokines' },
    ],
    note: null,
  },
  {
    rank: 11,
    priority: 'Moyenne',
    theme: 'Polyarthrite rhumatoïde',
    freq: 3, total: 7,
    icon: '🦴',
    keyPoints: ['ACPA/anti-CCP', 'Épitope partagé HLA-DRB1', 'Citrullination', 'Éléments précliniques'],
    courses: [{ slug: 'fc04a', code: 'FC04a', title: 'Physiopathologie de la polyarthrite rhumatoïde' }],
    note: 'Déjà tombé en 2026',
  },
];

const P = {
  'Maximale': { color: 'var(--c-error)', soft: 'var(--c-error-soft)', emoji: '🔥' },
  'Haute':    { color: 'var(--c-warning)', soft: 'var(--c-warning-soft)', emoji: '⚡' },
  'Moyenne':  { color: 'var(--c-accent)', soft: 'var(--c-accent-soft)', emoji: '📌' },
};

(async function () {
  await initLayout();
  const main = document.getElementById('main');

  const cards = THEMES.map((t) => {
    const p = P[t.priority];
    const pct = Math.round((t.freq / t.total) * 100);
    const keys = t.keyPoints.map((k) => `<span class="rtrap-key">${k}</span>`).join('');
    const courses = t.courses.map((c) =>
      `<a href="./cours.html?id=${c.slug}" class="rtrap-course-link">→ ${c.code} — ${c.title}</a>`
    ).join('');
    const noteHtml = t.note
      ? `<div class="rtrap-note">⚠️ ${t.note}</div>`
      : '';

    return `
      <article class="card rtrap-card" style="border-left:4px solid ${p.color}">
        <div class="rtrap-meta">
          <span class="rtrap-rank" style="color:${p.color}">#${t.rank}</span>
          <span class="rtrap-badge" style="background:${p.soft};color:${p.color}">${p.emoji} ${t.priority}</span>
          <div class="rtrap-bar-wrap">
            <div class="rtrap-bar" style="width:${pct}%;background:${p.color}"></div>
          </div>
          <span class="rtrap-freq">${t.freq}/7 ans</span>
        </div>
        <h3 class="rtrap-title">${t.icon} ${t.theme}</h3>
        <div class="rtrap-keys">${keys}</div>
        ${noteHtml}
        <div class="rtrap-courses">${courses}</div>
      </article>`;
  }).join('');

  main.innerHTML = `
    <p class="breadcrumb"><a href="./index.html">Accueil</a> › Priorités rattrapage</p>
    <h1>🎯 Priorités Rattrapage</h1>
    <p class="lead">Thèmes classés par probabilité d'apparition au partiel — analyse des annales 2016–2026.</p>

    <div class="rtrap-excluded">
      <strong>⚠️ Thèmes exclus</strong> (déjà tombés en session normale 2026) :
      HSI type I · LES/complément · Polyarthrite rhumatoïde · Immunogénicité anticorps · Polyradiculonévrite · SARS-CoV-2 · Vaccination grippe
    </div>

    <div class="rtrap-legend">
      <span class="rtrap-badge" style="background:var(--c-error-soft);color:var(--c-error)">🔥 Maximale</span>
      <span class="rtrap-badge" style="background:var(--c-warning-soft);color:var(--c-warning)">⚡ Haute</span>
      <span class="rtrap-badge" style="background:var(--c-accent-soft);color:var(--c-accent)">📌 Moyenne</span>
      <span style="margin-left:auto;font-size:.82rem;color:var(--c-text-faint);align-self:center">Fréq. = nb d'années sur 7 annales</span>
    </div>

    <div class="rtrap-list">${cards}</div>`;
})();

import { initLayout } from './nav.js';
import { Data, param, esc, inline } from './data.js';
import { Progress } from './storage.js';
import { eAttrs, initEditor } from './editor.js';

// Icône + libellé par défaut selon le ton du callout.
const CALLOUT_META = {
  def: { icon: '📖', label: 'Définition' },
  cle: { icon: '🎯', label: 'À retenir' },
  piege: { icon: '⚠️', label: 'Piège à éviter' },
  mnemo: { icon: '🧠', label: 'Moyen mnémotechnique' },
  info: { icon: '💡', label: 'Le saviez-vous ?' },
  exemple: { icon: '🔬', label: 'Exemple' },
};

// ----------------------------------------------------------------------- //
// Rendu du format enrichi (résumés rédigés)
// ----------------------------------------------------------------------- //
// `pfx` : préfixe d'identifiant d'édition propre au bloc (ex. « sec0.b2 »).
function bullets(items, pfx) {
  return `<ul class="c-list">${(items || []).map((x, i) =>
    `<li ${eAttrs(`${pfx}.i${i}`, x, true)}>${inline(x)}</li>`).join('')}</ul>`;
}

function renderBlock(b, pfx) {
  switch (b.type) {
    case 'paragraph':
      return `<p ${eAttrs(pfx, b.html || b.text || '', true)}>${inline(b.html || b.text || '')}</p>`;
    case 'bullets':
      return bullets(b.items, pfx);
    case 'numbers':
    case 'steps':
      return `<ol class="c-steps">${(b.items || []).map((x, i) =>
        `<li ${eAttrs(`${pfx}.i${i}`, x, true)}>${inline(x)}</li>`).join('')}</ol>`;
    case 'definition':
      return `<dl class="def">${(b.items || []).map((it, i) =>
        `<dt ${eAttrs(`${pfx}.t${i}`, it.t || it.term, true)}>${inline(it.t || it.term)}</dt>` +
        `<dd ${eAttrs(`${pfx}.d${i}`, it.d || it.def, true)}>${inline(it.d || it.def)}</dd>`).join('')}</dl>`;
    case 'table':
      return `<div class="tbl-wrap"><table class="tbl">
        <thead><tr>${(b.columns || []).map((c, ci) =>
          `<th ${eAttrs(`${pfx}.c${ci}`, c, true)}>${inline(c)}</th>`).join('')}</tr></thead>
        <tbody>${(b.rows || []).map((r, ri) => `<tr>${r.map((c, ci) =>
          `<td ${eAttrs(`${pfx}.r${ri}c${ci}`, c, true)}>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>`;
    case 'callout': {
      const meta = CALLOUT_META[b.tone] || { icon: '📌', label: '' };
      const title = b.title != null ? b.title : meta.label;
      const head = title ? `<div class="callout-title">${meta.icon} ${esc(title)}</div>` : '';
      const body = b.html != null
        ? `<div class="callout-body" ${eAttrs(pfx, b.html, true)}>${inline(b.html)}</div>`
        : `<div class="callout-body">${bullets(b.items, pfx)}</div>`;
      return `<div class="callout ${esc(b.tone || '')}">${head}${body}</div>`;
    }
    default:
      return `<p ${eAttrs(pfx, b.html || b.text || '', true)}>${inline(b.html || b.text || '')}</p>`;
  }
}

function renderSection(s, idx) {
  const acc = `acc-${esc(s.accent || 'teal')}`;
  const id = esc(s.id || `sec-${idx + 1}`);
  const ico = s.icon ? `<span class="c-ico" aria-hidden="true">${s.icon}</span>` : '';
  const pfx = `sec${idx}`;
  return `<section class="c-section ${acc}" id="${id}">
    <h2 class="c-head">${ico}<span ${eAttrs(`${pfx}.head`, s.heading || '', false)}>${esc(s.heading || '')}</span></h2>
    <div class="c-body">${(s.blocks || []).map((b, bi) => renderBlock(b, `${pfx}.b${bi}`)).join('')}</div>
  </section>`;
}

// ----------------------------------------------------------------------- //
// Rendu de secours pour l'ancien format extrait automatiquement
// ----------------------------------------------------------------------- //
function renderLegacyBlock(b) {
  if (b.type === 'heading') {
    const tag = b.level === 3 ? 'h3' : 'h2';
    return `<${tag} id="${esc(b.id)}">${esc(b.text)}</${tag}>`;
  }
  if (b.type === 'list') {
    return `<ul>${b.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  }
  return `<p>${esc(b.text)}</p>`;
}

// ----------------------------------------------------------------------- //
(async function () {
  await initLayout({ page: 'cours' });
  const main = document.getElementById('main');
  const slug = param('id');
  if (!slug) { main.innerHTML = '<div class="error-card">Aucun cours sélectionné.</div>'; return; }

  let d;
  try { d = await Data.cours(slug); }
  catch (e) { main.innerHTML = `<div class="error-card">Impossible de charger ce cours.<br><small>${esc(e.message)}</small></div>`; return; }

  const curated = Array.isArray(d.sections) && d.sections.length > 0;

  // Table des matières (sections rédigées, sinon TOC extraite).
  const tocItems = curated
    ? d.sections.map((s, i) => ({ id: s.id || `sec-${i + 1}`, label: s.heading || '', level: 2 }))
    : (d.toc || []);
  const toc = tocItems.length
    ? `<aside class="toc" aria-label="Sommaire du cours">
         <div class="toc-title">Sommaire</div>
         ${tocItems.map((t) => `<a href="#${esc(t.id)}" class="lvl-${t.level}">${esc(t.label)}</a>`).join('')}
       </aside>`
    : '';

  const banner = (!curated && d.extractionStatus !== 'ok')
    ? `<div class="banner warn">⚠️<div><b>Extraction partielle</b>Ce cours a été généré automatiquement depuis le PDF et peut comporter des passages incomplets. Réfère-toi au PDF d'origine en cas de doute.</div></div>`
    : '';

  const body = curated
    ? `<div class="course" id="prose" data-escope="cours/${esc(slug)}">
         ${d.summary ? `<div class="callout cle c-intro"><div class="callout-title">📌 En bref</div><div class="callout-body" ${eAttrs('summary', d.summary, true)}>${inline(d.summary)}</div></div>` : ''}
         ${d.sections.map(renderSection).join('')}
       </div>`
    : `<article class="prose" id="prose">${(d.blocks || []).map(renderLegacyBlock).join('')}</article>`;

  main.innerHTML = `
    <p class="breadcrumb"><a href="./index.html">Accueil</a> › ${esc(d.code)}</p>
    <p class="eyebrow">${esc(d.code)} · ${esc(d.prof || '')}</p>
    <h1>${esc(d.title)}</h1>
    <div class="btn-row" style="margin:.8rem 0 .4rem">
      <a class="btn btn-soft" href="./fiche.html?id=${slug}">📄 Fiche de révision</a>
      <a class="btn btn-soft" href="./qroc.html?id=${slug}">✍️ S'entraîner en QROC</a>
      <a class="btn btn-soft" href="./quiz.html?set=cours&mode=lesson&lesson=${slug}">🎯 Tester mes connaissances</a>
      <button class="btn btn-ghost" id="read-btn"></button>
    </div>
    ${banner}
    <div class="reader">
      ${body}
      ${toc}
    </div>
    <p class="footer">${curated ? 'Résumé de révision rédigé à partir du cours.' : `Source : ${esc(d.sourceFile || '')}`}</p>`;

  // Bouton « marquer comme lu »
  const readBtn = document.getElementById('read-btn');
  const refreshBtn = () => {
    const read = Progress.lesson(slug).coursRead;
    readBtn.innerHTML = read ? '✓ Cours lu' : 'Marquer comme lu';
    readBtn.classList.toggle('btn-soft', read);
  };
  refreshBtn();
  readBtn.addEventListener('click', () => {
    const read = Progress.lesson(slug).coursRead;
    Progress.updateLesson(slug, { coursRead: !read });
    refreshBtn();
  });

  // Mise en évidence du sommaire au défilement
  const links = [...document.querySelectorAll('.toc a')];
  const heads = curated
    ? [...document.querySelectorAll('.c-section')]
    : [...document.querySelectorAll('.prose h2, .prose h3')];
  if (links.length && 'IntersectionObserver' in window) {
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((a) => a.classList.remove('active'));
          const a = byId.get(en.target.id);
          if (a) a.classList.add('active');
        }
      });
    }, { rootMargin: '0px 0px -75% 0px', threshold: 0 });
    heads.forEach((h) => obs.observe(h));
  }

  // Édition locale du texte (le bouton flottant n'apparaît que sur le format rédigé).
  if (curated) initEditor(main);
})();

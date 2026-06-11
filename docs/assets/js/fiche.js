import { initLayout } from './nav.js';
import { Data, param, esc, inline } from './data.js';
import { Progress } from './storage.js';
import { eAttrs, initEditor } from './editor.js';

function renderSection(s, idx) {
  const pfx = `sec${idx}`;
  const head = s.heading ? `<h2 ${eAttrs(`${pfx}.head`, s.heading, false)}>${esc(s.heading)}</h2>` : '';
  if (s.type === 'callout') {
    const body = s.html != null
      ? `<div class="callout-body" ${eAttrs(pfx, s.html, true)}>${inline(s.html)}</div>`
      : `<div class="callout-body">${(s.items || []).map(inline).join('<br>')}</div>`;
    return `<div class="fiche-section">${head}<div class="callout ${esc(s.tone || '')}">${body}</div></div>`;
  }
  if (s.type === 'table') {
    return `<div class="fiche-section">${head}<div class="tbl-wrap"><table class="tbl">
      <thead><tr>${(s.columns || []).map((c, ci) => `<th ${eAttrs(`${pfx}.c${ci}`, c, false)}>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${(s.rows || []).map((r, ri) => `<tr>${r.map((c, ci) => `<td ${eAttrs(`${pfx}.r${ri}c${ci}`, c, true)}>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div></div>`;
  }
  if (s.type === 'definition') {
    return `<div class="fiche-section">${head}<dl class="def">${(s.items || []).map((it, i) =>
      `<dt ${eAttrs(`${pfx}.t${i}`, it.t || it.term, false)}>${esc(it.t || it.term)}</dt>` +
      `<dd ${eAttrs(`${pfx}.d${i}`, it.d || it.def, true)}>${inline(it.d || it.def)}</dd>`).join('')}</dl></div>`;
  }
  // bullets par défaut
  return `<div class="fiche-section">${head}<ul class="prose">${(s.items || []).map((x, i) =>
    `<li ${eAttrs(`${pfx}.i${i}`, x, true)}>${inline(x)}</li>`).join('')}</ul></div>`;
}

(async function () {
  await initLayout({ page: 'fiche' });
  const main = document.getElementById('main');
  const slug = param('id');
  if (!slug) { main.innerHTML = '<div class="error-card">Aucune fiche sélectionnée.</div>'; return; }

  let d;
  try { d = await Data.fiche(slug); }
  catch (e) { main.innerHTML = `<div class="error-card">Impossible de charger cette fiche.</div>`; return; }

  const hasContent = (d.sections || []).length > 0;

  main.innerHTML = `
    <p class="breadcrumb"><a href="./index.html">Accueil</a> › <a href="./fiches.html">Fiches</a> › ${esc(slug.toUpperCase())}</p>
    <p class="eyebrow">Fiche de révision</p>
    <h1>${esc(d.title || 'Fiche')}</h1>
    <div class="btn-row" style="margin:.8rem 0">
      <a class="btn btn-soft" href="./cours.html?id=${slug}">📖 Cours complet</a>
      <a class="btn btn-soft" href="./quiz.html?set=cours&mode=lesson&lesson=${slug}">🎯 QCM associé</a>
      ${hasContent ? '<button class="btn btn-ghost" id="read-btn"></button>' : ''}
    </div>
    <div data-escope="fiche/${esc(slug)}">
      ${d.summary ? `<div class="callout tip"><div class="callout-body"><b>En bref.</b> <span ${eAttrs('summary', d.summary, true)}>${inline(d.summary)}</span></div></div>` : ''}
      ${hasContent
        ? `<div style="max-width:74ch">${(d.sections).map(renderSection).join('')}</div>`
        : `<div class="banner info" style="margin-top:1rem">📝<div><b>Fiche en préparation</b>Le contenu de cette fiche n'a pas encore été rédigé. En attendant, consulte le cours complet.</div></div>`}
    </div>
    `;

  if (hasContent) {
    const readBtn = document.getElementById('read-btn');
    const refresh = () => {
      const read = Progress.lesson(slug).ficheRead;
      readBtn.innerHTML = read ? '✓ Fiche révisée' : 'Marquer comme révisée';
      readBtn.classList.toggle('btn-soft', read);
    };
    refresh();
    readBtn.addEventListener('click', () => {
      Progress.updateLesson(slug, { ficheRead: !Progress.lesson(slug).ficheRead });
      refresh();
    });
  }

  // Édition locale du texte (le bouton flottant n'apparaît que s'il y a du contenu).
  initEditor(main);
})();

// Édition locale du texte de l'application.
//
// Permet de retoucher n'importe quel passage (cours, fiches, QCM, QROC)
// directement dans l'interface. Les modifications restent sur l'appareil de
// l'utilisatrice (localStorage) et s'appliquent immédiatement, à tout moment.
//
// Principe : chaque élément modifiable porte `data-eid` (identifiant stable),
// `data-raw` (texte d'origine, pour réinitialiser) et, si son contenu accepte
// la mise en forme **gras**/*italique*, `data-md="1"`. La portée (type + cours)
// est lue sur l'ancêtre `[data-escope]` (ex. « cours/fc07 »).
import { esc, inline } from './data.js';
import { Edits } from './storage.js';

// Attributs à insérer sur un élément modifiable depuis les fonctions de rendu.
export function eAttrs(eid, raw, md) {
  return `data-eid="${esc(String(eid))}" data-raw="${esc(raw == null ? '' : raw)}"${md ? ' data-md="1"' : ''}`;
}

// Portée (type/slug) d'un élément, lue sur son conteneur `[data-escope]`.
function scopeOf(el) {
  const host = el.closest('[data-escope]');
  if (!host) return null;
  const [type, slug] = host.dataset.escope.split('/');
  return { type, slug };
}

// Écrit le texte dans l'élément, avec mise en forme si `data-md`.
function setContent(el, raw) {
  if (el.dataset.md === '1') el.innerHTML = inline(raw);
  else el.textContent = raw;
}

// Applique les retouches enregistrées aux éléments pas encore traités.
// Idempotent : un drapeau évite de retraiter (et toute boucle d'observation).
export function applyEdits(root) {
  root.querySelectorAll('[data-eid]').forEach((el) => {
    if (el.__edApplied) return;
    el.__edApplied = true;
    const sc = scopeOf(el);
    if (!sc) return;
    const v = Edits.get(sc.type, sc.slug, el.dataset.eid);
    if (v != null) setContent(el, v);
  });
}

// ----------------------------------------------------------------------- //
// Interface : bouton flottant + fenêtre d'édition (construits une seule fois)
// ----------------------------------------------------------------------- //
let modal, ta, current = null, currentRoot = null;

// Pile d'annulation de la saisie en cours (« Ctrl+Z » du champ d'édition),
// regroupée par courtes pauses de frappe ; remise à zéro à chaque ouverture.
const UNDO_GROUP_MS = 400;
let undoStack = [], undoPrev = '', undoOpen = '', undoTimer = null;

function buildChrome() {
  if (document.getElementById('ed-fab')) return;

  const tools = document.createElement('div');
  tools.className = 'ed-tools';
  tools.hidden = true;

  const resetBtn = document.createElement('button');
  resetBtn.id = 'ed-reset-all';
  resetBtn.type = 'button';
  resetBtn.className = 'ed-resetall';
  resetBtn.hidden = true;
  resetBtn.textContent = '↺ Tout réinitialiser';
  resetBtn.addEventListener('click', resetAllEdits);

  const fab = document.createElement('button');
  fab.id = 'ed-fab';
  fab.type = 'button';
  fab.className = 'ed-fab';
  fab.setAttribute('aria-pressed', 'false');
  fab.innerHTML = '<span class="ed-fab-ico" aria-hidden="true">✏️</span><span class="ed-fab-lbl">Modifier le texte</span>';
  fab.addEventListener('click', toggleMode);

  tools.append(resetBtn, fab);
  document.body.appendChild(tools);

  modal = document.createElement('div');
  modal.className = 'ed-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="ed-backdrop" data-close="1"></div>
    <div class="ed-panel" role="dialog" aria-modal="true" aria-label="Modifier le texte">
      <div class="ed-panel-head">Modifier le texte</div>
      <textarea class="ed-ta" rows="5" aria-label="Texte à modifier"></textarea>
      <p class="ed-tip">Mise en forme&nbsp;: <code>**gras**</code>, <code>*italique*</code>. <kbd>Ctrl</kbd>+<kbd>Entrée</kbd> pour enregistrer, <kbd>Échap</kbd> pour fermer.</p>
      <div class="ed-actions">
        <button type="button" class="btn btn-ghost ed-undo" disabled>↶ Annuler la saisie</button>
        <button type="button" class="btn btn-ghost ed-reset">↺ Texte d'origine</button>
        <span class="ed-spacer"></span>
        <button type="button" class="btn btn-ghost" data-close="1">Fermer</button>
        <button type="button" class="btn btn-primary ed-save">Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  ta = modal.querySelector('.ed-ta');
  modal.querySelector('.ed-save').addEventListener('click', save);
  modal.querySelector('.ed-reset').addEventListener('click', resetOne);
  modal.querySelector('.ed-undo').addEventListener('click', undoTyping);
  modal.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  ta.addEventListener('input', () => {
    clearTimeout(undoTimer);
    undoTimer = setTimeout(snapshotUndo, UNDO_GROUP_MS);
    updateUndoBtn();
  });
  ta.addEventListener('keydown', (e) => {
    // Isole la saisie des raccourcis clavier des pages (ex. 1–6 / Entrée du QCM).
    e.stopPropagation();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
}

function toggleMode() {
  const on = document.body.classList.toggle('ed-on');
  const fab = document.getElementById('ed-fab');
  fab.setAttribute('aria-pressed', String(on));
  fab.classList.toggle('on', on);
  fab.querySelector('.ed-fab-ico').textContent = on ? '✓' : '✏️';
  fab.querySelector('.ed-fab-lbl').textContent = on ? 'Terminer' : 'Modifier le texte';
  updateTools();
}

// Le bouton « Tout réinitialiser » n'est utile qu'en mode édition, s'il existe
// au moins une retouche à annuler.
function updateTools() {
  const btn = document.getElementById('ed-reset-all');
  if (btn) btn.hidden = !(document.body.classList.contains('ed-on') && Edits.any());
}

function resetAllEdits() {
  if (!confirm("Réinitialiser tous les textes que vous avez modifiés, dans toute l'application ? Cette action est définitive.")) return;
  Edits.clearAll();
  if (currentRoot) currentRoot.querySelectorAll('[data-eid]').forEach((el) => setContent(el, el.dataset.raw || ''));
  updateTools();
}

// Fige la frappe en cours comme une étape annulable (regroupée par pauses).
function snapshotUndo() {
  if (ta.value !== undoPrev) {
    undoStack.push(undoPrev);
    if (undoStack.length > 100) undoStack.shift();
    undoPrev = ta.value;
  }
}

// Recule d'un cran dans la saisie, sans fermer la fenêtre (« Ctrl+Z »).
function undoTyping() {
  clearTimeout(undoTimer);
  snapshotUndo();
  if (undoStack.length) {
    const target = undoStack.pop();
    ta.value = target;
    undoPrev = target;
  }
  updateUndoBtn();
  ta.focus();
}

// Désactivé tant que la saisie n'a pas bougé depuis l'ouverture de la fenêtre.
function updateUndoBtn() {
  const btn = modal && modal.querySelector('.ed-undo');
  if (btn) btn.disabled = (ta.value === undoOpen);
}

function openModal(el) {
  const sc = scopeOf(el);
  if (!sc) return;
  current = el;
  const stored = Edits.get(sc.type, sc.slug, el.dataset.eid);
  ta.value = stored != null ? stored : (el.dataset.raw || '');
  undoStack = [];
  undoPrev = ta.value;
  undoOpen = ta.value;
  updateUndoBtn();
  modal.querySelector('.ed-reset').style.display = stored != null ? '' : 'none';
  modal.hidden = false;
  requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); });
}

function save() {
  if (!current) return;
  const sc = scopeOf(current);
  if (!sc) { close(); return; }
  const v = ta.value;
  if (v === (current.dataset.raw || '')) Edits.remove(sc.type, sc.slug, current.dataset.eid);
  else Edits.set(sc.type, sc.slug, current.dataset.eid, v);
  setContent(current, v);
  close();
}

function resetOne() {
  if (!current) return;
  const sc = scopeOf(current);
  if (sc) Edits.remove(sc.type, sc.slug, current.dataset.eid);
  setContent(current, current.dataset.raw || '');
  close();
}

function close() {
  if (modal) modal.hidden = true;
  current = null;
  clearTimeout(undoTimer);
  updateTools(); // une retouche vient peut-être d'apparaître ou de disparaître
}

// Les boutons n'apparaissent que si la page contient du texte modifiable.
function refreshFab(root) {
  const tools = document.querySelector('.ed-tools');
  if (tools) tools.hidden = !root.querySelector('[data-eid]');
}

// ----------------------------------------------------------------------- //
// Point d'entrée : à appeler une fois par page, avec le conteneur principal.
// ----------------------------------------------------------------------- //
export function initEditor(root) {
  if (!root || root.__editInit) return;
  root.__editInit = true;
  currentRoot = root;

  buildChrome();
  applyEdits(root);
  refreshFab(root);
  updateTools();

  // Réapplique aux contenus injectés après coup (changement de question…).
  const obs = new MutationObserver(() => { applyEdits(root); refreshFab(root); });
  obs.observe(root, { childList: true, subtree: true });

  // Capture pour devancer les comportements natifs (cocher une option de QCM).
  root.addEventListener('click', (e) => {
    if (!document.body.classList.contains('ed-on')) return;
    const el = e.target.closest('[data-eid]');
    if (!el || !root.contains(el)) return;
    e.preventDefault();
    e.stopPropagation();
    openModal(el);
  }, true);
}

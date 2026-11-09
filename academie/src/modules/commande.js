/**
 * Commande en ligne : livraison par les livreurs du restaurant ou cueillette, paiement à la réception.
 * Réglages dans src/config.js (COMMANDE) ; calculs dans panier.js ; envoi par courriel via envoi.js.
 *
 * Aussi : boutons vers Uber Eats / DoorDash / SkipTheDishes si des liens sont remplis (RESTAURANT.livraison).
 */
import { RESTAURANT, COMMANDE } from '../config.js';
import { escapeHtml, platsParId } from './data.js';
import { radioGroup, setChecked } from './accord.js';
import { sendForm } from './envoi.js';
import {
  commandeActive,
  formats,
  sansGlutenPossible,
  ajouter,
  changerQte,
  vider,
  lignesPanier,
  nbArticles,
  prixLigne,
  totaux,
  creneaux,
  heureLisible,
  argent,
  surChangement,
  secteurDe,
  normaliserCodePostal,
} from './panier.js';

export const PLATEFORMES = [
  { id: 'uberEats', nom: 'Uber Eats' },
  { id: 'doorDash', nom: 'DoorDash' },
  { id: 'skipTheDishes', nom: 'SkipTheDishes' },
];

/** Liens https valides seulement. */
export function liensLivraison() {
  const l = RESTAURANT.livraison || {};
  return PLATEFORMES.map((p) => ({ ...p, url: (l[p.id] || '').trim() })).filter((p) => /^https:\/\//.test(p.url));
}

const JOUR = new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>';
const CLOSE = '<span aria-hidden="true">✕</span>';
const chip = (value, label, on) =>
  `<button type="button" class="chip chip--sm" role="radio" aria-checked="${on}" data-value="${escapeHtml(value)}">${escapeHtml(
    label
  )}</button>`;

let lenisRef = null;
const ouvrir = (d) => {
  lenisRef?.stop();
  document.documentElement.classList.add('has-modal');
  d.showModal();
};
const surFermeture = (d) => {
  d.addEventListener('close', () => {
    if (!document.querySelector('dialog[open]')) {
      lenisRef?.start();
      document.documentElement.classList.remove('has-modal');
    }
  });
  d.addEventListener('click', (e) => e.target === d && d.close());
};

export function initCommande({ lenis } = {}) {
  lenisRef = lenis ?? null;
  const section = document.querySelector('#commander');
  const liens = liensLivraison();
  const actif = commandeActive();
  if (!section || (!liens.length && !actif)) return;
  section.hidden = false;
  document.querySelectorAll('[data-if-order]').forEach((el) => (el.hidden = false));

  // ---------- Section « L'Académie chez vous » ----------
  if (actif) {
    section.querySelector('.order__lead').textContent =
      'Commandez en ligne : livraison par nos livreurs partout à Gatineau, ou cueillette au restaurant. Vous payez à la réception, comptant ou par carte.';
  }
  section.querySelector('[data-order-links]').innerHTML =
    (actif
      ? `<li class="order__item--main"><a class="order__btn" href="#menu" data-cursor>
          <span class="order__name">Commander en ligne</span>
          <span class="order__cta">Choisir mes plats ${ARROW}</span>
        </a></li>
        <li class="order__facts">
          <span>Frais de livraison calculés selon votre adresse</span>
          <span>Minimum ${argent(COMMANDE.minimumLivraison)} en livraison</span>
          <span>Paiement à la réception</span>
        </li>`
      : '') +
    liens
      .map(
        (p) => `<li><a class="order__btn" href="${escapeHtml(p.url)}" target="_blank" rel="noopener" data-cursor
        aria-label="Commander sur ${escapeHtml(p.nom)} (nouvel onglet)">
        <span class="order__name">${escapeHtml(p.nom)}</span>
        <span class="order__cta">Commander ${ARROW}</span>
      </a></li>`
      )
      .join('');
  if (!actif) return;

  // ---------- Message de confirmation ----------
  const toast = document.createElement('p');
  toast.className = 'cmd-toast';
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  let toastT;
  const signaler = (nom) => {
    toast.textContent = `« ${nom} » ajouté à votre commande`;
    toast.classList.add('is-visible');
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove('is-visible'), 2200);
    [head, fab].forEach((el) => {
      el.classList.remove('is-bump');
      void el.offsetWidth;
      el.classList.add('is-bump');
    });
  };

  /*
   * Chariot qui se remplit : le panier doré monte d'un cran à chaque article (plein à 4 articles).
   * Dans l'en-tête, et en petit chariot fixe en bas à droite de l'écran.
   */
  const chariot = (uid) => `<svg class="cart-ico" viewBox="0 0 24 24" aria-hidden="true">
      <defs><clipPath id="cart-clip-${uid}"><path d="M6.4 7h13.4l-1.5 7.4a1 1 0 0 1-1 .8H8.2a1 1 0 0 1-1-.8Z" /></clipPath></defs>
      <rect class="cart-ico__fill" x="5" y="6.5" width="16" height="9" clip-path="url(#cart-clip-${uid})" />
      <path class="cart-ico__line" d="M2.5 3.5h2.3l2.4 11a1 1 0 0 0 1 .8h9.1a1 1 0 0 0 1-.8L19.8 7H6.4" />
      <circle class="cart-ico__line" cx="9.5" cy="19.5" r="1.4" /><circle class="cart-ico__line" cx="16.5" cy="19.5" r="1.4" />
    </svg>`;

  // ---------- Bouton « Commander » dans l'en-tête (toujours visible) ----------
  const head = document.createElement('a');
  head.href = '#menu';
  head.className = 'header__order';
  head.setAttribute('data-cursor', '');
  head.innerHTML = `${chariot('h')}
    <span class="header__order-label">Commander</span><span class="header__order-count" data-head-count hidden>0</span>`;
  head.setAttribute('aria-label', 'Commander en ligne (livraison ou cueillette)');
  document.querySelector('.header__actions')?.prepend(head);

  // Petit chariot en bas à droite : visible dès que la commande contient quelque chose
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'cart-fab';
  fab.setAttribute('aria-haspopup', 'dialog');
  fab.innerHTML = `${chariot('f')}<span class="header__order-count" data-fab-count hidden>0</span>`;
  document.body.appendChild(fab);
  fab.addEventListener('click', () => ouvrirPanier());
  // Panier non vide : ouvre la commande ; sinon : amène à la carte (lien #menu)
  head.addEventListener('click', (e) => {
    if (nbArticles() > 0) {
      e.preventDefault();
      e.stopPropagation();
      ouvrirPanier();
    }
  }, true);

  // ---------- Fenêtre « Ajouter » (format, sans gluten) ----------
  const add = document.createElement('dialog');
  add.className = 'cmd-modal cmd-modal--add';
  add.setAttribute('data-lenis-prevent', '');
  add.setAttribute('aria-labelledby', 'cmd-add-title');
  document.body.appendChild(add);
  surFermeture(add);

  const demanderFormat = (id) => {
    const p = platsParId.get(id);
    const f = formats(p?.prix);
    if (!p || !f) return;
    const sg = sansGlutenPossible(id);
    if (f.length === 1 && !sg) {
      ajouter({ id, nom: p.nom, format: '', prix: f[0].prix });
      signaler(p.nom);
      return;
    }
    let choix = f[0];
    let gluten = false;
    add.innerHTML = `
      <div class="cmd-modal__bar">
        <p class="cmd-modal__title" id="cmd-add-title">${escapeHtml(p.nom)}</p>
        <button type="button" class="libro-modal__close" data-close aria-label="Fermer">${CLOSE}</button>
      </div>
      <div class="cmd-add">
        ${
          f.length > 1
            ? `<p class="rform__label" id="cmd-fmt">Format</p>
               <div class="qform__chips" role="radiogroup" aria-labelledby="cmd-fmt" data-fmt>
                 ${f.map((x, i) => chip(i, `${x.label} · ${argent(x.prix)}`, i === 0)).join('')}
               </div>`
            : ''
        }
        ${
          sg
            ? `<label class="cmd-check"><input type="checkbox" data-sg /> <span>Option sans gluten (+${argent(
                COMMANDE.sansGluten.supplement
              )})</span></label>`
            : ''
        }
        <button type="button" class="btn btn--gold btn--wide" data-confirm><span class="btn__label">Ajouter · <b data-prix>${argent(
          choix.prix
        )}</b></span></button>
      </div>`;
    const maj = () =>
      (add.querySelector('[data-prix]').textContent = argent(choix.prix + (gluten ? COMMANDE.sansGluten.supplement : 0)));
    const fmt = add.querySelector('[data-fmt]');
    if (fmt)
      radioGroup(fmt, (v) => {
        choix = f[Number(v)];
        setChecked(fmt, v);
        maj();
      });
    add.querySelector('[data-sg]')?.addEventListener('change', (e) => {
      gluten = e.target.checked;
      maj();
    });
    add.querySelector('[data-close]').addEventListener('click', () => add.close());
    add.querySelector('[data-confirm]').addEventListener('click', () => {
      ajouter({ id, nom: p.nom, format: f.length > 1 ? choix.label : '', prix: choix.prix, sansGluten: gluten });
      add.close();
      signaler(p.nom);
    });
    ouvrir(add);
    add.querySelector('[data-confirm]').focus();
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (b) demanderFormat(b.dataset.add);
    if (e.target.closest('[data-voir]')) ouvrirPanier();
    const m = e.target.closest('[data-moins]');
    if (m) {
      // Retire le dernier article ajouté de ce plat
      const l = [...lignesPanier()].reverse().find((x) => x.id === m.dataset.moins);
      if (l) changerQte(l.key, -1);
    }
  });

  // ---------- Quantité affichée directement sur les plats de la carte ----------
  const majPlats = (root = document) => {
    root.querySelectorAll('[data-order]').forEach((el) => {
      const id = el.dataset.order;
      const nom = platsParId.get(id)?.nom ?? '';
      const q = lignesPanier().filter((l) => l.id === id).reduce((n, l) => n + l.qte, 0);
      const html = q
        ? `<div class="dish__qty" role="group" aria-label="Quantité de « ${escapeHtml(nom)} » dans votre commande">
            <button type="button" data-moins="${escapeHtml(id)}" aria-label="Retirer un « ${escapeHtml(nom)} »">−</button>
            <span aria-live="polite">${q}</span>
            <button type="button" data-add="${escapeHtml(id)}" aria-label="Ajouter un « ${escapeHtml(nom)} »">+</button>
          </div><button type="button" class="dish__inorder" data-voir aria-haspopup="dialog">Voir ma commande</button>`
        : `<button type="button" class="dish__add" data-add="${escapeHtml(id)}" aria-label="Ajouter « ${escapeHtml(nom)} » à ma commande" data-cursor>
            <span aria-hidden="true">+</span> Commander</button>`;
      if (el.dataset.q !== String(q)) {
        el.dataset.q = String(q);
        el.innerHTML = html;
      }
    });
  };
  const grille = document.querySelector('.menu__grid');
  if (grille) new MutationObserver(() => majPlats(grille)).observe(grille, { childList: true });

  // ---------- Fenêtre du panier ----------
  const cart = document.createElement('dialog');
  cart.className = 'cmd-modal cmd-modal--cart';
  // Défilement natif dans la fenêtre (le défilement doux de la page ne l'intercepte pas)
  cart.setAttribute('data-lenis-prevent', '');
  cart.setAttribute('aria-labelledby', 'cmd-title');
  document.body.appendChild(cart);
  surFermeture(cart);

  const etat = { mode: COMMANDE.modes[0], secteur: null, paiement: COMMANDE.paiements[0], heure: '' };
  let fenetre = creneaux();
  const libMode = (m) => (m === 'livraison' ? 'Livraison' : 'Cueillette au restaurant');

  cart.innerHTML = `
    <div class="cmd-modal__bar">
      <p class="cmd-modal__title" id="cmd-title">Ma commande</p>
      <button type="button" class="libro-modal__close" data-close aria-label="Fermer la commande">${CLOSE}</button>
    </div>
    <div class="cmd-body">
      <div class="cmd-empty" data-empty>
        <p>Votre commande est vide.</p>
        <a href="#menu" class="link-arrow" data-close>Voir la carte ${ARROW}</a>
      </div>
      <form class="cmd-form" novalidate data-form>
        <ul class="cmd-lines" data-lines></ul>

        <div class="cmd-block">
          <p class="rform__label" id="cmd-mode">Mode</p>
          <div class="qform__chips" role="radiogroup" aria-labelledby="cmd-mode" data-mode>
            ${COMMANDE.modes.map((m) => chip(m, libMode(m), m === etat.mode)).join('')}
          </div>
        </div>

        <div class="cmd-block" data-livraison>
          <p class="rform__label">Adresse de livraison · Gatineau</p>
          <div class="rform__row cmd-adresse">
            <div class="field">
              <input class="field__input" id="c-adresse" name="adresse" type="text" autocomplete="street-address" placeholder=" " />
              <label class="field__label" for="c-adresse">Numéro, rue et appartement</label>
              <p class="field__error" id="c-adresse-err"></p>
            </div>
            <div class="field">
              <input class="field__input" id="c-codePostal" name="codePostal" type="text" autocomplete="postal-code" autocapitalize="characters" maxlength="7" placeholder=" " />
              <label class="field__label" for="c-codePostal">Code postal</label>
              <p class="field__error" id="c-codePostal-err"></p>
            </div>
          </div>
        </div>

        <div class="cmd-block">
          <p class="rform__label" id="cmd-heure">Heure souhaitée <span data-jour></span></p>
          <div class="qform__chips" role="radiogroup" aria-labelledby="cmd-heure" data-heure></div>
          <div class="cmd-time" data-perso hidden>
            <button type="button" class="cmd-time__btn" data-tstep="-1" aria-label="15 minutes plus tôt">‹</button>
            <output class="cmd-time__val" data-heure-val aria-live="polite"></output>
            <button type="button" class="cmd-time__btn" data-tstep="1" aria-label="15 minutes plus tard">›</button>
          </div>
        </div>

        <div class="cmd-block">
          <div class="rform__row rform__row--2">
            <div class="field">
              <input class="field__input" id="c-nom" name="nom" type="text" autocomplete="name" placeholder=" " required />
              <label class="field__label" for="c-nom">Nom complet</label>
              <p class="field__error" id="c-nom-err"></p>
            </div>
            <div class="field">
              <input class="field__input" id="c-telephone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" placeholder=" " required />
              <label class="field__label" for="c-telephone">Téléphone</label>
              <p class="field__error" id="c-telephone-err"></p>
            </div>
          </div>
          <div class="field">
            <input class="field__input" id="c-courriel" name="courriel" type="email" autocomplete="email" placeholder=" " />
            <label class="field__label" for="c-courriel">Courriel (facultatif, pour recevoir le récapitulatif)</label>
            <p class="field__error" id="c-courriel-err"></p>
          </div>
        </div>

        <div class="cmd-block">
          <p class="rform__label" id="cmd-paiement">Paiement à la réception</p>
          <div class="qform__chips" role="radiogroup" aria-labelledby="cmd-paiement" data-paiement>
            ${COMMANDE.paiements.map((v) => chip(v, v, v === etat.paiement)).join('')}
          </div>
        </div>

        <div class="field field--area">
          <textarea class="field__input" id="c-notes" name="notes" rows="2" placeholder=" "></textarea>
          <label class="field__label" for="c-notes">Instructions (code de porte, sonnette…)</label>
        </div>
        <div class="hp" aria-hidden="true"><label for="c-site">Ne pas remplir</label><input id="c-site" name="_gotcha" type="text" tabindex="-1" autocomplete="off" /></div>

        <dl class="cmd-totals" data-totals></dl>
        <p class="cmd-warn" data-warn role="status"></p>
        <button type="submit" class="btn btn--gold btn--wide" data-submit><span class="btn__label">Envoyer ma commande</span></button>
        <p class="rform__status" aria-live="polite" data-status></p>
        <p class="cmd-legal">
          Total estimé, taxes incluses : nous vous appelons pour confirmer la commande et l'heure. Allergie ? Dites-le-nous à ce moment.
          Vos coordonnées servent uniquement à préparer et livrer votre commande ; elles sont transmises par un service d'envoi
          de formulaires dont les serveurs peuvent être situés hors du Québec.
          <a href="/politique-confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité</a>
        </p>
      </form>
      <div class="cmd-done" data-done hidden tabindex="-1">
        <p class="cmd-done__title">Merci, <span data-done-nom></span> !</p>
        <p data-done-texte></p>
        <button type="button" class="btn btn--gold" data-close><span class="btn__label">Fermer</span></button>
      </div>
    </div>`;

  const $ = (s) => cart.querySelector(s);
  const form = $('[data-form]');
  const done = $('[data-done]');
  cart.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => cart.close()));

  const choisir = (sel, key) =>
    radioGroup($(sel), (v) => {
      etat[key] = v;
      setChecked($(sel), v);
      rendre();
    });
  choisir('[data-mode]', 'mode');

  // Code postal → secteur → frais de livraison (calculés automatiquement, sans service externe)
  const cp = () => form.elements.codePostal;
  const majSecteur = () => {
    etat.secteur = secteurDe(cp().value);
    rendre();
  };
  choisir('[data-paiement]', 'paiement');
  radioGroup($('[data-heure]'), (v) => {
    etat.quand = v;
    rendreHeures();
  });
  cart.querySelectorAll("[data-tstep]").forEach((b) =>
    b.addEventListener('click', () => {
      const l = fenetre.creneaux;
      const i = Math.max(0, l.indexOf(etat.heure)) + Number(b.dataset.tstep);
      etat.heure = l[Math.min(l.length - 1, Math.max(0, i))];
      rendreHeures();
    })
  );

  /*
   * Heure : « Dès que possible » ou « Choisir l'heure » (de 11 h 30 à 21 h, par tranches de 15 min,
   * au plus tôt dans le délai de préparation). Après la fermeture, la commande est pour le lendemain.
   */
  const rendreHeures = () => {
    fenetre = creneaux();
    const l = fenetre.creneaux;
    if (!fenetre.desQuePossible) etat.quand = 'perso';
    etat.quand ??= 'asap';
    if (!l.includes(etat.heure)) etat.heure = l.find((h) => h >= '18:00') ?? l[0] ?? '';
    $('[data-jour]').textContent = fenetre.jour === 'demain' ? `· demain, ${JOUR.format(fenetre.date)}` : "· aujourd'hui";
    $('[data-heure]').innerHTML =
      (fenetre.desQuePossible ? chip('asap', `Dès que possible (~${COMMANDE.delaiMinutes} min)`, etat.quand === 'asap') : '') +
      chip('perso', "Choisir l'heure", etat.quand === 'perso');
    $('[data-perso]').hidden = etat.quand !== 'perso';
    $('[data-heure-val]').textContent = heureLisible(etat.heure);
    const i = l.indexOf(etat.heure);
    $("[data-tstep=\"-1\"]").disabled = i <= 0;
    $("[data-tstep=\"1\"]").disabled = i >= l.length - 1;
  };

  function rendre() {
    const n = nbArticles();
    const fini = !done.hidden;
    $('[data-empty]').hidden = n > 0 || fini;
    form.hidden = n === 0 || fini;
    $('[data-livraison]').hidden = etat.mode !== 'livraison';
    $('[data-lines]').innerHTML = lignesPanier()
      .map(
        (l) => `<li class="cmd-line">
          <div class="cmd-line__info">
            <p class="cmd-line__nom">${escapeHtml(l.nom)}</p>
            ${
              l.format || l.sansGluten
                ? `<p class="cmd-line__opt">${escapeHtml([l.format, l.sansGluten ? 'sans gluten' : ''].filter(Boolean).join(' · '))}</p>`
                : ''
            }
          </div>
          <div class="cmd-qty">
            <button type="button" data-qty="-1" data-key="${escapeHtml(l.key)}" aria-label="Retirer un « ${escapeHtml(l.nom)} »">−</button>
            <span>${l.qte}</span>
            <button type="button" data-qty="1" data-key="${escapeHtml(l.key)}" aria-label="Ajouter un « ${escapeHtml(l.nom)} »">+</button>
          </div>
          <p class="cmd-line__prix">${argent(prixLigne(l))}</p>
        </li>`
      )
      .join('');
    const t = totaux({ mode: etat.mode, secteur: etat.secteur, jour: fenetre.date.getDay() });
    const codeComplet = !!normaliserCodePostal(form.elements.codePostal.value);
    const horsZone = etat.mode === 'livraison' && codeComplet && !etat.secteur;
    const fraisTexte = etat.secteur ? argent(t.frais) : horsZone ? '—' : 'selon votre code postal';
    $('[data-totals]').innerHTML = [
      ['Sous-total', argent(t.sousTotal)],
      ...t.rabais.map((r) => [r.libelle, `− ${argent(r.montant)}`]),
      ...(etat.mode === 'livraison' ? [['Frais de livraison', fraisTexte]] : []),
      ...t.taxes.map((x) => [x.nom, argent(x.montant)]),
      [etat.mode === 'livraison' && !etat.secteur ? 'Total estimé (avant livraison)' : 'Total estimé', argent(t.total)],
    ]
      .map(([k, v], i, a) => `<div${i === a.length - 1 ? ' class="is-total"' : ''}><dt>${escapeHtml(k)}</dt><dd>${v}</dd></div>`)
      .join('');
    $('[data-warn]').textContent = horsZone
      ? `Désolés, nous ne livrons pas encore à ce code postal. Choisissez la cueillette au restaurant ou appelez-nous au ${RESTAURANT.telephone}.`
      : t.manque
        ? `Minimum de ${argent(COMMANDE.minimumLivraison)} pour la livraison : il manque ${argent(t.manque)}. Vous pouvez aussi choisir la cueillette.`
        : '';
    $('[data-submit]').disabled = !!t.manque || horsZone || n === 0;
    for (const el of [head.querySelector('[data-head-count]'), fab.querySelector('[data-fab-count]')]) {
      el.textContent = n;
      el.hidden = n === 0;
    }
    const remplissage = String(Math.min(n, 4) / 4);
    head.style.setProperty('--fill', remplissage);
    fab.style.setProperty('--fill', remplissage);
    fab.classList.toggle('has-items', n > 0);
    fab.setAttribute('aria-label', `Ma commande : ${n} article${n > 1 ? 's' : ''}`);
    head.setAttribute('aria-label', n ? `Ma commande : ${n} article${n > 1 ? 's' : ''}` : 'Commander en ligne (livraison ou cueillette)');
    majPlats();
    return t;
  }

  $('[data-lines]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-qty]');
    if (b) changerQte(b.dataset.key, Number(b.dataset.qty));
  });
  surChangement(rendre);

  function ouvrirPanier() {
    done.hidden = true;
    rendreHeures();
    rendre();
    ouvrir(cart);
    $('[data-close]').focus();
  }

  cp().addEventListener('input', majSecteur);
  cp().addEventListener('blur', () => {
    const c = normaliserCodePostal(cp().value);
    if (c) cp().value = c;
  });

  // Téléphone (même format que les autres formulaires)
  const tel = form.elements.telephone;
  tel.addEventListener('input', () => {
    const d = tel.value.replace(/\D/g, '').replace(/^1(?=\d{10})/, '').slice(0, 10);
    tel.value = d.length > 6 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : d;
  });

  const regles = {
    nom: (v) => (v.trim().length >= 2 ? '' : 'Indiquez votre nom.'),
    telephone: (v) => (v.replace(/\D/g, '').length === 10 ? '' : 'Entrez un numéro à 10 chiffres.'),
    courriel: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Adresse courriel invalide.'),
    adresse: (v) => (etat.mode !== 'livraison' || v.trim().length >= 6 ? '' : "Indiquez l'adresse de livraison."),
    codePostal: (v) =>
      etat.mode !== 'livraison'
        ? ''
        : !normaliserCodePostal(v)
          ? 'Entrez un code postal valide (ex. J8T 8A4).'
          : secteurDe(v)
            ? ''
            : 'Hors de notre zone de livraison.',
  };
  const valider = (name) => {
    const input = form.elements[name];
    const msg = regles[name](input.value);
    const err = cart.querySelector(`#c-${name}-err`);
    if (err) err.textContent = msg;
    input.closest('.field')?.classList.toggle('is-invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };
  Object.keys(regles).forEach((n) => form.elements[n].addEventListener('blur', () => form.elements[n].value && valider(n)));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = $('[data-status]');
    if (form.elements._gotcha.value) return;
    rendreHeures();
    const invalides = Object.keys(regles).filter((n) => !valider(n));
    if (invalides.length) {
      form.elements[invalides[0]].focus();
      status.textContent = 'Quelques détails à compléter.';
      status.classList.add('is-error');
      return;
    }
    const t = rendre();
    if (t.manque || !nbArticles() || (etat.mode === 'livraison' && !etat.secteur)) return;

    const quand =
      etat.quand === 'asap'
        ? 'Dès que possible'
        : `${fenetre.jour === 'demain' ? `Demain (${JOUR.format(fenetre.date)})` : "Aujourd'hui"} à ${heureLisible(etat.heure)}`;
    const lignes = lignesPanier()
      .map((l) => `${l.qte} × ${l.nom}${l.format ? ` (${l.format})` : ''}${l.sansGluten ? ' — sans gluten' : ''} : ${argent(prixLigne(l))}`)
      .join('\n');
    const nom = form.elements.nom.value.trim();
    const mode = etat.mode === 'livraison' ? `Livraison — secteur ${etat.secteur.nom}` : 'Cueillette au restaurant';
    const data = {
      type_demande: `Commande — ${etat.mode === 'livraison' ? 'Livraison' : 'Cueillette'}`,
      nom,
      telephone: tel.value.trim(),
      mode,
      adresse:
        etat.mode === 'livraison'
          ? `${form.elements.adresse.value.trim()}, Gatineau (Québec) ${normaliserCodePostal(cp().value)}`
          : '—',
      heure: quand,
      paiement: etat.paiement,
      commande: lignes,
      sous_total: argent(t.sousTotal),
      rabais: t.rabais.map((r) => `${r.libelle} : − ${argent(r.montant)}`).join(' ; ') || '—',
      frais_livraison: etat.mode === 'livraison' ? argent(t.frais) : '—',
      taxes: t.taxes.map((x) => `${x.nom} ${argent(x.montant)}`).join(' ; '),
      total_estime: argent(t.total),
      instructions: form.elements.notes.value.trim() || '—',
      _subject: `COMMANDE ${etat.mode === 'livraison' ? 'LIVRAISON' : 'CUEILLETTE'} — ${quand} — ${argent(t.total)} — ${nom} ${tel.value.trim()}`,
    };
    const courriel = form.elements.courriel.value.trim();
    if (courriel) data.courriel = courriel;

    const submit = $('[data-submit]');
    submit.classList.add('is-loading');
    submit.disabled = true;
    status.classList.remove('is-error');
    status.textContent = 'Envoi en cours…';
    try {
      await sendForm(data, { formspreeId: COMMANDE.formspreeId });
      status.textContent = '';
      $('[data-done-nom]').textContent = nom.split(' ')[0];
      $('[data-done-texte]').textContent = `Votre commande (${argent(t.total)}, ${mode.charAt(0).toLowerCase()}${mode.slice(1)}, ${quand.charAt(0).toLowerCase()}${quand.slice(
        1
      )}) est envoyée. Nous vous appelons au ${data.telephone} pour la confirmer. Paiement à la réception : ${etat.paiement.toLowerCase()}.`;
      done.hidden = false;
      form.reset();
      etat.secteur = null;
      vider();
      done.focus();
    } catch (err) {
      console.error(err);
      status.classList.add('is-error');
      status.textContent = `Oups, l'envoi n'a pas fonctionné. Réessayez ou appelez-nous au ${RESTAURANT.telephone}.`;
    } finally {
      submit.classList.remove('is-loading');
      rendre();
    }
  });

  rendreHeures();
  rendre();
}

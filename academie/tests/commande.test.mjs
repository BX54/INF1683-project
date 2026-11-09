/**
 * Tests de la commande en ligne : npm test
 * (règles de prix partagées + fonction serveur, sans réseau)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerCalcul, heureRestaurant } from '../src/commande/calcul.js';
import { COMMANDE } from '../src/config.js';
import menu from '../src/data/menu.json' with { type: 'json' };
import handler, { preparer, _definirRegistre } from '../netlify/functions/commande.mjs';

// Tests : registre en mémoire autorisé (en production, il ne l'est jamais)
process.env.COMMANDE_REGISTRE_MEMOIRE = '1';
const calc = creerCalcul({ menu, commande: COMMANDE });
// Mardi 10 novembre 2026, 14 h à Gatineau (19 h UTC)
const MARDI_14H = new Date('2026-11-10T19:00:00Z');

// Un créneau réellement proposé en ce moment (pour les tests de la fonction, qui utilisent l'heure réelle)
const offert = () => {
  const f = calc.creneaux(new Date());
  return { type: 'heure', date: f.date, heure: f.creneaux.at(-1) };
};

const base = (extra = {}) => ({
  commande_id: 'TEST01',
  mode: 'livraison',
  adresse: '25, rue Test',
  codePostal: 'j8t8a4',
  quand: { type: 'heure', date: '2026-11-10', heure: '18:30' },
  nom: 'Test Audit',
  telephone: '819 555-0100',
  paiement: COMMANDE.paiements[0],
  lignes: [{ id: 'saumon-fume', format: '', sansGluten: false, qte: 2 }],
  ...extra,
});

test('heure de Gatineau, quel que soit le fuseau', () => {
  // 01 h 30 UTC le 10 nov. = 20 h 30 le 9 nov. à Gatineau
  assert.deepEqual(heureRestaurant(new Date('2026-11-10T01:30:00Z')), { date: '2026-11-09', minutes: 20 * 60 + 30 });
});

test('créneaux : après la dernière heure, on passe au lendemain', () => {
  const f = calc.creneaux(new Date('2026-11-10T01:30:00Z')); // 20 h 30 à Gatineau
  assert.equal(f.date, '2026-11-10');
  assert.equal(f.jour, 'demain');
  assert.equal(f.creneaux[0], COMMANDE.heures.debut);
  assert.equal(f.desQuePossible, false);
});

test('le total est recalculé par le serveur (un total envoyé est ignoré)', () => {
  const p = preparer(base({ total_estime: '0,01 $', lignes: [{ id: 'saumon-fume', format: '', qte: 2, prix: 0.01 }] }), { maintenant: MARDI_14H });
  assert.equal(p.status, 200);
  // 2 × 15 $ + 5,99 $ (Gatineau) = 35,99 $ ; TPS 1,80 ; TVQ 3,59 → 41,38 $
  assert.equal(p.message.total_estime, '41,38 $');
  assert.match(p.message._subject, /^COMMANDE LIVRAISON .* 41,38 \$ — n° TEST01$/);
  assert.doesNotMatch(p.message._subject, /Test Audit|555/); // ni nom ni téléphone dans le sujet
});

test('spécial pâtes classiques le mardi, minimum après rabais', () => {
  const p = preparer(base({ lignes: [{ id: 'spaghetti-bolognese', format: '', qte: 2 }] }), { maintenant: MARDI_14H });
  assert.equal(p.status, 200);
  assert.match(p.message.rabais, /− 6 \$/);
});

test('refus : plat inconnu, format inventé, quantité, hors zone, créneau passé, prix du marché', () => {
  const cas = [
    base({ lignes: [{ id: 'plat-invente', qte: 1 }] }),
    base({ lignes: [{ id: 'escargots-a-l-ail', format: 'Géant', qte: 1 }] }),
    base({ lignes: [{ id: 'saumon-fume', qte: 99 }] }),
    base({ codePostal: 'K1A 0B1' }),
    base({ quand: { type: 'heure', date: '2026-11-10', heure: '12:00' } }),
    base({ quand: { type: 'heure', date: '2026-11-10', heure: '18:20' } }),
    base({ lignes: [{ id: 'filet-mignon', qte: 1 }] }),
  ];
  for (const c of cas) assert.notEqual(preparer(c, { maintenant: MARDI_14H }).status, 200, JSON.stringify(c.lignes ?? c.quand ?? c.codePostal));
});

test('minimum de livraison', () => {
  const p = preparer(base({ lignes: [{ id: 'potage-du-chef', qte: 1 }] }), { maintenant: MARDI_14H });
  assert.equal(p.status, 400);
});

test('fonction : sans FORMSPREE_COMMANDES_ID, aucune commande acceptée (pas de faux succès)', async () => {
  delete process.env.FORMSPREE_COMMANDES_ID;
  delete process.env.COMMANDE_DEMO;
  const corps = base({ quand: offert() });
  const res = await handler(new Request('http://x/api/commande', { method: 'POST', body: JSON.stringify(corps) }), { ip: '1' });
  assert.equal(res.status, 503);
});

test('fonction : envoi en double (même n°) transmis une seule fois', async () => {
  process.env.FORMSPREE_COMMANDES_ID = 'test';
  let appels = 0;
  const vraiFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    appels++;
    return new Response('{}', { status: 200 });
  };
  try {
    const corps = JSON.stringify(base({ commande_id: 'DOUBLE1', quand: offert() }));
    const r1 = await handler(new Request('http://x', { method: 'POST', body: corps }), { ip: '2' });
    const r2 = await handler(new Request('http://x', { method: 'POST', body: corps }), { ip: '2' });
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(appels, 1);
    // Aucun renseignement personnel dans les réponses (même pour un doublon venant d'une autre adresse)
    for (const r of [await r1.json(), await r2.json()]) assert.deepEqual(Object.keys(r).filter((k) => !['ok', 'ref', 'doublon'].includes(k)), []);
  } finally {
    globalThis.fetch = vraiFetch;
    delete process.env.FORMSPREE_COMMANDES_ID;
  }
});

test('fonction : refus de Formspree → erreur, pas de succès', async () => {
  process.env.FORMSPREE_COMMANDES_ID = 'test';
  const vraiFetch = globalThis.fetch;
  for (const status of [400, 422, 429]) {
    globalThis.fetch = async () => new Response('non', { status });
    const corps = JSON.stringify(base({ commande_id: `ERR${status}`, quand: offert() }));
    const r = await handler(new Request('http://x', { method: 'POST', body: corps }), { ip: `e${status}` });
    assert.equal(r.status, 502);
  }
  globalThis.fetch = vraiFetch;
  delete process.env.FORMSPREE_COMMANDES_ID;
});

test('créneaux non proposés par le site : refusés', () => {
  for (const quand of [
    { type: 'heure', date: '2026-11-10', heure: '11:90' },
    { type: 'heure', date: '2026-11-99', heure: '18:30' },
    { type: 'heure', date: '2099-01-05', heure: '18:30' },
    { type: 'heure', date: '2026-11-11', heure: '18:30' }, // le site ne propose que le jour en cours
    { type: 'autre' },
  ]) {
    assert.notEqual(preparer(base({ quand }), { maintenant: MARDI_14H }).status, 200, JSON.stringify(quand));
  }
  // Un créneau passé depuis moins de 10 minutes reste accepté (temps de saisie)
  const aujourdhui = calc.creneaux(MARDI_14H);
  assert.equal(preparer(base({ quand: { type: 'heure', date: '2026-11-10', heure: aujourdhui.creneaux[0] } }), { maintenant: new Date(MARDI_14H.getTime() + 5 * 60_000) }).status, 200);
});

test('deux requêtes SIMULTANÉES avec le même numéro : un seul envoi (registre partagé atomique)', async () => {
  process.env.FORMSPREE_COMMANDES_ID = 'test';
  // Registre partagé simulé : écriture conditionnelle « seulement si nouveau », comme Netlify Blobs
  const partage = new Map();
  _definirRegistre({
    async reserver(c) { await new Promise((z) => setTimeout(z, 5)); if (partage.has(c)) return false; partage.set(c, 'en-cours'); return true; },
    async etat(c) { return partage.get(c) ?? null; },
    async terminer(c) { partage.set(c, 'envoyee'); },
    async liberer(c) { partage.delete(c); },
  });
  let appels = 0;
  const vraiFetch = globalThis.fetch;
  globalThis.fetch = async () => { appels++; await new Promise((z) => setTimeout(z, 50)); return new Response('{}', { status: 200 }); };
  try {
    const corps = JSON.stringify(base({ commande_id: 'SIMULT1', quand: offert() }));
    const reponses = await Promise.all([1, 2, 3].map((i) => handler(new Request('http://x', { method: 'POST', body: corps }), { ip: `s${i}` })));
    assert.equal(appels, 1);
    assert.equal(reponses.filter((r) => r.status === 200).length, 1);
    assert.ok(reponses.every((r) => [200, 409].includes(r.status)));
  } finally {
    globalThis.fetch = vraiFetch;
    delete process.env.FORMSPREE_COMMANDES_ID;
  }
});

test('production : registre partagé indisponible → aucune commande (503), pas de repli en mémoire', async () => {
  delete process.env.COMMANDE_REGISTRE_MEMOIRE;
  _definirRegistre(null); // Netlify Blobs n'existe pas dans cet environnement : comme une panne
  process.env.FORMSPREE_COMMANDES_ID = 'test';
  let appels = 0;
  const vraiFetch = globalThis.fetch;
  globalThis.fetch = async () => { appels++; return new Response('{}', { status: 200 }); };
  try {
    const corps = JSON.stringify(base({ commande_id: 'PANNE01', quand: offert() }));
    const r = await handler(new Request('http://x', { method: 'POST', body: corps }), { ip: 'p1' });
    assert.equal(r.status, 503);
    assert.equal(appels, 0);
  } finally {
    globalThis.fetch = vraiFetch;
    delete process.env.FORMSPREE_COMMANDES_ID;
    process.env.COMMANDE_REGISTRE_MEMOIRE = '1';
    _definirRegistre(null);
  }
});

test('coupure après envoi (résultat incertain) : le numéro reste réservé, aucun deuxième envoi', async () => {
  process.env.FORMSPREE_COMMANDES_ID = 'test';
  _definirRegistre(null);
  let appels = 0;
  const vraiFetch = globalThis.fetch;
  const corps = JSON.stringify(base({ commande_id: 'COUPE01', quand: offert() }));
  try {
    // 1er essai : Formspree reçoit la requête puis la connexion coupe (réinitialisation)
    globalThis.fetch = async () => { appels++; throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } }); };
    const r1 = await handler(new Request('http://x', { method: 'POST', body: corps }), { ip: 'c1' });
    assert.equal(r1.status, 504);
    assert.equal((await r1.json()).incertain, true);
    // 2e essai avec le même numéro : refusé sans rien envoyer
    globalThis.fetch = async () => { appels++; return new Response('{}', { status: 200 }); };
    const r2 = await handler(new Request('http://x', { method: 'POST', body: corps }), { ip: 'c2' });
    assert.equal(r2.status, 504);
    assert.equal(appels, 1);
    // Erreur serveur de Formspree (500) : aussi incertaine
    globalThis.fetch = async () => { appels++; return new Response('x', { status: 500 }); };
    const r3 = await handler(new Request('http://x', { method: 'POST', body: JSON.stringify(base({ commande_id: 'COUPE02', quand: offert() })) }), { ip: 'c3' });
    assert.equal((await r3.json()).incertain, true);
    // Connexion refusée (rien n'est parti) : le numéro est libéré, un nouvel essai passe
    globalThis.fetch = async () => { appels++; throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } }); };
    const c4 = JSON.stringify(base({ commande_id: 'REFUS01', quand: offert() }));
    assert.equal((await handler(new Request('http://x', { method: 'POST', body: c4 }), { ip: 'c4' })).status, 503);
    globalThis.fetch = async () => { appels++; return new Response('{}', { status: 200 }); };
    assert.equal((await handler(new Request('http://x', { method: 'POST', body: c4 }), { ip: 'c5' })).status, 200);
  } finally {
    globalThis.fetch = vraiFetch;
    delete process.env.FORMSPREE_COMMANDES_ID;
  }
});

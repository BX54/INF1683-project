/**
 * Tests de la commande en ligne : npm test
 * (règles de prix partagées + fonction serveur, sans réseau)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerCalcul, heureRestaurant } from '../src/commande/calcul.js';
import { COMMANDE } from '../src/config.js';
import menu from '../src/data/menu.json' with { type: 'json' };
import handler, { preparer } from '../netlify/functions/commande.mjs';

const calc = creerCalcul({ menu, commande: COMMANDE });
// Mardi 10 novembre 2026, 14 h à Gatineau (19 h UTC)
const MARDI_14H = new Date('2026-11-10T19:00:00Z');

const base = (extra = {}) => ({
  commande_id: 'TEST1',
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
  assert.match(p.message._subject, /^COMMANDE LIVRAISON .* 41,38 \$ — n° TEST1$/);
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
  const corps = base({ quand: { type: 'heure', date: '2099-01-05', heure: '18:30' } });
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
    const corps = JSON.stringify(base({ commande_id: 'DOUBLE1', quand: { type: 'heure', date: '2099-01-05', heure: '18:30' } }));
    const r1 = await handler(new Request('http://x', { method: 'POST', body: corps }), { ip: '2' });
    const r2 = await handler(new Request('http://x', { method: 'POST', body: corps }), { ip: '2' });
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(appels, 1);
  } finally {
    globalThis.fetch = vraiFetch;
    delete process.env.FORMSPREE_COMMANDES_ID;
  }
});

test('fonction : refus de Formspree → erreur, pas de succès', async () => {
  process.env.FORMSPREE_COMMANDES_ID = 'test';
  const vraiFetch = globalThis.fetch;
  for (const status of [400, 429, 500]) {
    globalThis.fetch = async () => new Response('non', { status });
    const corps = JSON.stringify(base({ commande_id: `E${status}`, quand: { type: 'heure', date: '2099-01-05', heure: '18:30' } }));
    const r = await handler(new Request('http://x', { method: 'POST', body: corps }), { ip: `e${status}` });
    assert.equal(r.status, 502);
  }
  globalThis.fetch = vraiFetch;
  delete process.env.FORMSPREE_COMMANDES_ID;
});

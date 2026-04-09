-- TuniBot — Demo Seed Data
-- Run this AFTER schema.sql to create the demo agency "Dar El Manar"
--
-- Usage:
--   1. Go to Supabase SQL Editor
--   2. Paste and run this file
--   3. The demo business will be accessible via widget_id shown below
--   4. Open /demo.html locally or in production — the widget will work

-- ============================================================
-- Step 1: Create the demo business
-- ============================================================
-- NOTE: The widget_id below MUST match the data-business-id in demo.html.
-- If you already have a business with this widget_id, this will do nothing (upsert).
INSERT INTO businesses (
  id,
  name,
  description,
  hours,
  phone,
  whatsapp,
  widget_id,
  active
) VALUES (
  gen_random_uuid(),
  'Dar El Manar — Agence Immobilière',
  'Agence immobilière de confiance à Tunis depuis 2015. Spécialisée dans la vente et la location d''appartements, villas et terrains dans le Grand Tunis.',
  'Lundi – Vendredi : 9h à 18h / Samedi : 9h à 13h / Dimanche : fermé',
  '+216 71 123 456',
  '+216 55 123 456',
  'f35067cc-5d0f-4b97-aa63-e10f3c40bd60',
  true
)
ON CONFLICT (widget_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  hours = EXCLUDED.hours,
  phone = EXCLUDED.phone,
  whatsapp = EXCLUDED.whatsapp;

-- ============================================================
-- Step 2: Get the business ID we just created/updated
-- ============================================================
-- We use a CTE to reference it cleanly in the next INSERT.

-- ============================================================
-- Step 3: Insert the knowledge base (listings + FAQs)
-- ============================================================
-- First, clear any existing KB for this business to avoid duplicates on re-run.
DELETE FROM knowledge_base
WHERE business_id = (SELECT id FROM businesses WHERE widget_id = 'f35067cc-5d0f-4b97-aa63-e10f3c40bd60');

INSERT INTO knowledge_base (business_id, content, source) VALUES
(
  (SELECT id FROM businesses WHERE widget_id = 'f35067cc-5d0f-4b97-aa63-e10f3c40bd60'),
  '## LISTINGS — BIENS À VENDRE

### 1. Appartement S+2 — Résidence Les Jasmins, Lac 2
- Type: Appartement S+2 (2 chambres, 1 salle de bain)
- Superficie: 95 m²
- Localisation: Les Berges du Lac 2, Tunis
- Prix: 285 000 TND
- Étage: 3ème étage avec ascenseur
- Caractéristiques: cuisine équipée, balcon avec vue sur le lac, place de parking, résidence sécurisée
- Disponibilité: immédiate

### 2. Villa S+4 — Villa El Yasmine, La Soukra
- Type: Villa S+4 (4 chambres, 2 salles de bain)
- Superficie: 280 m² habitable, terrain 400 m²
- Localisation: La Soukra, Ariana
- Prix: 620 000 TND
- Caractéristiques: jardin, garage double, salon marocain, terrasse, quartier calme et résidentiel
- Disponibilité: immédiate

### 3. Villa S+3 — Villa Méditerranée, Gammarth
- Type: Villa S+3 (3 chambres, 2 salles de bain)
- Superficie: 210 m² habitable, terrain 350 m²
- Localisation: Gammarth, La Marsa
- Prix: 890 000 TND
- Caractéristiques: vue mer, piscine, cuisine américaine, finition haut standing
- Disponibilité: immédiate',
  'manual-listings-sale'
),
(
  (SELECT id FROM businesses WHERE widget_id = 'f35067cc-5d0f-4b97-aa63-e10f3c40bd60'),
  '## LISTINGS — BIENS À LOUER

### 4. Studio Meublé S+1 — Centre Ville
- Type: Appartement S+1 meublé (1 chambre, 1 salle de bain)
- Superficie: 55 m²
- Localisation: Avenue Habib Bourguiba, Tunis Centre
- Loyer: 850 TND / mois
- Caractéristiques: entièrement meublé, climatisé, Internet fibre, proche métro et commerces
- Disponibilité: à partir du 1er mai 2026
- Durée minimum: 6 mois

## INFORMATIONS GÉNÉRALES

### Zones couvertes
Nous couvrons tout le Grand Tunis: Les Berges du Lac 1 et 2, La Soukra, Ariana, La Marsa, Gammarth, Carthage, Ennasr, El Menzah, Centre Ville, Bardo, Manouba.

### Services proposés
- Vente d''appartements, villas, terrains et locaux commerciaux
- Location résidentielle et professionnelle
- Estimation gratuite de votre bien
- Accompagnement juridique et notarial (mise en relation avec un notaire partenaire)
- Visites sur rendez-vous du lundi au samedi

### FAQ
Q: Comment prendre rendez-vous pour une visite?
R: Vous pouvez nous contacter par téléphone au +216 71 123 456, par WhatsApp au +216 55 123 456, ou directement via ce chat. Nous vous proposerons un créneau dans les 48h.

Q: Est-ce que les prix sont négociables?
R: Les prix affichés sont indicatifs. Une marge de négociation est possible selon le bien. Contactez-nous pour en discuter.

Q: Vous acceptez les paiements par facilités?
R: Nous ne sommes pas un organisme de crédit, mais nous pouvons vous mettre en relation avec des banques partenaires pour un crédit immobilier.

Q: Faut-il payer pour une estimation?
R: Non, l''estimation de votre bien est gratuite et sans engagement.',
  'manual-listings-rent-faq'
);

-- ============================================================
-- Done! Verify:
-- ============================================================
-- SELECT b.name, b.widget_id, COUNT(kb.id) AS kb_rows
-- FROM businesses b
-- LEFT JOIN knowledge_base kb ON kb.business_id = b.id
-- WHERE b.widget_id = 'f35067cc-5d0f-4b97-aa63-e10f3c40bd60'
-- GROUP BY b.id;

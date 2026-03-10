-- Migration 018: Seed test rides across most French departments
-- Creates a seed publisher account and test rides for demo/review purposes

DO $$
DECLARE
  publisher_id UUID;
BEGIN

  -- Create seed publisher if not exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'seed.publisher@transportrelay.app') THEN
    INSERT INTO users (
      email, password_hash, name, phone, department,
      referral_code, role, is_active,
      cgu_accepted_at, cgu_version, created_at, updated_at
    ) VALUES (
      'seed.publisher@transportrelay.app',
      '$2b$10$ef.wTDpzNh5fzxJdZAApqe6U8tR.OiRWTceBEaE3l7PmAemRn5g7W',
      'Chauffeur Test',
      '+33600000099',
      '75',
      'SEEDPUB01',
      'user', true,
      NOW(), '1.0', NOW(), NOW()
    );
  END IF;

  SELECT id INTO publisher_id FROM users WHERE email = 'seed.publisher@transportrelay.app';

  -- Only insert if no test rides exist yet
  IF (SELECT COUNT(*) FROM rides WHERE published_by = publisher_id) = 0 THEN

    INSERT INTO rides (zone, department, distance, exact_distance, status, course_type,
      client_name, client_phone, pickup, destination,
      departure_city, arrival_city,
      scheduled_date, departure_time, arrival_time,
      notes, published_by, documents_visibility, created_at, updated_at)
    VALUES

    -- 75 - Paris
    ('Paris Centre', '75', '12 km', '11.8 km', 'available', 'normal',
     'M. Dupont', '0612345001', '15 Rue de Rivoli, 75001 Paris', 'Aéroport CDG Terminal 2',
     'Paris 1er', 'Roissy-en-France',
     CURRENT_DATE + 1, '07:00', '08:30',
     'Client ponctuel, bagages importants', publisher_id, 'hidden', NOW(), NOW()),

    ('Paris Nord', '75', '8 km', '7.5 km', 'available', 'medical',
     'Mme Martin', '0612345002', '45 Bd Magenta, 75010 Paris', 'Hôpital Lariboisière, Paris',
     'Paris 10e', 'Paris 10e',
     CURRENT_DATE + 1, '09:30', '10:00',
     'Transport consultation cardiologie', publisher_id, 'hidden', NOW(), NOW()),

    -- 69 - Lyon
    ('Lyon Centre', '69', '15 km', '14.2 km', 'available', 'normal',
     'M. Bernard', '0612345003', '3 Place Bellecour, 69002 Lyon', 'Aéroport Lyon-Saint Exupéry',
     'Lyon 2e', 'Colombier-Saugnieu',
     CURRENT_DATE + 1, '06:00', '07:00',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    ('Lyon Ouest', '69', '22 km', '21.5 km', 'available', 'medical',
     'M. Petit', '0612345004', '12 Rue Garibaldi, 69006 Lyon', 'Hôpital Neurologique, Lyon',
     'Lyon 6e', 'Lyon 3e',
     CURRENT_DATE + 2, '08:00', '08:45',
     'Hospitalisation - prévoir fauteuil', publisher_id, 'hidden', NOW(), NOW()),

    -- 13 - Marseille
    ('Marseille Centre', '13', '18 km', '17.3 km', 'available', 'normal',
     'Mme Rossi', '0612345005', '1 Quai du Port, 13002 Marseille', 'Aéroport Marseille-Provence',
     'Marseille 2e', 'Marignane',
     CURRENT_DATE + 1, '10:00', '11:00',
     'Client VIP', publisher_id, 'hidden', NOW(), NOW()),

    ('Marseille Nord', '13', '10 km', '9.8 km', 'available', 'medical',
     'M. Fernandez', '0612345006', '22 Bd National, 13003 Marseille', 'CHU Timone, Marseille',
     'Marseille 3e', 'Marseille 5e',
     CURRENT_DATE + 2, '11:00', '11:30',
     'Consultation oncologie', publisher_id, 'hidden', NOW(), NOW()),

    -- 33 - Bordeaux
    ('Bordeaux Centre', '33', '11 km', '10.5 km', 'available', 'normal',
     'Mme Leblanc', '0612345007', '5 Cours du Chapeau Rouge, 33000 Bordeaux', 'Gare Saint-Jean, Bordeaux',
     'Bordeaux Centre', 'Bordeaux',
     CURRENT_DATE + 1, '14:00', '14:30',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 31 - Toulouse
    ('Toulouse Centre', '31', '20 km', '19.2 km', 'available', 'normal',
     'M. Garcia', '0612345008', '2 Place du Capitole, 31000 Toulouse', 'Aéroport Toulouse-Blagnac',
     'Toulouse Centre', 'Blagnac',
     CURRENT_DATE + 1, '16:30', '17:15',
     '2 valises', publisher_id, 'hidden', NOW(), NOW()),

    -- 67 - Strasbourg
    ('Strasbourg Centre', '67', '14 km', '13.5 km', 'available', 'normal',
     'Mme Schmidt', '0612345009', '1 Place de la Cathédrale, 67000 Strasbourg', 'Aéroport Strasbourg',
     'Strasbourg', 'Entzheim',
     CURRENT_DATE + 3, '08:30', '09:15',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 06 - Nice
    ('Nice Centre', '06', '25 km', '24.1 km', 'available', 'normal',
     'M. Moreau', '0612345010', '3 Promenade des Anglais, 06000 Nice', 'Aéroport Nice Côte d Azur',
     'Nice Centre', 'Nice',
     CURRENT_DATE + 2, '05:30', '06:00',
     'Vol très tôt le matin', publisher_id, 'hidden', NOW(), NOW()),

    -- 44 - Nantes
    ('Nantes Centre', '44', '16 km', '15.7 km', 'available', 'normal',
     'Mme Lemaire', '0612345011', '2 Place du Commerce, 44000 Nantes', 'Aéroport Nantes Atlantique',
     'Nantes Centre', 'Saint-Aignan-de-Grand-Lieu',
     CURRENT_DATE + 1, '12:00', '12:45',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 59 - Lille
    ('Lille Centre', '59', '13 km', '12.4 km', 'available', 'normal',
     'M. Leroy', '0612345012', '1 Place du Général de Gaulle, 59000 Lille', 'Aéroport Lille-Lesquin',
     'Lille Centre', 'Lesquin',
     CURRENT_DATE + 2, '09:00', '09:45',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 34 - Montpellier
    ('Montpellier Centre', '34', '9 km', '8.6 km', 'available', 'normal',
     'Mme Faure', '0612345013', '1 Place de la Comédie, 34000 Montpellier', 'Aéroport Montpellier-Méditerranée',
     'Montpellier Centre', 'Mauguio',
     CURRENT_DATE + 3, '07:45', '08:30',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 76 - Rouen
    ('Rouen Centre', '76', '12 km', '11.2 km', 'available', 'normal',
     'M. Girard', '0612345014', '3 Place de la Cathédrale, 76000 Rouen', 'Gare de Rouen-Rive-Droite',
     'Rouen Centre', 'Rouen',
     CURRENT_DATE + 1, '13:30', '14:00',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 57 - Metz
    ('Metz Centre', '57', '30 km', '29.3 km', 'available', 'medical',
     'M. Wagner', '0612345015', '5 Place Saint-Louis, 57000 Metz', 'CHR Metz-Thionville',
     'Metz Centre', 'Ars-Laquenexy',
     CURRENT_DATE + 2, '10:30', '11:15',
     'Retour hospitalisation', publisher_id, 'hidden', NOW(), NOW()),

    -- 38 - Grenoble
    ('Grenoble Centre', '38', '17 km', '16.8 km', 'available', 'normal',
     'Mme Bonnet', '0612345016', '1 Place Victor Hugo, 38000 Grenoble', 'Aéroport Grenoble-Alpes',
     'Grenoble Centre', 'Saint-Étienne-de-Saint-Geoirs',
     CURRENT_DATE + 4, '06:30', '07:30',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 21 - Dijon
    ('Dijon Centre', '21', '8 km', '7.8 km', 'available', 'normal',
     'M. Rousseau', '0612345017', '2 Place de la Libération, 21000 Dijon', 'Gare de Dijon-Ville',
     'Dijon Centre', 'Dijon',
     CURRENT_DATE + 2, '15:00', '15:20',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 35 - Rennes
    ('Rennes Centre', '35', '11 km', '10.7 km', 'available', 'normal',
     'Mme Chevalier', '0612345018', '1 Place du Parlement, 35000 Rennes', 'Aéroport Rennes-Bretagne',
     'Rennes Centre', 'Saint-Jacques-de-la-Lande',
     CURRENT_DATE + 3, '11:30', '12:00',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 49 - Angers
    ('Angers Centre', '49', '20 km', '19.4 km', 'available', 'normal',
     'M. Mercier', '0612345019', '1 Place Kennedy, 49000 Angers', 'Gare Saint-Laud, Angers',
     'Angers Centre', 'Angers',
     CURRENT_DATE + 1, '17:00', '17:25',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 63 - Clermont-Ferrand
    ('Clermont-Fd Centre', '63', '24 km', '23.5 km', 'available', 'medical',
     'M. Dupuis', '0612345020', '1 Place de Jaude, 63000 Clermont-Ferrand', 'CHU Clermont-Ferrand',
     'Clermont-Fd Centre', 'Clermont-Ferrand',
     CURRENT_DATE + 2, '08:15', '09:00',
     'Consultation neurologie', publisher_id, 'hidden', NOW(), NOW()),

    -- 74 - Annecy
    ('Annecy Centre', '74', '19 km', '18.2 km', 'available', 'normal',
     'Mme Laurent', '0612345021', '3 Rue Jean-Jacques Rousseau, 74000 Annecy', 'Aéroport Genève-Cointrin',
     'Annecy', 'Genève',
     CURRENT_DATE + 5, '05:00', '06:00',
     'Navette aéroport Genève', publisher_id, 'hidden', NOW(), NOW()),

    -- 83 - Toulon
    ('Toulon Centre', '83', '22 km', '21.7 km', 'available', 'normal',
     'M. Simon', '0612345022', '2 Place de la Liberté, 83000 Toulon', 'Aéroport Toulon-Hyères',
     'Toulon Centre', 'Hyères',
     CURRENT_DATE + 3, '13:00', '13:45',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 29 - Brest
    ('Brest Centre', '29', '12 km', '11.5 km', 'available', 'normal',
     'Mme Thomas', '0612345023', '1 Place de la Liberté, 29200 Brest', 'Aéroport Brest Bretagne',
     'Brest Centre', 'Guipavas',
     CURRENT_DATE + 2, '06:45', '07:30',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 80 - Amiens
    ('Amiens Centre', '80', '10 km', '9.9 km', 'available', 'normal',
     'M. Robert', '0612345024', '1 Rue Robert de Luzarches, 80000 Amiens', 'Gare d Amiens',
     'Amiens Centre', 'Amiens',
     CURRENT_DATE + 1, '18:30', '18:50',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 51 - Reims
    ('Reims Centre', '51', '9 km', '8.7 km', 'available', 'normal',
     'Mme Richard', '0612345025', '1 Place du Cardinal Luçon, 51100 Reims', 'Gare de Reims',
     'Reims Centre', 'Reims',
     CURRENT_DATE + 4, '09:15', '09:35',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 45 - Orléans
    ('Orléans Centre', '45', '14 km', '13.6 km', 'available', 'normal',
     'M. Picard', '0612345026', '1 Place du Martroi, 45000 Orléans', 'Gare des Aubrais',
     'Orléans Centre', 'Fleury-les-Aubrais',
     CURRENT_DATE + 2, '14:30', '15:00',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 54 - Nancy
    ('Nancy Centre', '54', '11 km', '10.3 km', 'available', 'normal',
     'Mme Michel', '0612345027', '1 Place Stanislas, 54000 Nancy', 'Gare de Nancy',
     'Nancy Centre', 'Nancy',
     CURRENT_DATE + 3, '10:00', '10:25',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 971 - Guadeloupe
    ('Pointe-à-Pitre', '971', '8 km', '7.6 km', 'available', 'normal',
     'M. Céleste', '0612345028', '1 Rue Frébault, 97110 Pointe-à-Pitre', 'Aéroport Pointe-à-Pitre',
     'Pointe-à-Pitre', 'Les Abymes',
     CURRENT_DATE + 1, '07:30', '08:00',
     NULL, publisher_id, 'hidden', NOW(), NOW()),

    -- 972 - Martinique
    ('Fort-de-France', '972', '15 km', '14.3 km', 'available', 'normal',
     'Mme Désir', '0612345029', '1 Rue Victor Sévère, 97200 Fort-de-France', 'Aéroport Martinique Aimé Césaire',
     'Fort-de-France', 'Le Lamentin',
     CURRENT_DATE + 2, '09:00', '09:45',
     NULL, publisher_id, 'hidden', NOW(), NOW());

    RAISE NOTICE 'Test rides seeded successfully across % departments', 28;
  ELSE
    RAISE NOTICE 'Test rides already exist, skipping seed';
  END IF;

END
$$;

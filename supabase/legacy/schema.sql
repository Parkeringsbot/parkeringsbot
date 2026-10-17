-- Create parking_fines table
CREATE TABLE IF NOT EXISTS parking_fines (
  id SERIAL PRIMARY KEY,
  license_plate VARCHAR(10) NOT NULL,
  amount INTEGER NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location VARCHAR(255) NOT NULL,
  municipality VARCHAR(100) NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on license_plate for faster queries
CREATE INDEX IF NOT EXISTS idx_parking_fines_license_plate ON parking_fines(license_plate);
CREATE INDEX IF NOT EXISTS idx_parking_fines_date ON parking_fines(date);

-- Create users table for future admin functionality
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert 50 test parking fines
INSERT INTO parking_fines (license_plate, amount, date, time, location, municipality, paid) VALUES
-- Ola Nordmann (AB12345) - 15 fines
('AB12345', 950, '2024-09-01', '14:30', 'Ferner Brach ved Oslo Sentralstasjon', 'Oslo', false),
('AB12345', 1050, '2024-08-15', '09:45', 'Gate-parkering Hausmanns gate', 'Oslo', true),
('AB12345', 850, '2024-08-02', '16:20', 'Parkering ved Majorstuen', 'Oslo', false),
('AB12345', 950, '2024-07-18', '11:15', 'Sørenga parkeringsplass', 'Oslo', true),
('AB12345', 1150, '2024-06-25', '13:40', 'Gate-parkering Grünerløkka', 'Oslo', false),
('AB12345', 900, '2024-06-10', '15:55', 'Sentrum parkeringshus', 'Oslo', true),
('AB12345', 1000, '2024-05-22', '10:30', 'Parkering Tøyen park', 'Oslo', false),
('AB12345', 850, '2024-05-08', '12:20', 'Gate-parkering Ferner Brach', 'Oslo', true),
('AB12345', 1100, '2024-04-30', '14:45', 'Parkering ved Bislett', 'Oslo', false),
('AB12345', 950, '2024-04-12', '09:15', 'Hamar gate parkering', 'Oslo', true),
('AB12345', 1050, '2024-03-28', '16:30', 'Tilstøtende kjørefelt Oslo S', 'Oslo', false),
('AB12345', 900, '2024-03-15', '13:00', 'Parkering Ferner Brach', 'Oslo', true),
('AB12345', 1000, '2024-02-20', '11:45', 'Gate-parkering ved museet', 'Oslo', false),
('AB12345', 850, '2024-02-01', '15:20', 'Parkering Grünerløkka', 'Oslo', true),
('AB12345', 1150, '2024-01-10', '10:00', 'Sentrum parkering', 'Oslo', false),

-- Kari Hansen (CD98765) - 18 fines
('CD98765', 800, '2024-09-05', '08:30', 'Parkering Zander Kaaes gate', 'Bergen', true),
('CD98765', 950, '2024-08-20', '14:15', 'Byparken gate-parkering', 'Bergen', false),
('CD98765', 1000, '2024-08-05', '10:45', 'Vagen parkeringsplass', 'Bergen', true),
('CD98765', 850, '2024-07-22', '12:30', 'Gate-parkering Bryggen', 'Bergen', false),
('CD98765', 900, '2024-07-08', '16:00', 'Parkering Lille Øvregate', 'Bergen', true),
('CD98765', 1100, '2024-06-15', '09:20', 'Gate-parkering Strandgaten', 'Bergen', false),
('CD98765', 950, '2024-05-30', '13:45', 'Sentrum parkering Bergen', 'Bergen', true),
('CD98765', 800, '2024-05-10', '11:15', 'Parkering ved Korskirken', 'Bergen', false),
('CD98765', 1050, '2024-04-25', '15:30', 'Zander Kaaes gate parkering', 'Bergen', true),
('CD98765', 900, '2024-04-08', '10:00', 'Gate-parkering Marken', 'Bergen', false),
('CD98765', 1000, '2024-03-20', '14:20', 'Byparken parkering', 'Bergen', true),
('CD98765', 850, '2024-03-05', '12:45', 'Parkering Nygård', 'Bergen', false),
('CD98765', 950, '2024-02-18', '09:30', 'Strandgaten gate-parkering', 'Bergen', true),
('CD98765', 1100, '2024-02-01', '16:15', 'Parkering Laksevåg', 'Bergen', false),
('CD98765', 800, '2024-01-15', '11:00', 'Sentrum Bergen', 'Bergen', true),
('CD98765', 1000, '2024-01-02', '13:30', 'Parkering ved museet', 'Bergen', false),
('CD98765', 900, '2023-12-20', '10:45', 'Gate-parkering Fana', 'Bergen', true),
('CD98765', 950, '2023-12-05', '15:00', 'Parkering Åsane', 'Bergen', false),

-- Per Larsen (EF54321) - 17 fines
('EF54321', 1200, '2024-09-08', '09:00', 'Parkering Sentrum Stavanger', 'Stavanger', true),
('EF54321', 1000, '2024-08-22', '14:30', 'Gate-parkering Larmfarten', 'Stavanger', false),
('EF54321', 1100, '2024-08-10', '11:20', 'Parkering ved Domkirken', 'Stavanger', true),
('EF54321', 950, '2024-07-25', '15:45', 'Sentrum gate-parkering', 'Stavanger', false),
('EF54321', 1050, '2024-07-12', '10:15', 'Parkering Våland', 'Stavanger', true),
('EF54321', 900, '2024-06-28', '13:00', 'Gate-parkering Tjensvoll', 'Stavanger', false),
('EF54321', 1100, '2024-06-14', '16:30', 'Parkering Hillevåg', 'Stavanger', true),
('EF54321', 1000, '2024-05-29', '09:45', 'Sentrum Stavanger', 'Stavanger', false),
('EF54321', 850, '2024-05-15', '12:20', 'Gate-parkering Madla', 'Stavanger', true),
('EF54321', 1150, '2024-04-30', '14:50', 'Parkering ved Sola', 'Stavanger', false),
('EF54321', 950, '2024-04-10', '11:30', 'Larmfarten parkering', 'Stavanger', true),
('EF54321', 1000, '2024-03-25', '15:15', 'Gate-parkering Sentrum', 'Stavanger', false),
('EF54321', 900, '2024-03-08', '10:00', 'Parkering Storhaug', 'Stavanger', true),
('EF54321', 1100, '2024-02-20', '13:45', 'Sentrum gate-parkering', 'Stavanger', false),
('EF54321', 850, '2024-02-05', '16:00', 'Parkering Eiganes', 'Stavanger', true),
('EF54321', 1050, '2024-01-18', '09:30', 'Gate-parkering Forus', 'Stavanger', false),
('EF54321', 1000, '2024-01-02', '14:20', 'Parkering Sentrum', 'Stavanger', true),

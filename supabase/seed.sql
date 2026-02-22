-- ============================================================================
-- BizCircle App - Seed Data
-- Populates industries, counties, and county adjacency for pilot markets
-- ============================================================================

-- ============================================================================
-- SECTION 1: INDUSTRIES (18 top-level sectors + ~4-5 sub-industries each)
-- ============================================================================
-- Uses a DO $$ block with variables to capture parent UUIDs for sub-industries.

DO $$
DECLARE
  v_food_bev         uuid;
  v_construction     uuid;
  v_professional     uuid;
  v_health           uuid;
  v_retail           uuid;
  v_automotive       uuid;
  v_home_services    uuid;
  v_real_estate      uuid;
  v_technology       uuid;
  v_manufacturing    uuid;
  v_education        uuid;
  v_beauty           uuid;
  v_entertainment    uuid;
  v_transportation   uuid;
  v_agriculture      uuid;
  v_financial        uuid;
  v_cleaning         uuid;
  v_pet              uuid;
BEGIN

  -- --------------------------------------------------------------------------
  -- 1. Food & Beverage
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Food & Beverage', 'food-beverage', NULL, '72', 'restaurant', 1)
  RETURNING id INTO v_food_bev;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Restaurants',           'restaurants',           v_food_bev, '7225', 'restaurant',  1),
    ('Cafes & Coffee Shops',  'cafes-coffee-shops',    v_food_bev, '7224', 'cafe',        2),
    ('Bars & Nightlife',      'bars-nightlife',        v_food_bev, '7224', 'wine-bar',    3),
    ('Catering',              'catering',              v_food_bev, '7223', 'room-service', 4),
    ('Food Trucks',           'food-trucks',           v_food_bev, '7225', 'local-shipping', 5),
    ('Bakeries',              'bakeries',              v_food_bev, '3118', 'cake',        6);

  -- --------------------------------------------------------------------------
  -- 2. Construction & Trades
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Construction & Trades', 'construction-trades', NULL, '23', 'construct', 2)
  RETURNING id INTO v_construction;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('General Contracting', 'general-contracting', v_construction, '2361', 'construct',    1),
    ('Plumbing',            'plumbing',            v_construction, '2382', 'water',        2),
    ('Electrical',          'electrical',           v_construction, '2382', 'flash',        3),
    ('HVAC',                'hvac',                 v_construction, '2382', 'thermometer',  4),
    ('Roofing',             'roofing',              v_construction, '2381', 'home',         5),
    ('Painting',            'painting',             v_construction, '2382', 'color-palette', 6);

  -- --------------------------------------------------------------------------
  -- 3. Professional Services
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Professional Services', 'professional-services', NULL, '54', 'briefcase', 3)
  RETURNING id INTO v_professional;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Accounting & Tax',        'accounting-tax',        v_professional, '5412', 'calculator',   1),
    ('Legal Services',          'legal-services',        v_professional, '5411', 'gavel',        2),
    ('Marketing & Advertising', 'marketing-advertising', v_professional, '5418', 'megaphone',    3),
    ('Consulting',              'consulting',            v_professional, '5416', 'chatbubbles',  4),
    ('Insurance Agencies',      'insurance-agencies',    v_professional, '5242', 'shield',       5);

  -- --------------------------------------------------------------------------
  -- 4. Health & Wellness
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Health & Wellness', 'health-wellness', NULL, '62', 'fitness', 4)
  RETURNING id INTO v_health;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Medical Practices',  'medical-practices',  v_health, '6211', 'medkit',       1),
    ('Dental Offices',     'dental-offices',     v_health, '6212', 'medical',      2),
    ('Physical Therapy',   'physical-therapy',   v_health, '6214', 'body',         3),
    ('Mental Health',      'mental-health',      v_health, '6219', 'heart',        4),
    ('Chiropractic',       'chiropractic',       v_health, '6213', 'accessibility', 5);

  -- --------------------------------------------------------------------------
  -- 5. Retail
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Retail', 'retail', NULL, '44', 'storefront', 5)
  RETURNING id INTO v_retail;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Clothing & Apparel',  'clothing-apparel',   v_retail, '4481', 'shirt',       1),
    ('Specialty Retail',    'specialty-retail',    v_retail, '4532', 'gift',        2),
    ('Convenience Stores',  'convenience-stores',  v_retail, '4451', 'basket',      3),
    ('Gift Shops',          'gift-shops',          v_retail, '4532', 'ribbon',      4),
    ('Hardware Stores',     'hardware-stores',     v_retail, '4441', 'hammer',      5);

  -- --------------------------------------------------------------------------
  -- 6. Automotive
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Automotive', 'automotive', NULL, '441', 'car', 6)
  RETURNING id INTO v_automotive;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Auto Repair & Maintenance', 'auto-repair-maintenance', v_automotive, '8111', 'build',        1),
    ('Auto Dealers',              'auto-dealers',            v_automotive, '4411', 'car-sport',    2),
    ('Auto Body & Collision',     'auto-body-collision',     v_automotive, '8111', 'color-fill',   3),
    ('Tire & Wheel Services',     'tire-wheel-services',     v_automotive, '4413', 'ellipse',      4),
    ('Car Wash & Detailing',      'car-wash-detailing',      v_automotive, '8111', 'water',        5);

  -- --------------------------------------------------------------------------
  -- 7. Home Services
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Home Services', 'home-services', NULL, '56', 'home', 7)
  RETURNING id INTO v_home_services;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Landscaping & Lawn Care', 'landscaping-lawn-care', v_home_services, '5617', 'leaf',     1),
    ('Pest Control',            'pest-control',          v_home_services, '5617', 'bug',      2),
    ('Handyman Services',       'handyman-services',     v_home_services, '5617', 'build',    3),
    ('Interior Design',         'interior-design',       v_home_services, '5414', 'color-palette', 4),
    ('Moving & Storage',        'moving-storage',        v_home_services, '4841', 'cube',     5);

  -- --------------------------------------------------------------------------
  -- 8. Real Estate
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Real Estate', 'real-estate', NULL, '53', 'business', 8)
  RETURNING id INTO v_real_estate;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Residential Brokerage',    'residential-brokerage',    v_real_estate, '5312', 'home',      1),
    ('Commercial Brokerage',     'commercial-brokerage',     v_real_estate, '5312', 'business',  2),
    ('Property Management',      'property-management',      v_real_estate, '5311', 'key',       3),
    ('Real Estate Appraisal',    'real-estate-appraisal',    v_real_estate, '5313', 'document-text', 4);

  -- --------------------------------------------------------------------------
  -- 9. Technology & IT
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Technology & IT', 'technology-it', NULL, '51', 'laptop', 9)
  RETURNING id INTO v_technology;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('IT Support & Managed Services', 'it-support-managed-services', v_technology, '5415', 'hardware-chip', 1),
    ('Web & App Development',         'web-app-development',         v_technology, '5415', 'code-slash',    2),
    ('Cybersecurity',                 'cybersecurity',               v_technology, '5415', 'lock-closed',   3),
    ('Cloud & Data Services',         'cloud-data-services',         v_technology, '5182', 'cloud',         4);

  -- --------------------------------------------------------------------------
  -- 10. Manufacturing
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Manufacturing', 'manufacturing', NULL, '31', 'cog', 10)
  RETURNING id INTO v_manufacturing;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Metal Fabrication',    'metal-fabrication',    v_manufacturing, '3323', 'construct',  1),
    ('Woodworking',          'woodworking',          v_manufacturing, '3211', 'build',      2),
    ('Printing & Graphics',  'printing-graphics',    v_manufacturing, '3231', 'print',      3),
    ('Food Manufacturing',   'food-manufacturing',   v_manufacturing, '3114', 'nutrition',  4),
    ('Plastics & Packaging', 'plastics-packaging',   v_manufacturing, '3261', 'cube',       5);

  -- --------------------------------------------------------------------------
  -- 11. Education & Training
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Education & Training', 'education-training', NULL, '61', 'school', 11)
  RETURNING id INTO v_education;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Tutoring & Test Prep',    'tutoring-test-prep',    v_education, '6114', 'book',        1),
    ('Vocational Training',     'vocational-training',   v_education, '6115', 'construct',   2),
    ('Music & Arts Instruction','music-arts-instruction', v_education, '6116', 'musical-notes', 3),
    ('Daycare & Preschool',     'daycare-preschool',     v_education, '6244', 'happy',       4),
    ('Driving Schools',         'driving-schools',       v_education, '6116', 'car',         5);

  -- --------------------------------------------------------------------------
  -- 12. Beauty & Personal Care
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Beauty & Personal Care', 'beauty-personal-care', NULL, '812', 'cut', 12)
  RETURNING id INTO v_beauty;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Hair Salons',       'hair-salons',       v_beauty, '8121', 'cut',           1),
    ('Barbershops',       'barbershops',       v_beauty, '8121', 'cut',           2),
    ('Nail Salons',       'nail-salons',       v_beauty, '8121', 'color-palette', 3),
    ('Spas & Massage',    'spas-massage',      v_beauty, '8121', 'water',         4),
    ('Skincare & Esthetics','skincare-esthetics', v_beauty, '8121', 'sparkles',   5);

  -- --------------------------------------------------------------------------
  -- 13. Entertainment & Recreation
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Entertainment & Recreation', 'entertainment-recreation', NULL, '71', 'game-controller', 13)
  RETURNING id INTO v_entertainment;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Event Venues',          'event-venues',          v_entertainment, '7112', 'calendar',        1),
    ('Gyms & Fitness Centers','gyms-fitness-centers',  v_entertainment, '7139', 'fitness',         2),
    ('Photography & Video',   'photography-video',     v_entertainment, '5419', 'camera',          3),
    ('DJs & Live Music',      'djs-live-music',        v_entertainment, '7111', 'musical-notes',   4),
    ('Amusement & Recreation','amusement-recreation',  v_entertainment, '7131', 'game-controller', 5);

  -- --------------------------------------------------------------------------
  -- 14. Transportation & Logistics
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Transportation & Logistics', 'transportation-logistics', NULL, '48', 'bus', 14)
  RETURNING id INTO v_transportation;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Trucking & Freight',    'trucking-freight',    v_transportation, '4841', 'bus',         1),
    ('Courier & Delivery',    'courier-delivery',    v_transportation, '4921', 'bicycle',     2),
    ('Taxi & Rideshare',      'taxi-rideshare',      v_transportation, '4853', 'car',         3),
    ('Warehousing',           'warehousing',         v_transportation, '4931', 'cube',        4);

  -- --------------------------------------------------------------------------
  -- 15. Agriculture & Farming
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Agriculture & Farming', 'agriculture-farming', NULL, '11', 'leaf', 15)
  RETURNING id INTO v_agriculture;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Crop Farming',            'crop-farming',            v_agriculture, '1111', 'leaf',      1),
    ('Livestock & Ranching',    'livestock-ranching',       v_agriculture, '1121', 'paw',       2),
    ('Nurseries & Greenhouses', 'nurseries-greenhouses',   v_agriculture, '1114', 'flower',    3),
    ('Farm Equipment & Supply', 'farm-equipment-supply',   v_agriculture, '4238', 'construct', 4);

  -- --------------------------------------------------------------------------
  -- 16. Financial Services
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Financial Services', 'financial-services', NULL, '52', 'cash', 16)
  RETURNING id INTO v_financial;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Banking & Credit Unions', 'banking-credit-unions', v_financial, '5221', 'business',    1),
    ('Financial Planning',      'financial-planning',    v_financial, '5239', 'trending-up', 2),
    ('Mortgage & Lending',      'mortgage-lending',      v_financial, '5222', 'home',        3),
    ('Bookkeeping & Payroll',   'bookkeeping-payroll',   v_financial, '5412', 'calculator',  4);

  -- --------------------------------------------------------------------------
  -- 17. Cleaning & Janitorial
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Cleaning & Janitorial', 'cleaning-janitorial', NULL, '561', 'sparkles', 17)
  RETURNING id INTO v_cleaning;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Commercial Cleaning',    'commercial-cleaning',    v_cleaning, '5617', 'business',  1),
    ('Residential Cleaning',   'residential-cleaning',   v_cleaning, '5617', 'home',      2),
    ('Carpet & Upholstery',    'carpet-upholstery',      v_cleaning, '5617', 'layers',    3),
    ('Window Cleaning',        'window-cleaning',        v_cleaning, '5617', 'sparkles',  4),
    ('Pressure Washing',       'pressure-washing',       v_cleaning, '5617', 'water',     5);

  -- --------------------------------------------------------------------------
  -- 18. Pet Services
  -- --------------------------------------------------------------------------
  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order)
  VALUES ('Pet Services', 'pet-services', NULL, '812', 'paw', 18)
  RETURNING id INTO v_pet;

  INSERT INTO industries (name, slug, parent_id, naics_prefix, icon, sort_order) VALUES
    ('Veterinary Clinics',  'veterinary-clinics',  v_pet, '5419', 'medkit',  1),
    ('Pet Grooming',        'pet-grooming',        v_pet, '8129', 'cut',     2),
    ('Pet Boarding & Sitting','pet-boarding-sitting', v_pet, '8129', 'home',  3),
    ('Pet Training',        'pet-training',        v_pet, '8129', 'school',  4),
    ('Pet Retail & Supplies','pet-retail-supplies', v_pet, '4532', 'paw',    5);

  RAISE NOTICE 'Industries seeded: 18 top-level sectors with sub-industries';
END $$;


-- ============================================================================
-- SECTION 2: COUNTIES (39 counties across 5 pilot metro areas)
-- ============================================================================
-- Columns: fips, name, state_code, state_name, latitude, longitude, population, is_pilot
-- is_pilot = true only for the primary county in each metro area.

INSERT INTO counties (fips, name, state_code, state_name, latitude, longitude, population, is_pilot) VALUES

  -- ---- Austin, TX metro area (8 counties) ----
  ('48453', 'Travis County',      'TX', 'Texas',     30.3340, -97.7544, 1290188, true),
  ('48491', 'Williamson County',  'TX', 'Texas',     30.6483, -97.6011,  609017, false),
  ('48209', 'Hays County',        'TX', 'Texas',     30.0591, -98.0289,  241067, false),
  ('48021', 'Bastrop County',     'TX', 'Texas',     30.1036, -97.3153,   97216, false),
  ('48055', 'Caldwell County',    'TX', 'Texas',     29.8367, -97.6200,   45883, false),
  ('48287', 'Lee County',         'TX', 'Texas',     30.3152, -97.0058,   17239, false),
  ('48053', 'Burnet County',      'TX', 'Texas',     30.7887, -98.1823,   49130, false),
  ('48031', 'Blanco County',      'TX', 'Texas',     30.2651, -98.3953,   11931, false),

  -- ---- Nashville, TN metro area (8 counties) ----
  ('47037', 'Davidson County',    'TN', 'Tennessee', 36.1714, -86.7844,  715884, true),
  ('47187', 'Williamson County',  'TN', 'Tennessee', 35.8934, -86.8689,  247726, false),
  ('47149', 'Rutherford County',  'TN', 'Tennessee', 35.8425, -86.4200,  341486, false),
  ('47165', 'Sumner County',      'TN', 'Tennessee', 36.4685, -86.4606,  196281, false),
  ('47189', 'Wilson County',      'TN', 'Tennessee', 36.1490, -86.2988,  147737, false),
  ('47147', 'Robertson County',   'TN', 'Tennessee', 36.5254, -86.8713,   72938, false),
  ('47021', 'Cheatham County',    'TN', 'Tennessee', 36.2634, -87.0860,   40667, false),
  ('47043', 'Dickson County',     'TN', 'Tennessee', 36.1476, -87.3639,   54195, false),

  -- ---- Denver, CO metro area (8 counties) ----
  ('08031', 'Denver County',      'CO', 'Colorado',  39.7392, -104.9903,  713252, true),
  ('08005', 'Arapahoe County',    'CO', 'Colorado',  39.6498, -104.3391,  655070, false),
  ('08059', 'Jefferson County',   'CO', 'Colorado',  39.5867, -105.2508,  582910, false),
  ('08001', 'Adams County',       'CO', 'Colorado',  39.8361, -104.3360,  519572, false),
  ('08035', 'Douglas County',     'CO', 'Colorado',  39.3298, -104.9280,  357978, false),
  ('08014', 'Broomfield County',  'CO', 'Colorado',  39.9205, -105.0867,   74112, false),
  ('08013', 'Boulder County',     'CO', 'Colorado',  40.0926, -105.3575,  330758, false),
  ('08039', 'Elbert County',      'CO', 'Colorado',  39.2861, -104.1360,   26648, false),

  -- ---- Charlotte, NC metro area (8 counties) ----
  ('37119', 'Mecklenburg County', 'NC', 'North Carolina', 35.2468, -80.8365, 1115482, true),
  ('37025', 'Cabarrus County',    'NC', 'North Carolina', 35.3873, -80.5521,  225804, false),
  ('37071', 'Gaston County',      'NC', 'North Carolina', 35.2963, -81.1838,  227943, false),
  ('37179', 'Union County',       'NC', 'North Carolina', 34.9878, -80.5313,  239859, false),
  ('37097', 'Iredell County',     'NC', 'North Carolina', 35.7963, -80.8731,  186693, false),
  ('37109', 'Lincoln County',     'NC', 'North Carolina', 35.4749, -81.2281,   86810, false),
  ('37159', 'Rowan County',       'NC', 'North Carolina', 35.6370, -80.5258,  146875, false),
  ('37167', 'Stanly County',      'NC', 'North Carolina', 35.3126, -80.2533,   63504, false),

  -- ---- Portland, OR metro area (7 counties) ----
  ('41051', 'Multnomah County',   'OR', 'Oregon',         45.5470, -122.6500,  812855, true),
  ('41067', 'Washington County',  'OR', 'Oregon',         45.5600, -123.1386,  600372, false),
  ('41005', 'Clackamas County',   'OR', 'Oregon',         45.1768, -122.2159,  421401, false),
  ('41009', 'Columbia County',    'OR', 'Oregon',         45.9439, -123.0867,   52354, false),
  ('41071', 'Yamhill County',     'OR', 'Oregon',         45.2332, -123.3086,  107100, false),
  ('53011', 'Clark County',       'WA', 'Washington',     45.7725, -122.4825,  503311, false),
  ('41047', 'Marion County',      'OR', 'Oregon',         44.9013, -122.5758,  347818, false);


-- ============================================================================
-- SECTION 3: COUNTY ADJACENCY (bidirectional pairs)
-- ============================================================================
-- Each adjacency is inserted in BOTH directions (A->B and B->A).
-- Only adjacencies between counties that exist in our seed data are included.

INSERT INTO county_adjacency (county_fips, neighbor_fips) VALUES

  -- ==========================================================================
  -- Austin, TX metro adjacencies
  -- ==========================================================================

  -- Travis <-> Williamson
  ('48453', '48491'), ('48491', '48453'),
  -- Travis <-> Hays
  ('48453', '48209'), ('48209', '48453'),
  -- Travis <-> Bastrop
  ('48453', '48021'), ('48021', '48453'),
  -- Travis <-> Caldwell (Travis does not directly border Caldwell, but Hays does)
  -- Travis <-> Burnet
  ('48453', '48053'), ('48053', '48453'),
  -- Travis <-> Blanco
  ('48453', '48031'), ('48031', '48453'),
  -- Williamson <-> Burnet
  ('48491', '48053'), ('48053', '48491'),
  -- Williamson <-> Lee
  ('48491', '48287'), ('48287', '48491'),
  -- Williamson <-> Bastrop (Williamson does not directly border Bastrop, but via Travis)
  -- Hays <-> Caldwell
  ('48209', '48055'), ('48055', '48209'),
  -- Hays <-> Blanco
  ('48209', '48031'), ('48031', '48209'),
  -- Bastrop <-> Caldwell
  ('48021', '48055'), ('48055', '48021'),
  -- Bastrop <-> Lee
  ('48021', '48287'), ('48287', '48021'),
  -- Lee <-> Burnet (no direct adjacency -- separated by Williamson interior)
  -- Caldwell <-> (only borders Hays, Bastrop from our set)
  -- Blanco <-> Burnet
  ('48031', '48053'), ('48053', '48031'),

  -- ==========================================================================
  -- Nashville, TN metro adjacencies
  -- ==========================================================================

  -- Davidson <-> Williamson (TN)
  ('47037', '47187'), ('47187', '47037'),
  -- Davidson <-> Rutherford
  ('47037', '47149'), ('47149', '47037'),
  -- Davidson <-> Sumner
  ('47037', '47165'), ('47165', '47037'),
  -- Davidson <-> Wilson
  ('47037', '47189'), ('47189', '47037'),
  -- Davidson <-> Robertson
  ('47037', '47147'), ('47147', '47037'),
  -- Davidson <-> Cheatham
  ('47037', '47021'), ('47021', '47037'),
  -- Davidson <-> Dickson
  ('47037', '47043'), ('47043', '47037'),
  -- Williamson (TN) <-> Rutherford
  ('47187', '47149'), ('47149', '47187'),
  -- Wilson <-> Rutherford
  ('47189', '47149'), ('47149', '47189'),
  -- Sumner <-> Wilson
  ('47165', '47189'), ('47189', '47165'),
  -- Sumner <-> Robertson
  ('47165', '47147'), ('47147', '47165'),
  -- Cheatham <-> Robertson
  ('47021', '47147'), ('47147', '47021'),
  -- Cheatham <-> Dickson
  ('47021', '47043'), ('47043', '47021'),
  -- Williamson (TN) <-> Dickson (they share a border on the west side)
  ('47187', '47043'), ('47043', '47187'),

  -- ==========================================================================
  -- Denver, CO metro adjacencies
  -- ==========================================================================

  -- Denver <-> Arapahoe
  ('08031', '08005'), ('08005', '08031'),
  -- Denver <-> Jefferson
  ('08031', '08059'), ('08059', '08031'),
  -- Denver <-> Adams
  ('08031', '08001'), ('08001', '08031'),
  -- Denver <-> Broomfield (small enclave between Adams, Jefferson, Boulder)
  ('08031', '08014'), ('08014', '08031'),
  -- Arapahoe <-> Douglas
  ('08005', '08035'), ('08035', '08005'),
  -- Arapahoe <-> Adams
  ('08005', '08001'), ('08001', '08005'),
  -- Arapahoe <-> Elbert
  ('08005', '08039'), ('08039', '08005'),
  -- Jefferson <-> Douglas
  ('08059', '08035'), ('08035', '08059'),
  -- Jefferson <-> Broomfield
  ('08059', '08014'), ('08014', '08059'),
  -- Jefferson <-> Boulder
  ('08059', '08013'), ('08013', '08059'),
  -- Adams <-> Broomfield
  ('08001', '08014'), ('08014', '08001'),
  -- Adams <-> Boulder
  ('08001', '08013'), ('08013', '08001'),
  -- Broomfield <-> Boulder
  ('08014', '08013'), ('08013', '08014'),
  -- Douglas <-> Elbert
  ('08035', '08039'), ('08039', '08035'),

  -- ==========================================================================
  -- Charlotte, NC metro adjacencies
  -- ==========================================================================

  -- Mecklenburg <-> Cabarrus
  ('37119', '37025'), ('37025', '37119'),
  -- Mecklenburg <-> Gaston
  ('37119', '37071'), ('37071', '37119'),
  -- Mecklenburg <-> Union
  ('37119', '37179'), ('37179', '37119'),
  -- Mecklenburg <-> Iredell
  ('37119', '37097'), ('37097', '37119'),
  -- Mecklenburg <-> Lincoln
  ('37119', '37109'), ('37109', '37119'),
  -- Cabarrus <-> Union
  ('37025', '37179'), ('37179', '37025'),
  -- Cabarrus <-> Rowan
  ('37025', '37159'), ('37159', '37025'),
  -- Cabarrus <-> Stanly
  ('37025', '37167'), ('37167', '37025'),
  -- Gaston <-> Lincoln
  ('37071', '37109'), ('37109', '37071'),
  -- Iredell <-> Rowan
  ('37097', '37159'), ('37159', '37097'),
  -- Iredell <-> Lincoln
  ('37097', '37109'), ('37109', '37097'),
  -- Rowan <-> Stanly
  ('37159', '37167'), ('37167', '37159'),
  -- Union <-> Stanly
  ('37179', '37167'), ('37167', '37179'),

  -- ==========================================================================
  -- Portland, OR/WA metro adjacencies
  -- ==========================================================================

  -- Multnomah <-> Washington
  ('41051', '41067'), ('41067', '41051'),
  -- Multnomah <-> Clackamas
  ('41051', '41005'), ('41005', '41051'),
  -- Multnomah <-> Columbia
  ('41051', '41009'), ('41009', '41051'),
  -- Multnomah <-> Clark (WA) (across Columbia River)
  ('41051', '53011'), ('53011', '41051'),
  -- Washington <-> Clackamas
  ('41067', '41005'), ('41005', '41067'),
  -- Washington <-> Yamhill
  ('41067', '41071'), ('41071', '41067'),
  -- Washington <-> Columbia
  ('41067', '41009'), ('41009', '41067'),
  -- Clackamas <-> Marion
  ('41005', '41047'), ('41047', '41005'),
  -- Clackamas <-> Yamhill
  ('41005', '41071'), ('41071', '41005'),
  -- Yamhill <-> Marion
  ('41071', '41047'), ('41047', '41071'),
  -- Clark (WA) <-> Columbia (OR) (across Columbia River)
  ('53011', '41009'), ('41009', '53011');


-- ============================================================================
-- Seed complete.
-- Total: ~98 industries (18 parents + 80 sub-industries)
--        39 counties across 5 pilot metros
--        ~114 adjacency pairs (57 bidirectional relationships)
-- ============================================================================

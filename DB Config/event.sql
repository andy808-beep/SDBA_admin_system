DROP TABLE IF EXISTS event_general_catalog CASCADE;

CREATE TABLE event_general_catalog (
  event_type text PRIMARY KEY,
  event_type_short_code_general text,
  event_type_ref_name_general_en text NOT NULL,
  event_type_ref_name_general_tc text,
  active boolean DEFAULT true
);

INSERT INTO event_general_catalog (
  event_type,
  event_type_short_code_general,
  event_type_ref_name_general_en,
  event_type_ref_name_general_tc,
  active
) VALUES
  ('warm_up', 'WU', 'Stanley Dragon Boat Warm-Up Races', '赤柱龍舟熱身賽', true),
  ('main_race', 'TN', 'Stanley International Dragon Boat Championships', '赤柱國際龍舟錦標賽', true),
  ('short_course', 'SC', 'Hong Kong Dragon Boat Short Course Races', '香港龍舟短途賽', true);

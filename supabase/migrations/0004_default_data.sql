-- Essential default rows required for the app to function on a fresh
-- database. This is NOT sample/demo content — see supabase/seed.sql for that.

insert into website_settings (id) values (true)
on conflict (id) do nothing;

insert into business_hours (day_of_week, open_time, close_time, is_closed) values
  (0, '10:00', '21:00', false), -- Sunday
  (1, '10:00', '21:00', false), -- Monday
  (2, '10:00', '21:00', false), -- Tuesday
  (3, '10:00', '21:00', false), -- Wednesday
  (4, '10:00', '21:00', false), -- Thursday
  (5, '14:30', '21:00', false), -- Friday (adjust for Jumma prayer break as needed)
  (6, '10:00', '21:00', false)  -- Saturday
on conflict (day_of_week) do nothing;

insert into categories (name, slug, display_order) values
  ('Rings', 'rings', 1),
  ('Earrings', 'earrings', 2),
  ('Necklaces', 'necklaces', 3),
  ('Bangles', 'bangles', 4),
  ('Bracelets', 'bracelets', 5),
  ('Chains', 'chains', 6),
  ('Pendants', 'pendants', 7),
  ('Bridal Sets', 'bridal-sets', 8),
  ('Men''s Jewelry', 'mens-jewelry', 9),
  ('Kids Jewelry', 'kids-jewelry', 10),
  ('New Arrivals', 'new-arrivals', 11),
  ('Custom Designs', 'custom-designs', 12)
on conflict (slug) do nothing;

insert into collections (name, slug, description, display_order) values
  ('Bridal Jewelry', 'bridal-jewelry', 'Exquisite bridal sets for your special day.', 1),
  ('Gold Rings', 'gold-rings', 'Classic and contemporary gold rings.', 2),
  ('Necklaces', 'necklaces', 'Elegant necklaces for every occasion.', 3),
  ('Earrings', 'earrings', 'Traditional and modern earring designs.', 4),
  ('Bangles', 'bangles', 'Handcrafted gold bangles.', 5),
  ('Bracelets', 'bracelets', 'Delicate and statement bracelets.', 6),
  ('Chains', 'chains', 'Fine gold chains in various styles.', 7),
  ('Pendants', 'pendants', 'Beautiful pendant designs.', 8),
  ('Men''s Rings', 'mens-rings', 'Distinguished rings for men.', 9),
  ('Kids Jewelry', 'kids-jewelry', 'Delicate jewelry for children.', 10),
  ('New Arrivals', 'new-arrivals', 'Our latest additions.', 11),
  ('Custom Designs', 'custom-designs', 'One-of-a-kind custom creations.', 12)
on conflict (slug) do nothing;

-- Seed gold_rates with a zeroed, inactive-looking manual rate so the site
-- never crashes on first boot; the admin must enter real rates before
-- automatic-priced products will show a price (see lib/pricing).
insert into gold_rates (purity, rate_per_tola, rate_per_10_grams, rate_per_gram, rate_source, is_manual, is_active)
values
  ('24K', 0, 0, 0, 'Manual', true, true),
  ('22K', 0, 0, 0, 'Manual', true, true),
  ('21K', 0, 0, 0, 'Manual', true, true),
  ('18K', 0, 0, 0, 'Manual', true, true)
on conflict (purity) do nothing;

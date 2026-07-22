-- Sample / demo data for Zarghoon Jewellers.
-- Every row here is clearly flagged: products use is_sample = true and their
-- descriptions are prefixed "[Sample product]". Safe to delete at any time
-- from the admin panel (Products → filter "Sample" → bulk delete) before
-- going live. Images are neutral placeholders (placehold.co), not real
-- product photography — replace them with real photos in the admin panel.
--
-- Run manually against your Supabase project:
--   supabase db execute -f supabase/seed.sql
-- or paste into the Supabase SQL editor. Do NOT run in production once real
-- products exist, unless you intend to add sample rows alongside them.

-- Illustrative example gold rates so the pricing engine has something to
-- calculate with locally. REPLACE THESE with real rates from the admin
-- Gold Rates page before launch.
update gold_rates set
  rate_per_tola = 275000.00,
  rate_per_10_grams = round(275000.00 / 11.6638 * 10, 2),
  rate_per_gram = round(275000.00 / 11.6638, 2),
  rate_source = 'Manual (example seed data)',
  notes = 'Example rate inserted by seed.sql — update with the real market rate.',
  is_manual = true,
  is_active = true
where purity = '24K';

update gold_rates set
  rate_per_tola = round(275000.00 * 22.0 / 24.0, 2),
  rate_per_10_grams = round(275000.00 * 22.0 / 24.0 / 11.6638 * 10, 2),
  rate_per_gram = round(275000.00 * 22.0 / 24.0 / 11.6638, 2),
  rate_source = 'Manual (example seed data)',
  notes = 'Auto-derived from 24K example rate at seed time.',
  is_manual = true,
  is_active = true
where purity = '22K';

update gold_rates set
  rate_per_tola = round(275000.00 * 21.0 / 24.0, 2),
  rate_per_10_grams = round(275000.00 * 21.0 / 24.0 / 11.6638 * 10, 2),
  rate_per_gram = round(275000.00 * 21.0 / 24.0 / 11.6638, 2),
  rate_source = 'Manual (example seed data)',
  notes = 'Auto-derived from 24K example rate at seed time.',
  is_manual = true,
  is_active = true
where purity = '21K';

update gold_rates set
  rate_per_tola = round(275000.00 * 18.0 / 24.0, 2),
  rate_per_10_grams = round(275000.00 * 18.0 / 24.0 / 11.6638 * 10, 2),
  rate_per_gram = round(275000.00 * 18.0 / 24.0 / 11.6638, 2),
  rate_source = 'Manual (example seed data)',
  notes = 'Auto-derived from 24K example rate at seed time.',
  is_manual = true,
  is_active = true
where purity = '18K';

-- Sample products ------------------------------------------------------------

do $$
declare
  cat_rings uuid; cat_earrings uuid; cat_necklaces uuid; cat_bangles uuid;
  cat_bracelets uuid; cat_chains uuid; cat_pendants uuid; cat_bridal uuid;
  cat_mens uuid; cat_kids uuid;
  col_bridal uuid; col_rings uuid; col_necklaces uuid; col_earrings uuid;
  col_bangles uuid; col_new uuid;
  pid uuid;
begin
  select id into cat_rings from categories where slug = 'rings';
  select id into cat_earrings from categories where slug = 'earrings';
  select id into cat_necklaces from categories where slug = 'necklaces';
  select id into cat_bangles from categories where slug = 'bangles';
  select id into cat_bracelets from categories where slug = 'bracelets';
  select id into cat_chains from categories where slug = 'chains';
  select id into cat_pendants from categories where slug = 'pendants';
  select id into cat_bridal from categories where slug = 'bridal-sets';
  select id into cat_mens from categories where slug = 'mens-jewelry';
  select id into cat_kids from categories where slug = 'kids-jewelry';

  select id into col_bridal from collections where slug = 'bridal-jewelry';
  select id into col_rings from collections where slug = 'gold-rings';
  select id into col_necklaces from collections where slug = 'necklaces';
  select id into col_earrings from collections where slug = 'earrings';
  select id into col_bangles from collections where slug = 'bangles';
  select id into col_new from collections where slug = 'new-arrivals';

  -- 1. Bridal necklace set
  insert into products (product_code, name, slug, description, category_id, purity, gross_weight_grams, pricing_method, discount_type, is_bridal, is_featured, is_new_arrival, cover_image_url, is_sample, gender)
  values ('ZJ-BRD-0001', 'Zarghoon Royal Bridal Set', 'zarghoon-royal-bridal-set', '[Sample product] A traditional bridal necklace set with matching earrings, handcrafted in 22K gold with intricate filigree work.', cat_bridal, '22K', 45.500, 'automatic', 'none', true, true, true, 'https://placehold.co/900x900/1a1a1a/c9a24b?text=Bridal+Set', true, 'women')
  returning id into pid;
  insert into product_images (product_id, image_url, alt_text, display_order, is_cover) values
    (pid, 'https://placehold.co/900x900/1a1a1a/c9a24b?text=Bridal+Set+1', 'Zarghoon Royal Bridal Set front view', 1, true),
    (pid, 'https://placehold.co/900x900/262624/e2c780?text=Bridal+Set+2', 'Zarghoon Royal Bridal Set detail view', 2, false);
  insert into product_collections (product_id, collection_id) values (pid, col_bridal), (pid, col_new);

  -- 2. Gold ring
  insert into products (product_code, name, slug, description, category_id, purity, gross_weight_grams, pricing_method, discount_type, discount_value, is_featured, cover_image_url, is_sample, gender)
  values ('ZJ-RNG-0001', 'Classic Gold Solitaire Ring', 'classic-gold-solitaire-ring', '[Sample product] An elegant 21K gold ring with a traditional band design, perfect for everyday wear.', cat_rings, '21K', 6.250, 'automatic', 'percentage', 5, true, 'https://placehold.co/900x900/1a1a1a/c9a24b?text=Gold+Ring', true, 'women')
  returning id into pid;
  insert into product_images (product_id, image_url, alt_text, display_order, is_cover) values
    (pid, 'https://placehold.co/900x900/1a1a1a/c9a24b?text=Gold+Ring+1', 'Classic Gold Solitaire Ring', 1, true);
  insert into product_collections (product_id, collection_id) values (pid, col_rings);

  -- 3. Men's ring
  insert into products (product_code, name, slug, description, category_id, purity, gross_weight_grams, pricing_method, cover_image_url, is_sample, gender)
  values ('ZJ-MEN-0001', 'Men''s Traditional Gold Band', 'mens-traditional-gold-band', '[Sample product] A sturdy 22K gold band designed for men, with a brushed matte finish.', cat_mens, '22K', 8.750, 'automatic', 'https://placehold.co/900x900/1a1a1a/e2c780?text=Mens+Ring', true, 'men')
  returning id into pid;
  insert into product_images (product_id, image_url, alt_text, display_order, is_cover) values
    (pid, 'https://placehold.co/900x900/1a1a1a/e2c780?text=Mens+Ring+1', 'Men''s Traditional Gold Band', 1, true);

  -- 4. Necklace
  insert into products (product_code, name, slug, description, category_id, purity, gross_weight_grams, pricing_method, is_featured, cover_image_url, is_sample, gender)
  values ('ZJ-NCK-0001', 'Traditional Gold Necklace', 'traditional-gold-necklace', '[Sample product] A beautifully crafted 22K gold necklace with traditional Balochi-inspired motifs.', cat_necklaces, '22K', 28.300, 'automatic', true, 'https://placehold.co/900x900/1a1a1a/c9a24b?text=Necklace', true, 'women')
  returning id into pid;
  insert into product_images (product_id, image_url, alt_text, display_order, is_cover) values
    (pid, 'https://placehold.co/900x900/1a1a1a/c9a24b?text=Necklace+1', 'Traditional Gold Necklace', 1, true);
  insert into product_collections (product_id, collection_id) values (pid, col_necklaces);

  -- 5. Earrings
  insert into products (product_code, name, slug, description, category_id, purity, gross_weight_grams, pricing_method, is_new_arrival, cover_image_url, is_sample, gender)
  values ('ZJ-EAR-0001', 'Gold Jhumka Earrings', 'gold-jhumka-earrings', '[Sample product] Classic bell-shaped jhumka earrings in 21K gold, a timeless traditional design.', cat_earrings, '21K', 9.400, 'automatic', true, 'https://placehold.co/900x900/1a1a1a/e2c780?text=Earrings', true, 'women')
  returning id into pid;
  insert into product_images (product_id, image_url, alt_text, display_order, is_cover) values
    (pid, 'https://placehold.co/900x900/1a1a1a/e2c780?text=Earrings+1', 'Gold Jhumka Earrings', 1, true);
  insert into product_collections (product_id, collection_id) values (pid, col_earrings), (pid, col_new);

  -- 6. Bangles (set)
  insert into products (product_code, name, slug, description, category_id, purity, gross_weight_grams, pricing_method, cover_image_url, is_sample, gender)
  values ('ZJ-BNG-0001', 'Set of Gold Bangles (Pair)', 'set-of-gold-bangles-pair', '[Sample product] A pair of handcrafted 22K gold bangles with an engraved pattern.', cat_bangles, '22K', 22.000, 'automatic', 'https://placehold.co/900x900/1a1a1a/c9a24b?text=Bangles', true, 'women')
  returning id into pid;
  insert into product_images (product_id, image_url, alt_text, display_order, is_cover) values
    (pid, 'https://placehold.co/900x900/1a1a1a/c9a24b?text=Bangles+1', 'Set of Gold Bangles', 1, true);
  insert into product_collections (product_id, collection_id) values (pid, col_bangles);

  -- 7. Bracelet
  insert into products (product_code, name, slug, description, category_id, purity, gross_weight_grams, pricing_method, cover_image_url, is_sample, gender)
  values ('ZJ-BRC-0001', 'Delicate Gold Chain Bracelet', 'delicate-gold-chain-bracelet', '[Sample product] A fine 18K gold bracelet, lightweight and elegant for daily wear.', cat_bracelets, '18K', 4.100, 'automatic', 'https://placehold.co/900x900/1a1a1a/e2c780?text=Bracelet', true, 'women')
  returning id into pid;
  insert into product_images (product_id, image_url, alt_text, display_order, is_cover) values
    (pid, 'https://placehold.co/900x900/1a1a1a/e2c780?text=Bracelet+1', 'Delicate Gold Chain Bracelet', 1, true);

  -- 8. Chain
  insert into products (product_code, name, slug, description, category_id, purity, gross_weight_grams, pricing_method, cover_image_url, is_sample, gender)
  values ('ZJ-CHN-0001', 'Men''s Gold Curb Chain', 'mens-gold-curb-chain', '[Sample product] A bold 21K gold curb chain, 20 inches, for a strong statement look.', cat_chains, '21K', 15.600, 'automatic', 'https://placehold.co/900x900/1a1a1a/c9a24b?text=Chain', true, 'men')
  returning id into pid;
  insert into product_images (product_id, image_url, alt_text, display_order, is_cover) values
    (pid, 'https://placehold.co/900x900/1a1a1a/c9a24b?text=Chain+1', 'Men''s Gold Curb Chain', 1, true);

  -- 9. Pendant
  insert into products (product_code, name, slug, description, category_id, purity, gross_weight_grams, pricing_method, cover_image_url, is_sample, gender)
  values ('ZJ-PND-0001', 'Gold Crescent Pendant', 'gold-crescent-pendant', '[Sample product] A delicate crescent moon pendant in 18K gold.', cat_pendants, '18K', 2.800, 'automatic', 'https://placehold.co/900x900/1a1a1a/e2c780?text=Pendant', true, 'women')
  returning id into pid;
  insert into product_images (product_id, image_url, alt_text, display_order, is_cover) values
    (pid, 'https://placehold.co/900x900/1a1a1a/e2c780?text=Pendant+1', 'Gold Crescent Pendant', 1, true);

  -- 10. Kids jewelry
  insert into products (product_code, name, slug, description, category_id, purity, gross_weight_grams, pricing_method, cover_image_url, is_sample, gender)
  values ('ZJ-KID-0001', 'Kids Gold Ring (Small)', 'kids-gold-ring-small', '[Sample product] A tiny 18K gold ring sized for children, adjustable band.', cat_kids, '18K', 1.200, 'automatic', 'https://placehold.co/900x900/1a1a1a/c9a24b?text=Kids+Ring', true, 'kids')
  returning id into pid;
  insert into product_images (product_id, image_url, alt_text, display_order, is_cover) values
    (pid, 'https://placehold.co/900x900/1a1a1a/c9a24b?text=Kids+Ring+1', 'Kids Gold Ring', 1, true);

  -- 11. Contact for latest price example
  insert into products (product_code, name, slug, description, category_id, purity, gross_weight_grams, pricing_method, cover_image_url, is_sample, gender)
  values ('ZJ-BRD-0002', 'Heritage Bridal Necklace (Heavy)', 'heritage-bridal-necklace-heavy', '[Sample product] An heirloom-style heavy bridal necklace. Contact the showroom for the latest price.', cat_bridal, '22K', 85.000, 'contact', 'https://placehold.co/900x900/1a1a1a/e2c780?text=Heritage+Set', true, 'women')
  returning id into pid;
  insert into product_images (product_id, image_url, alt_text, display_order, is_cover) values
    (pid, 'https://placehold.co/900x900/1a1a1a/e2c780?text=Heritage+Set+1', 'Heritage Bridal Necklace', 1, true);
  insert into product_collections (product_id, collection_id) values (pid, col_bridal);

  -- 12. Fixed price example
  insert into products (product_code, name, slug, description, category_id, purity, gross_weight_grams, pricing_method, fixed_price, cover_image_url, is_sample, gender)
  values ('ZJ-RNG-0002', 'Designer Gold Ring (Fixed Price)', 'designer-gold-ring-fixed-price', '[Sample product] A designer ring sold at a fixed showroom price including craftsmanship charges.', cat_rings, '21K', 5.000, 'fixed', 45000, 'https://placehold.co/900x900/1a1a1a/c9a24b?text=Designer+Ring', true, 'women')
  returning id into pid;
  insert into product_images (product_id, image_url, alt_text, display_order, is_cover) values
    (pid, 'https://placehold.co/900x900/1a1a1a/c9a24b?text=Designer+Ring+1', 'Designer Gold Ring', 1, true);
end $$;

-- Sample testimonials ----------------------------------------------------

insert into testimonials (customer_name, rating, review, is_approved, is_featured, display_order) values
  ('Ahmed R.', 5, '[Sample testimonial] Excellent quality gold and very transparent about weight and rates. Bought my wife''s bridal set here.', true, true, 1),
  ('Sana K.', 5, '[Sample testimonial] Beautiful traditional designs and honest pricing. Highly recommend Zarghoon Jewellers.', true, true, 2),
  ('Bilal M.', 4, '[Sample testimonial] Good collection of men''s rings and chains. Friendly staff at the Sarafa Market showroom.', true, false, 3);

-- Sample banner ------------------------------------------------------------

insert into banners (title, subtitle, image_url, button_text, button_url, is_active, display_order) values
  ('[Sample] New Bridal Collection', 'Handcrafted for your special day', 'https://placehold.co/1600x600/1a1a1a/c9a24b?text=Zarghoon+Jewellers', 'Explore Collection', '/collections/bridal-jewelry', true, 1);

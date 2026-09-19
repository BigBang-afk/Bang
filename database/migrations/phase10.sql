-- Phase 10: Final Deployment + Hosting + Launch Preparation
--
-- Seeds the new settings this phase introduces (maintenance mode toggle,
-- SMTP email configuration) so they exist with sane, inert defaults from
-- the moment this migration runs, rather than only appearing once an
-- admin happens to save the Settings page once. INSERT IGNORE means this
-- is safe to re-run and never overwrites a value an admin already set.

INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
('maintenance_mode', '0'),
('smtp_host', ''),
('smtp_port', '587'),
('smtp_username', ''),
('smtp_password', ''),
('smtp_encryption', 'tls'),
('smtp_from_email', ''),
('smtp_from_name', '');

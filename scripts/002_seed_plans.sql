-- Insert subscription plans
INSERT INTO public.subscription_plans (name, duration_months, price_rub, price_per_month, max_devices, is_popular)
VALUES 
  ('1 месяц', 1, 199, 199, 5, FALSE),
  ('3 месяца', 3, 499, 166, 5, FALSE),
  ('6 месяцев', 6, 949, 158, 5, TRUE),
  ('1 год', 12, 1699, 142, 5, FALSE)
ON CONFLICT DO NOTHING;

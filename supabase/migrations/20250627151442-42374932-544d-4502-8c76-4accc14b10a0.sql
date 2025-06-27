
-- Update get_school_transactions function to include student names for subscription payments
CREATE OR REPLACE FUNCTION public.get_school_transactions(p_school_id uuid)
 RETURNS TABLE(id uuid, type text, amount numeric, currency text, transaction_date date, description text, notes text, status text, contact_name text, contact_type text, category_name text, category_full_path text, from_account_name text, to_account_name text, payment_method text, receipt_number text, receipt_url text, tax_amount numeric, tax_rate numeric, is_recurring boolean, recurring_frequency text, created_at timestamp with time zone, tags jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.type,
    t.amount,
    t.currency,
    t.transaction_date,
    t.description,
    t.notes,
    t.status,
    -- Prioritize student name from subscription, then contact name, then 'Unknown'
    COALESCE(
      CASE 
        WHEN t.subscription_id IS NOT NULL THEN (su.first_name || ' ' || su.last_name)
        ELSE NULL 
      END,
      c.name,
      'Unknown'
    ) as contact_name,
    COALESCE(
      CASE 
        WHEN t.subscription_id IS NOT NULL THEN 'student'
        ELSE c.type 
      END,
      'unknown'
    ) as contact_type,
    tc.name as category_name,
    public.get_category_path(tc.id) as category_full_path,
    fa.name as from_account_name,
    ta.name as to_account_name,
    t.payment_method,
    t.receipt_number,
    t.receipt_url,
    t.tax_amount,
    t.tax_rate,
    t.is_recurring,
    t.recurring_frequency,
    t.created_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', tt.id,
          'name', tt.name,
          'color', tt.color
        )
      ) FILTER (WHERE tt.id IS NOT NULL),
      '[]'::jsonb
    ) as tags
  FROM public.transactions t
  LEFT JOIN public.contacts c ON t.contact_id = c.id
  LEFT JOIN public.transaction_categories tc ON t.category_id = tc.id
  LEFT JOIN public.accounts fa ON t.from_account_id = fa.id
  LEFT JOIN public.accounts ta ON t.to_account_id = ta.id
  LEFT JOIN public.transaction_tags_junction ttj ON t.id = ttj.transaction_id
  LEFT JOIN public.transaction_tags tt ON ttj.tag_id = tt.id
  -- Join with subscriptions and student users to get student names
  LEFT JOIN public.subscriptions sub ON t.subscription_id = sub.id
  LEFT JOIN public.students s ON sub.student_id = s.id
  LEFT JOIN public.users su ON s.user_id = su.id
  WHERE t.school_id = p_school_id
  GROUP BY t.id, t.type, t.amount, t.currency, t.transaction_date, t.description, 
           t.notes, t.status, t.subscription_id, su.first_name, su.last_name, 
           c.name, c.type, tc.name, tc.id, fa.name, ta.name,
           t.payment_method, t.receipt_number, t.receipt_url, t.tax_amount, 
           t.tax_rate, t.is_recurring, t.recurring_frequency, t.created_at
  ORDER BY t.transaction_date DESC, t.created_at DESC;
END;
$function$

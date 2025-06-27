
-- Fix ambiguous column reference in create_transaction function
CREATE OR REPLACE FUNCTION public.create_transaction(
  p_school_id uuid, 
  p_type text, 
  p_amount numeric, 
  p_currency text, 
  p_transaction_date date, 
  p_description text, 
  p_notes text DEFAULT NULL::text, 
  p_contact_id uuid DEFAULT NULL::uuid, 
  p_category_id uuid DEFAULT NULL::uuid, 
  p_from_account_id uuid DEFAULT NULL::uuid, 
  p_to_account_id uuid DEFAULT NULL::uuid, 
  p_payment_method text DEFAULT NULL::text, 
  p_receipt_number text DEFAULT NULL::text, 
  p_receipt_url text DEFAULT NULL::text, 
  p_tax_amount numeric DEFAULT 0, 
  p_tax_rate numeric DEFAULT 0, 
  p_is_recurring boolean DEFAULT false, 
  p_recurring_frequency text DEFAULT NULL::text, 
  p_recurring_end_date date DEFAULT NULL::date, 
  p_tag_ids uuid[] DEFAULT NULL::uuid[]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_transaction_id UUID;
  current_tag_id UUID;
BEGIN
  -- Insert the new transaction
  INSERT INTO public.transactions (
    school_id, type, amount, currency, transaction_date, description, notes,
    contact_id, category_id, from_account_id, to_account_id, payment_method,
    receipt_number, receipt_url, tax_amount, tax_rate, is_recurring,
    recurring_frequency, recurring_end_date
  ) VALUES (
    p_school_id, p_type, p_amount, p_currency, p_transaction_date, p_description, p_notes,
    p_contact_id, p_category_id, p_from_account_id, p_to_account_id, p_payment_method,
    p_receipt_number, p_receipt_url, p_tax_amount, p_tax_rate, p_is_recurring,
    p_recurring_frequency, p_recurring_end_date
  ) RETURNING id INTO new_transaction_id;
  
  -- Add tags if provided
  IF p_tag_ids IS NOT NULL THEN
    FOREACH current_tag_id IN ARRAY p_tag_ids
    LOOP
      INSERT INTO public.transaction_tags_junction (transaction_id, tag_id)
      VALUES (new_transaction_id, current_tag_id)
      ON CONFLICT (transaction_id, tag_id) DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN new_transaction_id;
END;
$function$

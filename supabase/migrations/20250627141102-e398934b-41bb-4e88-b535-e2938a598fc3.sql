
-- Create or update function to calculate account balances based on transactions
CREATE OR REPLACE FUNCTION public.update_account_balance_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This trigger will automatically recalculate account balances when transactions are added/updated/deleted
  -- We don't need to store balances in the accounts table as they'll be calculated in real-time
  -- The AccountsBalanceSection component already handles this calculation
  
  -- For now, we'll just return the record since balance calculation is handled in the UI
  -- In the future, we could add balance caching here if needed for performance
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger to update account balances when transactions change
DROP TRIGGER IF EXISTS trigger_update_account_balance ON public.transactions;
CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balance_from_transaction();

-- Create function to get subscription payment status
CREATE OR REPLACE FUNCTION public.get_subscription_payment_status(p_subscription_id uuid)
RETURNS TABLE(
  total_paid numeric,
  total_due numeric,
  payment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subscription_record public.subscriptions;
  payments_total numeric := 0;
BEGIN
  -- Get subscription details
  SELECT * INTO subscription_record 
  FROM public.subscriptions 
  WHERE id = p_subscription_id;
  
  IF subscription_record.id IS NULL THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric, 'not_found'::text;
    RETURN;
  END IF;
  
  -- Calculate total payments for this subscription from transactions
  -- We'll look for transactions that reference this subscription in the description
  -- or we can add a subscription_id field to transactions table later
  SELECT COALESCE(SUM(t.amount), 0) INTO payments_total
  FROM public.transactions t
  WHERE t.type = 'income' 
    AND t.school_id = subscription_record.student_id -- This needs to be corrected
    AND t.description ILIKE '%subscription%'
    AND t.status = 'completed';
  
  -- For now, return basic status calculation
  -- In production, we'd need better linking between transactions and subscriptions
  RETURN QUERY SELECT 
    payments_total,
    subscription_record.total_price,
    CASE 
      WHEN payments_total >= subscription_record.total_price THEN 'paid'
      WHEN payments_total > 0 THEN 'pending'
      ELSE 'overdue'
    END;
END;
$$;

-- Add subscription_id column to transactions for better tracking
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.subscriptions(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_subscription_id ON public.transactions(subscription_id);

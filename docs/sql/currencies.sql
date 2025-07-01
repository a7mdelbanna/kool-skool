
-- =====================================================
-- CURRENCIES TABLE
-- =====================================================
-- Purpose: Store currency configuration for multi-currency support
-- Each school can define multiple currencies with exchange rates
-- =====================================================

CREATE TABLE public.currencies (
    -- Primary identifier
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    
    -- Currency information
    name TEXT NOT NULL, -- e.g., "US Dollar"
    symbol TEXT NOT NULL, -- e.g., "$"
    code TEXT NOT NULL, -- e.g., "USD"
    exchange_rate NUMERIC NOT NULL DEFAULT 1.0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.currencies IS 'Currency configuration for multi-currency support';
COMMENT ON COLUMN public.currencies.id IS 'Unique identifier for each currency';
COMMENT ON COLUMN public.currencies.school_id IS 'Reference to the school using this currency';
COMMENT ON COLUMN public.currencies.name IS 'Full currency name (e.g., US Dollar, Euro)';
COMMENT ON COLUMN public.currencies.symbol IS 'Currency symbol (e.g., $, €, £)';
COMMENT ON COLUMN public.currencies.code IS 'ISO currency code (e.g., USD, EUR, GBP)';
COMMENT ON COLUMN public.currencies.exchange_rate IS 'Exchange rate relative to base currency';
COMMENT ON COLUMN public.currencies.is_default IS 'Whether this is the default currency for the school';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_currencies_school_id ON public.currencies(school_id);
CREATE INDEX idx_currencies_code ON public.currencies(code);
CREATE INDEX idx_currencies_is_default ON public.currencies(is_default);

-- Unique constraint to prevent duplicate currency codes per school
CREATE UNIQUE INDEX idx_currencies_school_code_unique ON public.currencies(school_id, code);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Users can view currencies from their school
CREATE POLICY "School users can view currencies" 
ON public.currencies FOR SELECT 
USING (
    school_id IN (
        SELECT school_id FROM public.users WHERE id = auth.uid()
    )
);

-- Only admins can manage currencies
CREATE POLICY "Admins can manage currencies" 
ON public.currencies FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
        AND school_id = currencies.school_id
    )
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_currencies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_currencies_updated_at
    BEFORE UPDATE ON public.currencies
    FOR EACH ROW EXECUTE FUNCTION update_currencies_updated_at();

-- Trigger to ensure only one default currency per school
CREATE OR REPLACE FUNCTION ensure_single_default_currency()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Remove default from all other currencies in the same school
        UPDATE public.currencies 
        SET is_default = false 
        WHERE school_id = NEW.school_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_currency
    AFTER INSERT OR UPDATE ON public.currencies
    FOR EACH ROW EXECUTE FUNCTION ensure_single_default_currency();

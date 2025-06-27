
-- Create storage bucket for transaction receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('transaction-receipts', 'transaction-receipts', true);

-- Create storage policy to allow authenticated users to upload receipts
CREATE POLICY "Allow authenticated users to upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'transaction-receipts' AND auth.role() = 'authenticated');

-- Create storage policy to allow authenticated users to view receipts
CREATE POLICY "Allow authenticated users to view receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'transaction-receipts' AND auth.role() = 'authenticated');

-- Create storage policy to allow authenticated users to update receipts
CREATE POLICY "Allow authenticated users to update receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'transaction-receipts' AND auth.role() = 'authenticated');

-- Create storage policy to allow authenticated users to delete receipts
CREATE POLICY "Allow authenticated users to delete receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'transaction-receipts' AND auth.role() = 'authenticated');

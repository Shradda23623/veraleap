
-- Allow anyone to see broker roles (needed for the public brokers listing page)
CREATE POLICY "Anyone can view broker roles"
ON public.user_roles
FOR SELECT
TO public
USING (role = 'broker');

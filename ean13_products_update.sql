-- Add codigo_barras column to productos table
ALTER TABLE public.productos
ADD COLUMN IF NOT EXISTS codigo_barras TEXT UNIQUE;

-- Create index for codigo_barras
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON public.productos(codigo_barras);

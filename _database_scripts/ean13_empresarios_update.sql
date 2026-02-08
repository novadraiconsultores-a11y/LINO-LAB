-- EAN-13 Labeling Logic Columns

-- Add prefijo_letra column
ALTER TABLE public.empresarios 
ADD COLUMN IF NOT EXISTS prefijo_letra CHAR(1) UNIQUE;

-- Add prefijo_numerico column
ALTER TABLE public.empresarios 
ADD COLUMN IF NOT EXISTS prefijo_numerico INT UNIQUE;

-- Add ultimo_consecutivo column
ALTER TABLE public.empresarios 
ADD COLUMN IF NOT EXISTS ultimo_consecutivo INT DEFAULT 0;

-- Create index for prefijo_letra
CREATE INDEX IF NOT EXISTS idx_empresarios_prefijo_letra ON public.empresarios(prefijo_letra);

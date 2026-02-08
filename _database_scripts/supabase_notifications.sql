-- ==========================================
-- 1. CONFIGURACIÓN INICIAL Y TABLA
-- ==========================================

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS COMPLEJAS
-- 1. Ver mis propias notificaciones
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- 2. Marcar como leídas (UPDATE) mis propias notificaciones
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 2. FUNCIÓN MAESTRA (SECURITY DEFINER)
-- ==========================================
-- Esta función se ejecuta con privilegios de superusuario para poder leer
-- la tabla 'perfiles' y buscar a los destinatarios (admins, gerentes, etc.),
-- incluso si el usuario que dispara el evento es un vendedor sin permisos de lectura global.

CREATE OR REPLACE FUNCTION public.create_notification_for_roles(
  target_roles text[],
  title text,
  message text,
  type text DEFAULT 'info'
) RETURNS void AS $$
DECLARE
  target_user record;
BEGIN
  -- Buscar usuarios que tengan uno de los roles destino
  FOR target_user IN
    SELECT id_perfil FROM public.perfiles WHERE rol = ANY(target_roles)
  LOOP
    -- Insertar notificación segura
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (target_user.id_perfil, title, message, type);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 3. TRIGGERS AUTOMÁTICOS
-- ==========================================

-- 3.1 NUEVA VENTA (Ventas Cabecera)
CREATE OR REPLACE FUNCTION public.trigger_new_sale() RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.create_notification_for_roles(
    ARRAY['admin', 'gerente'], -- Destinatarios
    'Nueva Venta',
    'Nueva venta registrada por $' || NEW.total,
    'success'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_sale ON public.ventas_cabecera;
CREATE TRIGGER on_new_sale
AFTER INSERT ON public.ventas_cabecera
FOR EACH ROW EXECUTE FUNCTION public.trigger_new_sale();


-- 3.2 NUEVO ABASTECIMIENTO (Abastecimientos Cabecera)
CREATE OR REPLACE FUNCTION public.trigger_new_supply() RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.create_notification_for_roles(
    ARRAY['admin', 'gerente'],
    'Nuevo Abastecimiento',
    'Entrada de mercancía registrada',
    'info'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_supply ON public.abastecimientos_cabecera;
CREATE TRIGGER on_new_supply
AFTER INSERT ON public.abastecimientos_cabecera
FOR EACH ROW EXECUTE FUNCTION public.trigger_new_supply();


-- 3.3 NUEVO EMPRESARIO (Empresarios)
CREATE OR REPLACE FUNCTION public.trigger_new_owner() RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.create_notification_for_roles(
    ARRAY['admin'],
    'Nuevo Empresario',
    'Un nuevo empresario ha sido registrado',
    'info'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_owner ON public.empresarios;
CREATE TRIGGER on_new_owner
AFTER INSERT ON public.empresarios
FOR EACH ROW EXECUTE FUNCTION public.trigger_new_owner();


-- 3.4 ALERTA DE STOCK CRÍTICO (Inventario UPDATE)
-- Detecta cuando el stock cruza el umbral hacia abajo
CREATE OR REPLACE FUNCTION public.trigger_low_stock() RETURNS TRIGGER AS $$
DECLARE
  product_name text;
  min_stock int;
BEGIN
  -- CORRECCIÓN: Usamos NEW.ref_producto_id en lugar de NEW.id_producto
  SELECT nombre_producto, min_stock_alerta INTO product_name, min_stock
  FROM public.productos
  WHERE id_producto = NEW.ref_producto_id; -- <--- AQUÍ ESTABA EL DETALLE

  -- Si el producto no tiene alerta configurada, usar 5 por defecto
  IF min_stock IS NULL THEN
      min_stock := 5;
  END IF;

  -- Lógica de cruce de umbral:
  -- Nuevo stock es MENOR o IGUAL al mínimo Y Viejo stock ERA MAYOR
  IF NEW.cantidad <= min_stock AND OLD.cantidad > min_stock THEN
     PERFORM public.create_notification_for_roles(
       ARRAY['admin', 'gerente'],
       'Alerta de Stock Crítico',
       'El producto "' || product_name || '" ha bajado a ' || NEW.cantidad || ' unidades.',
       'error'
     );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_stock_update ON public.inventario;
CREATE TRIGGER on_stock_update
AFTER UPDATE ON public.inventario
FOR EACH ROW EXECUTE FUNCTION public.trigger_low_stock();

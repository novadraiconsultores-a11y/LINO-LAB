-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.abastecimientos_cabecera (
  id_abastecimiento bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fecha_entrada timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  ref_empresario_id uuid,
  referencia_documento text,
  total_costo_entrada numeric DEFAULT 0,
  usuario_responsable_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  ref_sucursal_id uuid,
  CONSTRAINT abastecimientos_cabecera_pkey PRIMARY KEY (id_abastecimiento),
  CONSTRAINT abastecimientos_cabecera_ref_empresario_id_fkey FOREIGN KEY (ref_empresario_id) REFERENCES public.empresarios(id_empresario),
  CONSTRAINT abastecimientos_cabecera_usuario_responsable_id_fkey FOREIGN KEY (usuario_responsable_id) REFERENCES auth.users(id),
  CONSTRAINT abastecimientos_cabecera_ref_sucursal_id_fkey FOREIGN KEY (ref_sucursal_id) REFERENCES public.sucursales(id_sucursal)
);
CREATE TABLE public.abastecimientos_detalle (
  id_detalle_entrada bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ref_abastecimiento_id bigint,
  ref_producto_id uuid,
  cantidad_ingresada integer NOT NULL,
  costo_unitario_ingreso numeric NOT NULL,
  codigo_lote text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT abastecimientos_detalle_pkey PRIMARY KEY (id_detalle_entrada),
  CONSTRAINT abastecimientos_detalle_ref_abastecimiento_id_fkey FOREIGN KEY (ref_abastecimiento_id) REFERENCES public.abastecimientos_cabecera(id_abastecimiento),
  CONSTRAINT abastecimientos_detalle_ref_producto_id_fkey FOREIGN KEY (ref_producto_id) REFERENCES public.productos(id_producto)
);
CREATE TABLE public.empresarios (
  id_empresario uuid NOT NULL DEFAULT uuid_generate_v4(),
  nombre_empresario text NOT NULL,
  telefono_empresario text,
  email_empresario text,
  comision_pactada numeric DEFAULT 15.00,
  fecha_registro timestamp with time zone DEFAULT now(),
  CONSTRAINT empresarios_pkey PRIMARY KEY (id_empresario)
);
CREATE TABLE public.inventario (
  id_inventario uuid NOT NULL DEFAULT gen_random_uuid(),
  ref_sucursal_id uuid NOT NULL,
  ref_producto_id uuid NOT NULL,
  cantidad integer DEFAULT 0 CHECK (cantidad >= 0),
  ubicacion_fisica text,
  last_updated timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT inventario_pkey PRIMARY KEY (id_inventario),
  CONSTRAINT inventario_ref_sucursal_id_fkey FOREIGN KEY (ref_sucursal_id) REFERENCES public.sucursales(id_sucursal),
  CONSTRAINT inventario_ref_producto_id_fkey FOREIGN KEY (ref_producto_id) REFERENCES public.productos(id_producto)
);
CREATE TABLE public.movimientos_inventario (
  id_movimiento uuid NOT NULL DEFAULT uuid_generate_v4(),
  ref_producto_id uuid,
  tipo_movimiento text NOT NULL CHECK (tipo_movimiento = ANY (ARRAY['ENTRADA'::text, 'SALIDA'::text, 'AJUSTE'::text, 'DEVOLUCION'::text])),
  cantidad integer NOT NULL,
  lote_codigo text,
  fecha_movimiento timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  usuario_responsable_id uuid,
  notas_movimiento text,
  CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id_movimiento),
  CONSTRAINT movimientos_inventario_ref_producto_id_fkey FOREIGN KEY (ref_producto_id) REFERENCES public.productos(id_producto),
  CONSTRAINT movimientos_inventario_usuario_responsable_id_fkey FOREIGN KEY (usuario_responsable_id) REFERENCES auth.users(id)
);
CREATE TABLE public.perfiles (
  id_perfil uuid NOT NULL,
  nombre_completo text,
  rol text DEFAULT 'vendedor'::text CHECK (rol = ANY (ARRAY['admin'::text, 'gerente'::text, 'vendedor'::text])),
  sucursal_asignada_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  email text UNIQUE,
  CONSTRAINT perfiles_pkey PRIMARY KEY (id_perfil),
  CONSTRAINT perfiles_sucursal_asignada_id_fkey FOREIGN KEY (sucursal_asignada_id) REFERENCES public.sucursales(id_sucursal)
);
CREATE TABLE public.productos (
  id_producto uuid NOT NULL DEFAULT uuid_generate_v4(),
  sku_producto text NOT NULL UNIQUE,
  nombre_producto text NOT NULL,
  descripcion_producto text,
  imagen_producto_url text,
  talla_producto text,
  color_producto text,
  categoria_producto text,
  costo_producto numeric DEFAULT 0,
  precio_venta numeric DEFAULT 0,
  stock_actual integer DEFAULT 0,
  min_stock_alerta integer DEFAULT 2,
  ref_empresario_id uuid,
  ref_proveedor_id bigint,
  created_at timestamp with time zone DEFAULT now(),
  calidad_producto text,
  genero_producto text,
  deporte_producto text,
  equipo_producto text,
  CONSTRAINT productos_pkey PRIMARY KEY (id_producto),
  CONSTRAINT productos_ref_empresario_id_fkey FOREIGN KEY (ref_empresario_id) REFERENCES public.empresarios(id_empresario),
  CONSTRAINT productos_ref_proveedor_id_fkey FOREIGN KEY (ref_proveedor_id) REFERENCES public.proveedores(id_proveedor)
);
CREATE TABLE public.proveedores (
  id_proveedor bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre_proveedor text NOT NULL,
  contacto_proveedor text,
  telefono_proveedor text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT proveedores_pkey PRIMARY KEY (id_proveedor)
);
CREATE TABLE public.sucursales (
  id_sucursal uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  direccion text,
  telefono text,
  es_matriz boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT sucursales_pkey PRIMARY KEY (id_sucursal)
);
CREATE TABLE public.traspasos_cabecera (
  id_traspaso uuid NOT NULL DEFAULT gen_random_uuid(),
  fecha_creacion timestamp with time zone DEFAULT now(),
  fecha_envio timestamp with time zone,
  fecha_recepcion timestamp with time zone,
  ref_sucursal_origen_id uuid NOT NULL,
  ref_sucursal_destino_id uuid NOT NULL,
  estado text NOT NULL DEFAULT 'PENDIENTE'::text CHECK (estado = ANY (ARRAY['PENDIENTE'::text, 'EN_TRANSITO'::text, 'COMPLETADO'::text, 'CANCELADO'::text, 'RECHAZADO'::text])),
  usuario_creador_id uuid,
  usuario_receptor_id uuid,
  notas_envio text,
  CONSTRAINT traspasos_cabecera_pkey PRIMARY KEY (id_traspaso),
  CONSTRAINT traspasos_cabecera_ref_sucursal_origen_id_fkey FOREIGN KEY (ref_sucursal_origen_id) REFERENCES public.sucursales(id_sucursal),
  CONSTRAINT traspasos_cabecera_ref_sucursal_destino_id_fkey FOREIGN KEY (ref_sucursal_destino_id) REFERENCES public.sucursales(id_sucursal),
  CONSTRAINT traspasos_cabecera_usuario_creador_id_fkey FOREIGN KEY (usuario_creador_id) REFERENCES auth.users(id),
  CONSTRAINT traspasos_cabecera_usuario_receptor_id_fkey FOREIGN KEY (usuario_receptor_id) REFERENCES auth.users(id)
);
CREATE TABLE public.traspasos_detalle (
  id_detalle_traspaso bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ref_traspaso_id uuid,
  ref_producto_id uuid NOT NULL,
  cantidad_enviada integer NOT NULL CHECK (cantidad_enviada > 0),
  cantidad_recibida integer DEFAULT 0,
  CONSTRAINT traspasos_detalle_pkey PRIMARY KEY (id_detalle_traspaso),
  CONSTRAINT traspasos_detalle_ref_traspaso_id_fkey FOREIGN KEY (ref_traspaso_id) REFERENCES public.traspasos_cabecera(id_traspaso),
  CONSTRAINT traspasos_detalle_ref_producto_id_fkey FOREIGN KEY (ref_producto_id) REFERENCES public.productos(id_producto)
);
CREATE TABLE public.ventas_cabecera (
  id_venta bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fecha_venta timestamp with time zone DEFAULT now(),
  total_venta numeric NOT NULL,
  metodo_pago text NOT NULL,
  cliente_contacto text,
  ref_sucursal_id uuid,
  CONSTRAINT ventas_cabecera_pkey PRIMARY KEY (id_venta),
  CONSTRAINT ventas_cabecera_ref_sucursal_id_fkey FOREIGN KEY (ref_sucursal_id) REFERENCES public.sucursales(id_sucursal)
);
CREATE TABLE public.ventas_detalle (
  id_detalle bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ref_venta_id bigint,
  ref_producto_id uuid,
  cantidad_vendida integer NOT NULL,
  precio_unitario_aplicado numeric NOT NULL,
  subtotal_renglon numeric NOT NULL,
  CONSTRAINT ventas_detalle_pkey PRIMARY KEY (id_detalle),
  CONSTRAINT ventas_detalle_ref_venta_id_fkey FOREIGN KEY (ref_venta_id) REFERENCES public.ventas_cabecera(id_venta),
  CONSTRAINT ventas_detalle_ref_producto_id_fkey FOREIGN KEY (ref_producto_id) REFERENCES public.productos(id_producto)
);
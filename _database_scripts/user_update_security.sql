-- Function to update a user's role and branch in both public.perfiles and auth.users metadata
CREATE OR REPLACE FUNCTION actualizar_usuario_admin(
    target_user_id UUID,
    nuevo_rol TEXT,
    nueva_sucursal UUID
) 
RETURNS VOID AS $$
BEGIN
    -- 1. Update public.perfiles
    UPDATE public.perfiles
    SET 
        rol = nuevo_rol,
        sucursal_asignada_id = nueva_sucursal
    WHERE id_perfil = target_user_id;

    -- 2. Update auth.users metadata (raw_user_meta_data)
    -- We need to merge the new role into the existing JSONB or create it
    UPDATE auth.users
    SET raw_user_meta_data = 
        COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object('rol', nuevo_rol)
    WHERE id = target_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

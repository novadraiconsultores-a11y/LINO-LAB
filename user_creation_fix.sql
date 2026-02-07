-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to create a user in auth.users and public.perfiles
CREATE OR REPLACE FUNCTION registrar_usuario_admin(
    email_input TEXT,
    password_input TEXT,
    nombre_input TEXT,
    rol_input TEXT,
    sucursal_input UUID
) 
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- 1. Insert into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        email_input,
        crypt(password_input, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('nombre_completo', nombre_input, 'rol', rol_input),
        now(),
        now(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO new_user_id;

    -- 2. Insert into public.perfiles
    INSERT INTO public.perfiles (
        id_perfil,
        nombre_completo,
        rol,
        sucursal_asignada_id,
        email,
        created_at
    ) VALUES (
        new_user_id,
        nombre_input,
        rol_input,
        sucursal_input,
        email_input,
        now()
    );

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

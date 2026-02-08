-- Function to update a user's password directly (admin only)
CREATE OR REPLACE FUNCTION cambiar_password_admin(
    target_user_id UUID,
    new_password TEXT
) 
RETURNS VOID AS $$
BEGIN
    -- Update the encrypted password in auth.users
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = now()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
    r_producto RECORD;
    v_empresario RECORD;
    v_nuevo_consecutivo INT;
    v_consecutivo_str TEXT;
    v_nuevo_sku TEXT;
    
    -- EAN-13 components
    v_prefijo_fijo TEXT := '20';
    v_id_ean_global_str TEXT;
    v_consecutivo_prod_str TEXT;
    v_relleno TEXT := '00';
    v_base_ean TEXT;
    v_check_digit INT;
    v_ean13_final TEXT;
    
    -- Checksum calculation variables
    v_sum_odd INT;
    v_sum_even INT;
    v_total_sum INT;
    v_remainder INT;
    i INT;
    v_digit INT;
    
BEGIN
    -- 1. Create or Verify 'sku_antiguo' column
    BEGIN
        ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS sku_antiguo TEXT;
    EXCEPTION
        WHEN duplicate_column THEN NULL; -- column already exists
    END;

    -- 2. Backup existing SKUs if sku_antiguo is NULL
    UPDATE public.productos 
    SET sku_antiguo = sku_producto 
    WHERE sku_antiguo IS NULL;

    -- 3. Iterate over products that don't have barcodes yet
    FOR r_producto IN 
        SELECT id_producto, ref_empresario_id 
        FROM public.productos 
        WHERE codigo_barras IS NULL
        ORDER BY created_at -- process in creation order if possible
    LOOP
        -- a) Get Entrepreneur Data (FOR UPDATE to lock row and avoid race conditions)
        SELECT * INTO v_empresario 
        FROM public.empresarios 
        WHERE id_empresario = r_producto.ref_empresario_id
        FOR UPDATE; -- important for correct sequential increment

        -- Check data integrity
        IF v_empresario.codigo_visual IS NULL OR v_empresario.id_ean_global IS NULL THEN
            RAISE NOTICE 'Skipping product % (Empresario % missing config)', r_producto.id_producto, v_empresario.nombre_empresario;
            CONTINUE;
        END IF;

        -- b) Increment Consecutive
        v_nuevo_consecutivo := COALESCE(v_empresario.ultimo_consecutivo, 0) + 1;
        v_consecutivo_str := LPAD(v_nuevo_consecutivo::TEXT, 5, '0');

        -- c) Generate Hybrid SKU: [CODIGO_VISUAL]-[00001]
        v_nuevo_sku := v_empresario.codigo_visual || '-' || v_consecutivo_str;

        -- d) Generate EAN-13 Base (12 digits)
        v_id_ean_global_str := LPAD(v_empresario.id_ean_global::TEXT, 3, '0');
        v_consecutivo_prod_str := v_consecutivo_str; -- reused variable for clarity
        
        -- Base: 20 (2) + 055 (3) + 00001 (5) + 00 (2) = 12 digits
        v_base_ean := v_prefijo_fijo || v_id_ean_global_str || v_consecutivo_prod_str || v_relleno;

        -- e) Calculate Checksum (Modulo 10)
        -- Digits at odd positions (1, 3, 5, 7, 9, 11) weight 1
        -- Digits at even positions (2, 4, 6, 8, 10, 12) weight 3
        v_sum_odd := 0;
        v_sum_even := 0;

        FOR i IN 1..12 LOOP
            v_digit := SUBSTRING(v_base_ean FROM i FOR 1)::INT;
            IF i % 2 <> 0 THEN -- Odd position (1, 3...)
                v_sum_odd := v_sum_odd + v_digit;
            ELSE -- Even position (2, 4...)
                v_sum_even := v_sum_even + v_digit;
            END IF;
        END LOOP;

        v_total_sum := v_sum_odd + (v_sum_even * 3);
        v_remainder := v_total_sum % 10;
        
        IF v_remainder = 0 THEN
            v_check_digit := 0;
        ELSE
            v_check_digit := 10 - v_remainder;
        END IF;

        v_ean13_final := v_base_ean || v_check_digit::TEXT;

        -- f) Update Product
        UPDATE public.productos
        SET sku_producto = v_nuevo_sku,
            codigo_barras = v_ean13_final
        WHERE id_producto = r_producto.id_producto;

        -- g) Update Entrepreneur Consecutive
        UPDATE public.empresarios
        SET ultimo_consecutivo = v_nuevo_consecutivo
        WHERE id_empresario = v_empresario.id_empresario;
        
        RAISE NOTICE 'Updated Product %: SKU %, EAN %', r_producto.id_producto, v_nuevo_sku, v_ean13_final;

    END LOOP;
END $$;

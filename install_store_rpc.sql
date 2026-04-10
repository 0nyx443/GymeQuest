CREATE OR REPLACE FUNCTION purchase_store_item(p_user_id UUID, p_item_id UUID)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    v_price INT;
    v_coins INT;
    v_item_name TEXT;
BEGIN
    -- Get price
    SELECT price, name INTO v_price, v_item_name FROM public.store_items WHERE id = p_item_id;
    IF v_price IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Item not found');
    END IF;

    -- Get user coins
    SELECT coins INTO v_coins FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    
    IF v_coins < v_price THEN
        RETURN json_build_object('success', false, 'message', 'Not enough coins');
    END IF;

    -- Deduct coins
    UPDATE public.profiles SET coins = coins - v_price WHERE id = p_user_id;

    -- Insert or update inventory
    INSERT INTO public.user_inventory (profile_id, item_id, quantity)
    VALUES (p_user_id, p_item_id, 1)
    ON CONFLICT (profile_id, item_id) 
    DO UPDATE SET quantity = user_inventory.quantity + 1;

    RETURN json_build_object('success', true, 'message', 'Purchased ' || v_item_name);
END;
$$;

// 사용자 식별자 관리
export const CART_TABLE = 'cart_items';
export const getUserId = () => {
    return localStorage.getItem('userId') || 'anonymous_user';
};

export const setUserId = (userId) => {
    localStorage.setItem('userId', userId);
};

// 카트 관련 함수
export async function getOrCreateCart() {
    try {
        const userId = getUserId();
        const { data: cart, error } = await supabase
            .from('carts')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            // 카트가 없으면 새로 생성
            const { data: newCart, error: createError } = await supabase
                .from('carts')
                .insert([{ user_id: userId }])
                .select()
                .single();

            if (createError) throw createError;
            return newCart;
        }
        return cart;
    } catch (error) {
        console.error('카트 조회/생성 실패:', error);
        throw error;
    }
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);
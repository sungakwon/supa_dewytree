import { supabase } from './supabase-client.js';

// 결제 완료 처리
async function completePayment() {
    try {
        // 결제 완료 메시지 표시
        alert('결제가 완료되었습니다.');
        
        // 장바구니 비우기
        const { error: cartError } = await supabase
            .from('cart_items')
            .delete()
            .eq('id', 'anonymous_user');

        if (cartError) {
            console.error('장바구니 비우기 실패:', cartError);
            throw new Error('장바구니를 비우는데 실패했습니다.');
        }

        // 메인 페이지로 이동
        window.location.href = '/';
    } catch (error) {
        console.error('결제 처리 중 오류 발생:', error);
        
        if (error.message?.includes('22P02')) {
            alert('상품 정보가 올바르지 않습니다. 관리자에게 문의해주세요.');
        } else {
            alert('결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    }
}

// URL에서 주문 데이터 가져오기
function getOrderDataFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderData = urlParams.get('orderData');
    return orderData ? JSON.parse(decodeURIComponent(orderData)) : null;
}

// 장바구니 항목 불러오기
async function fetchCartItems() {
    try {
        // 장바구니 항목 불러오기
        const { data: items, error } = await supabase
            .from('cart_items')
            .select('*');

        if (error) throw error;

        if (!items || items.length === 0) {
            alert('장바구니가 비어있습니다.');
            window.location.href = '/cart2.html';
            return;
        }

        // 주문 상품 표시
        const orderItemsList = document.getElementById('orderItemsList');
        if (orderItemsList) {
            orderItemsList.innerHTML = items.map(item => `
                <div class="order-item">
                    <div class="item-info">
                        <h3>${item.product_name}</h3>
                        <p>수량: ${item.quantity}</p>
                        <p>가격: ${item.total_price.toLocaleString()}원</p>
                    </div>
                </div>
            `).join('');

            // 총액 계산 및 표시
            const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
            const shipping = subtotal >= 19800 ? 0 : 3000;
            const total = subtotal + shipping;

            document.getElementById('subtotal').textContent = `${subtotal.toLocaleString()}원`;
            document.getElementById('shipping').textContent = `${shipping.toLocaleString()}원`;
            document.getElementById('total').textContent = `${total.toLocaleString()}원`;

            // 결제하기 버튼 활성화
            const checkoutBtn = document.querySelector('.checkout-btn');
            if (checkoutBtn) {
                checkoutBtn.disabled = false;
            }
        }
    } catch (error) {
        console.error('장바구니 항목 불러오기 실패:', error);
        alert('장바구니 항목을 불러오지 못했습니다. 다시 시도해주세요.');
    }
}

// 결제하기 버튼 클릭 이벤트
const checkoutBtn = document.getElementById('orderButton');
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
        try {
            // 배송 정보 검증
            const deliveryInfo = {
                receiver_name: document.getElementById('receiver-name').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                address1: document.getElementById('address1').value.trim()
            };

            if (!deliveryInfo.receiver_name || !deliveryInfo.phone || !deliveryInfo.address1) {
                alert('배송 정보를 모두 입력해주세요.');
                return;
            }

            // 결제 수단 검증
            const paymentMethod = document.querySelector('input[name="payment"]:checked');
            if (!paymentMethod) {
                alert('결제 수단을 선택해주세요.');
                return;
            }

            // 장바구니 항목 검증
            const { data: items, error: itemsError } = await supabase
                .from('cart_items')
                .select('*');

            if (itemsError) throw itemsError;

            if (!items || items.length === 0) {
                alert('장바구니가 비어있습니다.');
                window.location.href = '/cart2.html';
                return;
            }

            // carts 테이블에서 user_id 가져오기
            const { data: cartData, error: cartError } = await supabase
                .from('carts')
                .select('user_id')
                .eq('id', items[0].cart_id)
                .single();

            if (cartError) throw cartError;
            if (!cartData) throw new Error('장바구니 정보를 찾을 수 없습니다.');

            const userId = cartData.user_id;

            // 주문 정보 생성
            const order = {
                user_id: userId,
                total_price: items.reduce((sum, item) => sum + item.total_price, 0),
                payment_method: paymentMethod.value,
                order_status: 'completed'
            };

            // 주문 저장
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([order])
                .select('id');

            if (orderError) throw orderError;

            // 주문 상품 저장
            const orderItems = items.map(item => ({
                order_id: orderData[0].id,
                product_id: item.product_id,  
                product_name: item.product_name,
                quantity: item.quantity,
                price_each: item.unit_price,
                total_price: item.total_price
            }));

            const { error: orderItemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (orderItemsError) throw orderItemsError;

            // 배송 정보 저장
            const { error: deliveryError } = await supabase
                .from('delivery_info')
                .insert([deliveryInfo]);

            if (deliveryError) throw deliveryError;

            // 장바구니 비우기
            const { error: cartError2 } = await supabase
                .from('cart_items')
                .delete()
                .eq('cart_id', items[0].cart_id);

            if (cartError2) throw cartError2;

            // 결제 완료 알림
            alert('결제가 완료되었습니다.');
            
            // 메인 페이지로 이동
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);

        } catch (error) {
            console.error('결제 처리 중 오류 발생:', error);
            
            if (error.message?.includes('22P02')) {
                alert('상품 정보가 올바르지 않습니다. 관리자에게 문의해주세요.');
            } else {
                alert('결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
        }
    });
}

// 홈으로 이동
function goToHome() {
    window.location.href = '/';
}

// 주소 검색
function searchAddress() {
    alert('주소 검색 기능은 현재 준비중입니다.');
}

// 페이지 로드 시 주문 정보 표시
window.addEventListener('DOMContentLoaded', () => {
    fetchCartItems();
});
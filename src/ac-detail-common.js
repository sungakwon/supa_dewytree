import { supabase, CART_TABLE, getUserId } from './supabase-client.js';

// 상품 정보 가져오기
const productDetail = window.productDetail;
if (!productDetail) {
    console.error('Product detail not found');
}

// 전역 변수로 선언
let selectedPrice = productDetail ? productDetail.price : 0; // productDetail이 없을 경우 기본값 설정
let quantityInput;
let totalPriceAmount;

// 사용자 식별자
const rawUserId = getUserId();
const userId = (rawUserId && rawUserId !== 'anonymous_user') ? rawUserId : null;

// 제품의 line 값을 결정하는 함수
function getProductLine(productName) {
    const lowerName = productName.toLowerCase();
    if (lowerName.includes('파우더') || lowerName.includes('밤') || lowerName.includes('밀크')) {
        return 'amino';
    }
    return 'ac';
}

// 현재 버전 확인
function getCurrentVersion() {
    return sessionStorage.getItem('currentVersion') || 'a';
}

// 버전에 따른 페이지 이동
function goToMainPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const version = urlParams.get('v');
    window.location.href = version === '1' ? 'index1.html' : 'index2.html';
}

// DOM이 로드된 후 이벤트 리스너 등록
window.addEventListener('DOMContentLoaded', function() {
    // DOM 요소 선택
    const addToCartButton = document.querySelector('.add-to-cart-button');
    const buyNowButton = document.querySelector('.buy-now-button');
    quantityInput = document.getElementById('quantity');
    const quantityDecrease = document.querySelector('.quantity-decrease');
    const quantityIncrease = document.querySelector('.quantity-increase');
    totalPriceAmount = document.querySelector('.total-price-amount');

    // 수량 변경 이벤트 리스너
    quantityDecrease.addEventListener('click', () => updateQuantity(-1));
    quantityIncrease.addEventListener('click', () => updateQuantity(1));

    // 장바구니 담기 버튼 클릭 이벤트
    addToCartButton.addEventListener('click', async function() {
        const quantity = parseInt(quantityInput.value) || 1;
        
        try {
            // 세션 ID 확인
            let sessionId = sessionStorage.getItem('sessionId');
            if (!sessionId) {
                sessionId = crypto.randomUUID();
                sessionStorage.setItem('sessionId', sessionId);
            }

            // 장바구니에 추가
            const { error: insertError } = await supabase
                .from('cart_items')
                .insert({
                    session_id: sessionId,
                    product_id: productDetail.id,
                    product_name: productDetail.name,
                    line: getProductLine(productDetail.name),
                    quantity: quantity,
                    unit_price: productDetail.price,
                    added_at: new Date().toISOString()
                });

            if (insertError) throw insertError;

            // GA 이벤트
            if (typeof gtag === 'function') {
                try {
                    gtag('event', 'add_to_cart', {
                        currency: 'KRW',
                        value: productDetail.price * quantity,
                        items: [{
                            item_id: productDetail.id,
                            item_name: productDetail.name,
                            price: productDetail.price,
                            currency: 'KRW',
                            quantity: quantity
                        }]
                    });
                } catch (error) {
                    console.error('GA4 이벤트 추적 중 오류 발생:', error);
                }
            }

            // 장바구니에 아이템 추가
            const cartItems = JSON.parse(localStorage.getItem(getCurrentCartKey())) || [];
            const existingItemIndex = cartItems.findIndex(cartItem => cartItem.id === productDetail.id);
            
            if (existingItemIndex !== -1) {
                cartItems[existingItemIndex].quantity += quantity;
            } else {
                cartItems.push({
                    id: productDetail.id,
                    name: productDetail.name,
                    price: productDetail.price,
                    quantity: quantity
                });
            }
            
            localStorage.setItem(getCurrentCartKey(), JSON.stringify(cartItems));
            showPopup();

        } catch (error) {
            console.error('장바구니 추가 중 오류 발생:', error);
            alert('장바구니에 추가하는데 실패했습니다.');
        }
    });

    // 바로 구매하기 버튼 클릭 이벤트
    buyNowButton.addEventListener('click', async function() {
        const quantity = parseInt(quantityInput.value) || 1;
        
        try {
            // 세션 ID 확인
            let sessionId = sessionStorage.getItem('sessionId');
            if (!sessionId) {
                sessionId = crypto.randomUUID();
                sessionStorage.setItem('sessionId', sessionId);
            }

            // 장바구니에 추가
            const { error: insertError } = await supabase
                .from('cart_items')
                .insert({
                    session_id: sessionId,
                    product_id: productDetail.id,
                    product_name: productDetail.name,
                    line: getProductLine(productDetail.name),
                    quantity: quantity,
                    unit_price: productDetail.price,
                    added_at: new Date().toISOString()
                });

            if (insertError) throw insertError;

            // GA 이벤트
            if (typeof gtag === 'function') {
                try {
                    gtag('event', 'begin_checkout', {
                        currency: 'KRW',
                        value: productDetail.price * quantity,
                        items: [{
                            item_id: productDetail.id,
                            item_name: productDetail.name,
                            price: productDetail.price,
                            currency: 'KRW',
                            quantity: quantity
                        }]
                    });
                } catch (error) {
                    console.error('GA4 이벤트 추적 중 오류 발생:', error);
                }
            }

            // 주문 데이터 생성
            const orderData = {
                sessionId: sessionId,
                items: [{
                    product_id: productDetail.id,
                    product_name: productDetail.name,
                    line: getProductLine(productDetail.name),
                    quantity: quantity,
                    unit_price: productDetail.price
                }],
                subtotal: productDetail.price * quantity,
                shipping: productDetail.price * quantity >= 19800 ? 0 : 3000,
                total: productDetail.price * quantity + (productDetail.price * quantity >= 19800 ? 0 : 3000)
            };

            // 주문 페이지로 이동
            window.location.href = `/order.html?orderData=${encodeURIComponent(JSON.stringify(orderData))}`;

        } catch (error) {
            console.error('바로 구매 중 오류 발생:', error);
            alert('바로 구매 중 오류가 발생했습니다.');
        }
    });

    // 수량 변경 시 가격 업데이트
    function updateQuantity(change) {
        let quantity = parseInt(quantityInput.value);
        const pricePerItem = productDetail.price;

        quantity = Math.max(1, quantity + change);
        quantityInput.value = quantity;
        
        const totalPrice = (quantity * pricePerItem).toLocaleString() + '원';
        totalPriceAmount.textContent = totalPrice;
    }

    // 초기 총 금액 설정
    updateQuantity(0);
});

// 장바구니 팝업 관련 함수
function showPopup() {
    const overlay = document.getElementById('overlay');
    const popup = document.getElementById('cartPopup');
    overlay.style.display = 'block';
    popup.style.display = 'block';
}

function closePopup() {
    const overlay = document.getElementById('overlay');
    const popup = document.getElementById('cartPopup');
    overlay.style.display = 'none';
    popup.style.display = 'none';
}

// 현재 버전 확인
function getCurrentVersionFromUrlOrSession() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlVersion = urlParams.get('v');
    const sessionVersion = sessionStorage.getItem('currentVersion');
    
    if (urlVersion) {
        sessionStorage.setItem('currentVersion', urlVersion);
        return urlVersion;
    }
    
    return sessionVersion || 'a';
}

// 장바구니 페이지 URL 반환
function getCurrentCartPage() {
    return sessionStorage.getItem('currentVersion') === 'a' ? 'cart.html' : 'cart2.html';
}

// 장바구니로 이동 함수
function goToCart() {
    closePopup();
    window.location.href = getCurrentCartPage();
}

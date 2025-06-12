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

// GA4 상품 조회 이벤트
// if (typeof gtag === 'function') {
//     try {
//         gtag('event', 'view_item', {
//             currency: 'KRW',
//             value: selectedPrice,
//             items: [{
//                 item_id: productDetail ? productDetail.id : '',
//                 item_name: productDetail ? productDetail.name : '',
//                 price: selectedPrice,
//                 currency: 'KRW',
//                 quantity: 1
//             }]
//         });
//     } catch (error) {
//         console.error('GA4 이벤트 추적 중 오류 발생:', error);
//     }
// } else {
//     console.log('GA4 추적을 건너뜁니다. gtag 함수가 존재하지 않습니다.');
// }

// 장바구니 관련 공통 함수들
function getCurrentVersionFromUrlOrSession() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlVersion = urlParams.get('v');
    if (urlVersion) {
        console.log('Debug: Version from URL:', urlVersion);
        return urlVersion;
    }

    const sessionVersion = sessionStorage.getItem('currentVersion');
    if (sessionVersion) {
        console.log('Debug: Version from sessionStorage:', sessionVersion);
        // Map 'a' to '1' and 'b' to '2' for compatibility with existing 'v' logic
        return sessionVersion === 'a' ? '1' : '2';
    }

    // Default or fallback if no version found (e.g., direct access without version)
    console.log('Debug: No version found, defaulting to 1 (cart.html).');
    return '1'; // 기본값 설정 (index1.html의 기본 동작)
}

function getCurrentCartKey() {
    const version = getCurrentVersionFromUrlOrSession();
    return version === '1' ? 'cartItemsA' : 'cartItemsB';
}

function getCurrentCartPage() {
    const version = getCurrentVersionFromUrlOrSession();
    return version === '1' ? 'cart.html' : 'cart2.html';
}

function goToCart() {
    // index1.html에서 항상 cart.html로 이동
    if (location.pathname.includes('index1.html') || sessionStorage.getItem('currentVersion') === 'a') {
        window.location.href = 'cart.html';
    } else {
        window.location.href = 'cart2.html';
    }
}

function showPopup() {
    const overlay = document.getElementById('overlay');
    const popup = document.getElementById('cartPopup');
    
    if (overlay && popup) {
        // 먼저 display를 block으로 설정
        overlay.style.display = 'block';
        popup.style.display = 'block';
        
        // 약간의 지연 후 opacity 애니메이션 적용
        setTimeout(() => {
            overlay.style.opacity = '1';
            popup.style.opacity = '1';
            popup.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
    }
}

function closePopup() {
    const overlay = document.getElementById('overlay');
    const popup = document.getElementById('cartPopup');
    
    if (overlay && popup) {
        // 애니메이션 적용
        overlay.style.opacity = '0';
        popup.style.opacity = '0';
        popup.style.transform = 'translate(-50%, -50%) scale(0.95)';
        
        // 애니메이션 완료 후 display를 none으로 설정
        setTimeout(() => {
            overlay.style.display = 'none';
            popup.style.display = 'none';
        }, 300);
    }
}

// 수량 변경 시 총 가격 업데이트
function updateTotalPrice() {
    if (quantityInput && totalPriceAmount && productDetail) {
        const quantity = parseInt(quantityInput.value) || 1;
        const totalPrice = productDetail.price * quantity;
        totalPriceAmount.textContent = totalPrice.toLocaleString() + '원';
    }
}

// 수량 증가/감소 버튼
function increaseQuantity(e) {
    e.stopPropagation();
    if (quantityInput) {
        let value = parseInt(quantityInput.value) || 1;
        value = Math.max(1, value + 1);
        quantityInput.value = value;
        updateTotalPrice();
    }
}

function decreaseQuantity(e) {
    e.stopPropagation();
    if (quantityInput) {
        let value = parseInt(quantityInput.value) || 1;
        value = Math.max(1, value - 1);
        quantityInput.value = value;
        updateTotalPrice();
    }
}

// 수량 직접 입력 시 총 가격 업데이트
function handleQuantityInput(e) {
    e.stopPropagation();
    if (quantityInput) {
        let value = parseInt(quantityInput.value);
        if (isNaN(value) || value < 1) {
            value = 1;
        }
        quantityInput.value = value;
        updateTotalPrice();
    }
}

// 메인 페이지로 이동
function goToMainPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const version = urlParams.get('v');
    console.log('Debug: goToMainPage - URL version:', version);
    window.location.href = version === '1' ? 'index1.html' : 'index2.html';
}

// DOM이 로드된 후 이벤트 리스너 등록

    // DOM 요소 선택
    quantityInput = document.querySelector('#quantity');
    totalPriceAmount = document.querySelector('.total-price-amount');
    const addToCartButton = document.querySelector('.add-to-cart-button');
    const buyNowButton = document.querySelector('.buy-now-button');
    const continueShoppingButton = document.querySelector('.continue-shopping');
    const goToCartButton = document.querySelector('.go-to-cart');
    const cartIcon = document.querySelector('.cart-icon');
    const decreaseButton = document.querySelector('.quantity-decrease');
    const increaseButton = document.querySelector('.quantity-increase');

    // 초기화
    if (continueShoppingButton) continueShoppingButton.addEventListener('click', closePopup);
    if (goToCartButton) goToCartButton.addEventListener('click', function() {
        closePopup();
        window.location.href = getCurrentCartPage();
    });

    // 디버깅 로그


    // 수량 입력 필드 이벤트 리스너

        // 초기 수량 설정
        quantityInput.value = '1';
        quantityInput.addEventListener('change', handleQuantityInput);
    

    // 수량 감소 버튼 이벤트 리스너
 
        decreaseButton.addEventListener('click', decreaseQuantity);
    

    // 수량 증가 버튼 이벤트 리스너
    
        increaseButton.addEventListener('click', increaseQuantity);
  

    // 초기 총 가격 설정
    

    // 장바구니 담기 버튼 클릭 이벤트

    addToCartButton.addEventListener('click', async function () {
        const quantity = parseInt(quantityInput.value) || 1;
        if (!quantity || quantity < 1) {
            alert('수량을 1개 이상 선택해주세요.');
            return;
        }

        try {
            // 1. 세션 ID 확인
            let sessionId = sessionStorage.getItem('sessionId');
            if (!sessionId) {
                sessionId = crypto.randomUUID();
                sessionStorage.setItem('sessionId', sessionId);
            }

            // 2. 카트 생성/조회
            const { data: cart, error: cartError } = await supabase
                .from('carts')
                .select('id')
                .eq('session_id', sessionId)
                .single();

            if (cartError) {
                console.error('카트 조회 실패:', cartError);
                throw new Error('카트 정보를 확인할 수 없습니다.');
            }

            if (!cart) {
                const { data: newCart, error: createCartError } = await supabase
                    .from('carts')
                    .insert({ session_id: sessionId })
                    .select()
                    .single();

                if (createCartError) {
                    console.error('카트 생성 실패:', createCartError);
                    throw new Error('카트를 생성할 수 없습니다.');
                }
                cart = newCart;
            }

            // 3. 장바구니 항목 확인 및 업데이트
            const { data: existingItem, error: itemError } = await supabase
                .from('cart_items')
                .select('quantity')
                .eq('cart_id', cart.id)
                .eq('product_id', productDetail.id)
                .single();

            if (itemError && itemError.code !== 'PGRST116') {
                console.error('장바구니 항목 조회 실패:', itemError);
                throw new Error('장바구니 항목을 확인할 수 없습니다.');
            }

            if (existingItem) {
                // 기존 항목이 있으면 수량만 업데이트
                const newQuantity = existingItem.quantity + quantity;
                const { error: updateError } = await supabase
                    .from('cart_items')
                    .update({ quantity: newQuantity })
                    .eq('cart_id', cart.id)
                    .eq('product_id', productDetail.id);

                if (updateError) {
                    console.error('장바구니 업데이트 실패:', updateError);
                    throw new Error('장바구니 수량을 업데이트할 수 없습니다.');
                }
            } else {
                // 새로운 항목 추가
                const { error: insertError } = await supabase
                    .from('cart_items')
                    .insert({
                        cart_id: cart.id,
                        product_id: productDetail.id,
                        product_name: productDetail.name,
                        line: 'ac',
                        quantity: quantity,
                        unit_price: productDetail.price,
                        added_at: new Date().toISOString()
                    });

                if (insertError) {
                    console.error('카트 추가 실패:', insertError);
                    throw new Error('장바구니에 상품을 추가할 수 없습니다.');
                }
            }

            // 4. GA 이벤트
            if (typeof gtag === 'function') {
                try {
                    gtag('event', 'add_to_cart', {
                        currency: 'KRW',
                        value: productDetail.price * quantity,
                        items: [{
                            item_id: productDetail.id,
                            item_name: productDetail.name,
                            price: productDetail.price,
                            quantity: quantity,
                            currency: 'KRW'
                        }]
                    });
                } catch (error) {
                    console.error('GA4 이벤트 추적 중 오류 발생:', error);
                }
            }

            // 5. 팝업 표시
            showPopup();

        } catch (error) {
            console.error('카트 처리 중 오류:', error);
            alert(error.message || '장바구니에 상품을 담는 중 문제가 발생했습니다.');
        }
    });

    // 팝업 버튼 이벤트 핸들러
    continueShoppingButton.addEventListener('click', function() {
        closePopup();
    });

    goToCartButton.addEventListener('click', function() {
        closePopup();
        window.location.href = getCurrentCartPage();
    });
    
    

    // 바로 구매하기 버튼 클릭 이벤트
    buyNowButton.addEventListener('click', async function () {
        const quantity = parseInt(quantityInput.value);
        
        try {
            let sessionId = sessionStorage.getItem('sessionId');
            if (!sessionId) {
                sessionId = crypto.randomUUID();
                sessionStorage.setItem('sessionId', sessionId);
            }
    
            // 기존 cart 존재 여부 확인
            let { data: existingCart, error: findCartError } = await supabase
                .from('carts')
                .select('id')
                .eq('session_id', sessionId)
                .single();
    
            if (findCartError || !existingCart) {
                const { data: newCart, error: createCartError } = await supabase
                    .from('carts')
                    .insert({ session_id: sessionId })
                    .select()
                    .single();
    
                if (createCartError) throw createCartError;
                existingCart = newCart;
            }
    
            // cart_items에 추가
            const { error: insertError } = await supabase
                .from('cart_items')
                .insert({
                    cart_id: existingCart.id,
                    product_id: productDetail.id,
                    product_name: productDetail.name,
                    line: productDetail.name.toLowerCase().includes('ac') ? 'ac' : 'amino',
                    quantity: quantity,
                    unit_price: productDetail.price,
                    total_price: productDetail.price * quantity,
                    added_at: new Date().toISOString()
                });
    
            if (insertError) throw insertError;
    
            // GA 이벤트
            // if (typeof gtag === 'function') {
            //     gtag('event', 'buy_now', {
            //         currency: 'KRW',
            //         value: productDetail.price * quantity,
            //         items: [{
            //             item_id: productDetail.id,
            //             item_name: productDetail.name,
            //             price: productDetail.price,
            //             quantity: quantity,
            //             currency: 'KRW'
            //         }]
            //     });
            // }
    
            // 주문 페이지 이동
            window.location.href = 'order.html';
    
        } catch (error) {
            console.error('바로 구매 중 오류 발생:', error);
            alert('바로 구매 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    });
    




    // 장바구니 아이콘 클릭 이벤트
    cartIcon.addEventListener('click', goToCart);


// 전역 함수로 등록

import { supabase } from './supabase-client.js';

const cartItemsContainer = document.querySelector(".cart-items");
const cartEmptyMessage = document.querySelector(".cart-empty");
const cartSummary = document.querySelector(".cart-summary");
const subtotalEl = document.getElementById("subtotal");
const totalEl = document.getElementById("total");
const shippingCost = 3000;
const checkoutBtn = document.querySelector(".checkout-btn");

async function fetchCartItems() {
  const { data: items, error } = await supabase
    .from('cart_items')
    .select("*");

  if (error) {
    console.error("장바구니 항목 불러오기 실패", error);
    return;
  }

  if (!items || items.length === 0) {
    cartItemsContainer.style.display = "none";
    cartSummary.style.display = "none";
    cartEmptyMessage.style.display = "block";
    return;
  }

  cartItemsContainer.innerHTML = "";
  let subtotal = 0;

  items.forEach(item => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "cart-item";
    itemDiv.innerHTML = `
      <div class="item-info">
        <span class="item-name">${item.product_name}</span>
        <span class="item-line">라인: ${item.line}</span>
      </div>
      <div class="item-qty-price">
        <span>수량: ${item.quantity}</span>
        <span>가격: ${item.total_price.toLocaleString()}원</span>
        <button class="remove-item-btn" data-id="${item.id}">X</button>
      </div>
    `;
    cartItemsContainer.appendChild(itemDiv);
    subtotal += item.total_price;
  });

  subtotalEl.textContent = `${subtotal.toLocaleString()}원`;
  totalEl.textContent = `${(subtotal + shippingCost).toLocaleString()}원`;

  cartItemsContainer.style.display = "block";
  cartSummary.style.display = "block";
  cartEmptyMessage.style.display = "none";

  // X 버튼 이벤트 리스너 추가
  const removeButtons = document.querySelectorAll(".remove-item-btn");
  removeButtons.forEach(button => {
    button.addEventListener("click", async (e) => {
      const itemId = e.target.dataset.id;
      try {
        const { error: deleteError } = await supabase
          .from('cart_items')
          .delete()
          .eq("id", itemId);

        if (deleteError) {
          console.error("항목 삭제 실패", deleteError);
        } else {
          await fetchCartItems();
        }
      } catch (error) {
        console.error("항목 삭제 중 오류 발생", error);
      }
    });
  });
}

// 구매하기 버튼 클릭 시 order.html로 이동
checkoutBtn.addEventListener("click", async () => {
  try {
    // 장바구니 항목 가져오기
    const { data: items, error } = await supabase
      .from('cart_items')
      .select('*');

    if (error) throw error;
    if (!items || items.length === 0) {
      alert('장바구니가 비어있습니다.');
      return;
    }

    // 주문 정보 생성
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const shipping = subtotal >= 19800 ? 0 : 3000;
    const total = subtotal + shipping;

    // order.html로 이동하면서 주문 정보를 URL 파라미터로 전달
    const orderData = {
        subtotal: subtotal,
        shipping: shipping,
        total: total
    };
    const encodedOrderData = encodeURIComponent(JSON.stringify(orderData));
    window.location.href = `/order.html?orderData=${encodedOrderData}`;
  } catch (error) {
    console.error('주문 정보 처리 중 오류 발생:', error);
    alert('주문 정보를 처리하는데 실패했습니다. 다시 시도해주세요.');
  }
});

// 페이지 로드 시 장바구니 불러오기
fetchCartItems();

// 홈으로 이동 함수
window.goToHome = function () {
  window.location.href = "/";
};

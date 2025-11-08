/* script.js
   Handles:
   - dynamic product grid (data below)
   - search / filter / sort
   - cart (add/remove/qty) + localStorage persistence
   - auth modal (simulated)
   - product slider (carousel)
   - add-to-cart flying animation
   - checkout validation
*/

/* ============================
   Product data structure (array of objects)
   Each product: { id, title, price, category, image, rating, stock, desc }
   Replace image paths with real images in your project folder.
   ============================ */
const PRODUCTS = [
  { id: 'p1', title: 'Wireless Headphones', price: 1299, category: 'electronics', image: 'box4_image.jpg', rating: 4.4, stock: 12, desc: 'Quality wireless sound' },
  { id: 'p2', title: 'Vitamin Supplements', price: 799, category: 'beauty', image: 'box2_image.jpg', rating: 4.1, stock: 25, desc: 'Daily vitamins' },
  { id: 'p3', title: 'Kids Building Blocks', price: 499, category: 'toys', image: 'box7_image.jpg', rating: 4.6, stock: 30, desc: 'Fun & safe' },
  { id: 'p4', title: 'Ceramic Vase', price: 1499, category: 'home', image: 'box3_image.jpg', rating: 4.0, stock: 7, desc: 'Stylish interior piece' },
  { id: 'p5', title: 'Pet Shampoo', price: 349, category: 'pets', image: 'box6_image.jpg', rating: 4.2, stock: 50, desc: 'Gentle & fragrant' },
  { id: 'p6', title: 'Smartphone', price: 15999, category: 'electronics', image: 'box4_image.jpg', rating: 4.5, stock: 5, desc: 'Latest model' },
  { id: 'p7', title: 'Face Moisturizer', price: 999, category: 'beauty', image: 'box5_image.jpg', rating: 4.3, stock: 18, desc: 'Hydrating formula' },
  { id: 'p8', title: 'Dining Chair', price: 2999, category: 'home', image: 'box1_image.jpg', rating: 4.1, stock: 10, desc: 'Comfortable & durable' },
];

/* ========== Utilities ========== */
const $ = (sel, parent = document) => parent.querySelector(sel);
const $$ = (sel, parent = document) => Array.from(parent.querySelectorAll(sel));

/* ========== App state & localStorage helpers ========== */
const STORAGE_KEY = 'nexbuy_cart_v1';
const AUTH_KEY = 'nexbuy_user';


function loadCart(){
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}
function saveCart(cart){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}
function loadUser(){ return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); }
function saveUser(u){ localStorage.setItem(AUTH_KEY, JSON.stringify(u)); }

/* in-memory cart object keyed by product id: { id: { product, qty } } */
let cart = loadCart();
let currentUser = loadUser();

/* ========== Render utilities ========== */
const grid = $('#product-grid');
const template = $('#product-card-template');

/* Create one product card DOM node from product object */
function createProductCard(product){
  const node = template.content.cloneNode(true);
  const card = node.querySelector('.product-card');
  const img = node.querySelector('img');
  img.src = product.image;
  img.alt = product.title;
  node.querySelector('.product-title').textContent = product.title;
  node.querySelector('.product-category').textContent = product.category;
  node.querySelector('.product-price').textContent = '₹' + product.price.toLocaleString();
  card.dataset.id = product.id;

  // add-cart button (two identical buttons exist in template)
  const addBtns = node.querySelectorAll('.add-cart');
  addBtns.forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(product.id, 1, e);
    });
  });

  // quick view (optional)
  const quick = node.querySelector('.quick-view');
  quick.addEventListener('click', (e) => {
    e.stopPropagation();
    alert(`${product.title}\n\n₹${product.price}\n\n${product.desc}`);
  });

  return node;
}

/* Render products with given array */
function renderProducts(list){
  grid.innerHTML = '';
  if(list.length === 0){
    grid.innerHTML = '<div class="no-results">No products found</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  list.forEach(p => {
    frag.appendChild(createProductCard(p));
  });
  grid.appendChild(frag);
}

/* ========== Filtering, Searching & Sorting ========== */
function getFilters(){
  const query = $('#search-input').value.trim().toLowerCase();
  const category = $('#category-select').value;
  const maxPrice = Number($('#price-range').value);
  const checkedCats = $$('.cat-checkbox').filter(c => c.checked).map(c => c.value);
  const sortOpt = $('#sort-select').value;
  return { query, category, maxPrice, checkedCats, sortOpt };
}

function applyFilters(){
  const { query, category, maxPrice, checkedCats, sortOpt } = getFilters();
  let results = PRODUCTS.filter(p => p.price <= maxPrice && checkedCats.includes(p.category));
  if(category !== 'all'){
    results = results.filter(p => p.category === category);
  }
  if(query){
    results = results.filter(p => (p.title + ' ' + p.desc + ' ' + p.category).toLowerCase().includes(query));
  }
  // sort
  if(sortOpt === 'price-asc') results.sort((a,b)=>a.price-b.price);
  else if(sortOpt === 'price-desc') results.sort((a,b)=>b.price-a.price);
  else if(sortOpt === 'name-asc') results.sort((a,b)=>a.title.localeCompare(b.title));
  // render
  renderProducts(results);
}

/* ========== CART functionality ========== */
const cartCountEl = $('#cart-count');
const cartPanel = $('#cart-panel');
const cartItemsEl = $('#cart-items');
const cartTotalEl = $('#cart-total');

function updateCartDisplay(){
  const items = Object.values(cart);
  const totalQty = items.reduce((s,i) => s + i.qty, 0);
  const totalPrice = items.reduce((s,i) => s + (i.qty * i.product.price), 0);
  cartCountEl.textContent = totalQty;
  cartTotalEl.textContent = '₹' + totalPrice.toLocaleString();
  // render items
  cartItemsEl.innerHTML = '';
  if(items.length === 0){
    cartItemsEl.innerHTML = '<p>Your cart is empty</p>';
    return;
  }
  items.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${entry.product.image}" alt="${entry.product.title}" />
      <div style="flex:1;">
        <div style="font-weight:700">${entry.product.title}</div>
        <div style="font-size:.9rem;color:#374151">₹${entry.product.price.toLocaleString()} x ${entry.qty}</div>
        <div class="qty-controls" style="margin-top:6px">
          <button class="btn small dec">-</button>
          <span>${entry.qty}</span>
          <button class="btn small inc">+</button>
          <button class="btn small" style="margin-left:8px" data-id="${entry.product.id}" aria-label="remove">Remove</button>
        </div>
      </div>
    `;
    // attach events
    div.querySelector('.dec').addEventListener('click', () => changeQty(entry.product.id, entry.qty - 1));
    div.querySelector('.inc').addEventListener('click', () => changeQty(entry.product.id, entry.qty + 1));
    div.querySelector('button[aria-label]').addEventListener('click', () => removeFromCart(entry.product.id));
    cartItemsEl.appendChild(div);
  });
}

function addToCart(productId, qty = 1, event = null){
  const product = PRODUCTS.find(p => p.id === productId);
  if(!product) return;
  if(!cart[productId]) cart[productId] = { product: product, qty: 0 };
  cart[productId].qty = Math.min(product.stock, (cart[productId].qty + qty));
  saveCart(cart);
  updateCartDisplay();

  // create flying dot animation (if event provided)
  if(event) flyToCart(event.target);
}

function changeQty(id, qty){
  if(qty <= 0){
    delete cart[id];
  } else {
    const product = PRODUCTS.find(p => p.id === id);
    cart[id].qty = Math.min(product.stock, qty);
  }
  saveCart(cart);
  updateCartDisplay();
}

function removeFromCart(id){
  delete cart[id];
  saveCart(cart);
  updateCartDisplay();
}

/* ========== CART UI toggles ========== */
$('#cart-btn').addEventListener('click', () => {
  cartPanel.classList.toggle('hidden');
  cartPanel.style.display = cartPanel.classList.contains('hidden') ? 'none' : 'flex';
  // update contents
  updateCartDisplay();
});
$('#close-cart').addEventListener('click', () => {
  cartPanel.classList.add('hidden');
  cartPanel.style.display = 'none';
});
$('#clear-cart').addEventListener('click', () => {
  cart = {};
  saveCart(cart);
  updateCartDisplay();
});

/* ========== AUTH (simulated) ========== */
const authModal = $('#auth-modal');
const authBtn = $('#auth-btn');
const authForm = $('#auth-form');
const authTitle = $('#auth-title');

function updateAuthUI(){
  if(currentUser){
    authBtn.textContent = 'Hi, ' + currentUser.email.split('@')[0];
  } else {
    authBtn.textContent = 'Sign in';
  }
}

authBtn.addEventListener('click', () => {
  authModal.classList.remove('hidden');
  authModal.style.display = 'flex';
  if(currentUser){
    authTitle.textContent = 'Signed in as ' + currentUser.email;
  } else {
    authTitle.textContent = 'Sign in';
  }
});

$('#auth-close').addEventListener('click', () => {
  authModal.classList.add('hidden');
  authModal.style.display = 'none';
});

authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('#email').value.trim();
  const password = $('#password').value;
  if(!email || password.length < 6){ alert('Provide valid credentials (6+ chars).'); return; }
  // Simulate login — store minimal user in localStorage
  currentUser = { email, loggedAt: Date.now() };
  saveUser(currentUser);
  updateAuthUI();
  alert('Signed in as ' + email);
  authModal.classList.add('hidden');
  authModal.style.display = 'none';
});

/* ========== CHECKOUT ========== */
const checkoutModal = $('#checkout-modal');
$('#checkout-btn').addEventListener('click', () => {
  if(Object.keys(cart).length === 0){ alert('Cart empty'); return; }
  checkoutModal.classList.remove('hidden');
  checkoutModal.style.display = 'flex';
});
$('#checkout-close').addEventListener('click', () => { checkoutModal.classList.add('hidden'); checkoutModal.style.display='none';});
$('#checkout-cancel').addEventListener('click', () => { checkoutModal.classList.add('hidden'); checkoutModal.style.display='none'; });

$('#checkout-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#fullname').value.trim();
  const address = $('#address').value.trim();
  const card = $('#card').value.trim();
  const city = $('#city').value.trim();
  if(name.length < 3 || address.length < 3 || !/^\d{16}$/.test(card) || city.length < 2){
    alert('Please provide valid checkout information (card: 16 digits).');
    return;
  }
  // simulate payment
  alert('Payment successful! Thank you, ' + name);
  cart = {};
  saveCart(cart);
  updateCartDisplay();
  checkoutModal.classList.add('hidden');
  checkoutModal.style.display = 'none';
});

/* ========== Search & Filters event wiring ========== */
$('#search-btn').addEventListener('click', applyFilters);
$('#search-input').addEventListener('keyup', (e) => { if(e.key === 'Enter') applyFilters(); });
$('#category-select').addEventListener('change', applyFilters);
$('#price-range').addEventListener('input', () => {
  $('#price-value').textContent = $('#price-range').value;
  applyFilters();
});
$$('.cat-checkbox').forEach(cb => cb.addEventListener('change', applyFilters));
$('#sort-select').addEventListener('change', applyFilters);
$('#clear-filters').addEventListener('click', () => {
  $('#price-range').value = 5000;
  $('#price-value').textContent = 5000;
  $$('.cat-checkbox').forEach(cb => cb.checked = true);
  $('#search-input').value = '';
  $('#category-select').value = 'all';
  applyFilters();
});

/* NAV links filter */
$$('#main-nav a').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault();
  const f = a.dataset.filter;
  $('#category-select').value = f;
  applyFilters();
}));

/* ========== Hamburger for mobile nav ========== */
$('#hamburger').addEventListener('click', () => {
  const nav = $('#main-nav');
  nav.classList.toggle('collapsed');
  nav.style.display = nav.classList.contains('collapsed') ? 'none' : 'block';
});

/* ========== Carousel (basic) ========== */
function initCarousel(){
  const track = $('.carousel-track');
  const slides = Array.from(track.children);
  let index = 0;

  function moveTo(i){
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
  }
  $('.carousel .prev').addEventListener('click', () => moveTo(index - 1));
  $('.carousel .next').addEventListener('click', () => moveTo(index + 1));
  // autoplay
  let autoplay = setInterval(() => moveTo(index + 1), 4500);
  // pause on hover
  track.parentElement.addEventListener('mouseenter', () => clearInterval(autoplay));
  track.parentElement.addEventListener('mouseleave', () => autoplay = setInterval(() => moveTo(index + 1), 4500));
}
initCarousel();

/* ========== Add-to-cart flying animation ========== */
function flyToCart(originEl){
  const dot = document.getElementById('flying-dot');
  const cartBtn = document.getElementById('cart-btn');
  const rect = originEl.getBoundingClientRect();
  const cartRect = cartBtn.getBoundingClientRect();

  // show dot at origin
  dot.style.display = 'block';
  dot.style.left = (rect.left + rect.width/2) + 'px';
  dot.style.top = (rect.top + rect.height/2) + 'px';
  dot.style.transform = 'scale(0.9)';

  // animate using requestAnimationFrame
  const start = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
  const end = { x: cartRect.left + cartRect.width/2, y: cartRect.top + cartRect.height/2 };
  const dur = 600;
  let t0 = null;

  function animate(ts){
    if(!t0) t0 = ts;
    const elapsed = ts - t0;
    const progress = Math.min(1, elapsed / dur);
    // easeOutCubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const x = start.x + (end.x - start.x) * ease;
    const y = start.y + (end.y - start.y) * ease;
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
    dot.style.transform = `scale(${1 - 0.5*progress})`;
    if(progress < 1) requestAnimationFrame(animate);
    else {
      dot.style.display = 'none';
      // small bounce on cart to signal addition
      cartBtn.animate([{transform:'scale(1)'},{transform:'scale(1.1)'},{transform:'scale(1)'}], {duration:220});
    }
  }
  requestAnimationFrame(animate);
}

/* ========== Init app ========== */
function init(){
  // initial render
  renderProducts(PRODUCTS);
  updateCartDisplay();
  updateAuthUI();

  // ensure nav collapsed on mobile initial state
  if(window.innerWidth < 720){
    $('#main-nav').classList.add('collapsed');
    $('#main-nav').style.display = 'none';
  }

  // re-apply filters on resize to handle layout changes (optional)
  window.addEventListener('resize', () => {
    if(window.innerWidth >= 720){
      $('#main-nav').style.display = 'block';
    } else {
      $('#main-nav').style.display = $('#main-nav').classList.contains('collapsed') ? 'none' : 'block';
    }
  });

  // restore any persisted cart (already loaded at top)
  cart = loadCart();
  updateCartDisplay();
}
init();

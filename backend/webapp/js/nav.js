function renderBottomNav(active) {
  const items = [
    { key: 'home', href: 'index.html', icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
    { key: 'catalog', href: 'catalog.html', icon: 'M4 6h16M4 12h16M4 18h16' },
    { key: 'cart', href: 'cart.html', icon: 'M6 6h15l-1.5 9h-12z M6 6L5 3H2 M9 20a1 1 0 100-2 1 1 0 000 2z M18 20a1 1 0 100-2 1 1 0 000 2z' },
    { key: 'orders', href: 'orders.html', icon: 'M9 12h6M9 16h6M9 8h6M5 4h14v16H5z' },
    { key: 'profile', href: 'profile.html', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8z M4 20c0-4 4-6 8-6s8 2 8 6' },
  ];

  const cartBadge = cartCount();

  return `
    <nav class="bottom-nav">
      ${items.map(item => `
        <a href="${item.href}" class="nav-item ${active === item.key ? 'active' : ''}">
          <span class="nav-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${item.icon}"/></svg>
            ${item.key === 'cart' && cartBadge > 0 ? `<span class="nav-badge">${cartBadge}</span>` : ''}
          </span>
          <span class="nav-label">${t('nav_' + item.key)}</span>
        </a>
      `).join('')}
    </nav>
  `;
}

function mountBottomNav(active) {
  const el = document.createElement('div');
  el.innerHTML = renderBottomNav(active);
  document.body.appendChild(el.firstElementChild);
}

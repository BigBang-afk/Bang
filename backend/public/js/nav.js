function renderHeader(activePage) {
  const header = document.getElementById('app-header');
  const user = getCurrentUser();
  const items = [
    { href: '/dashboard.html', label: 'Dashboard', key: 'dashboard' },
    { href: '/admin.html', label: 'Users & Roles', key: 'admin' },
    { href: '/security.html', label: 'Security', key: 'security' },
  ];

  const nav = items
    .map(
      (item) =>
        `<a href="${item.href}" class="${item.key === activePage ? 'active' : ''}">${item.label}</a>`,
    )
    .join('');

  header.innerHTML = `
    <div class="brand">
      <div class="brand-mark">B</div>
      <div class="brand-title">Bang</div>
    </div>
    <nav>${nav}</nav>
    <div class="header-user">
      <span>${user ? user.firstName + ' ' + user.lastName : ''}</span>
      <span class="badge badge-gold">${user && user.roleNames ? user.roleNames.join(', ') : ''}</span>
      <button class="btn btn-secondary btn-sm" id="logout-btn">Log out</button>
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await logout();
    window.location.href = '/login.html';
  });
}

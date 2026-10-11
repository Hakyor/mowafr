/* Mobile helpers: bottom tab bar on app pages, working hamburger on public pages. */
(function () {
  function init() {
    var page = location.pathname.split('/').pop() || 'index.html';
    document.body.classList.add('page-' + page.replace('.html', ''));

    // ----- landing page hamburger -----
    var toggle = document.querySelector('.menu-toggle');
    var links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.setAttribute('aria-label', 'القائمة');
      toggle.addEventListener('click', function () {
        var open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.addEventListener('click', function (e) {
        if (e.target.closest('a')) links.classList.remove('open');
      });
    }

    // ----- bottom tab bar for signed-in app pages -----
    var appPages = ['dashboard.html', 'data-entry.html', 'history.html', 'results.html', 'profile.html', 'help-guide.html'];
    if (appPages.indexOf(page) === -1) return;
    if (document.querySelector('.mobile-tabbar')) return;

    var tabs = [
      ['dashboard.html', 'fa-tachometer-alt', 'الرئيسية'],
      ['data-entry.html', 'fa-edit', 'إدخال'],
      ['results.html', 'fa-chart-pie', 'النتائج'],
      ['history.html', 'fa-history', 'السجل'],
      ['profile.html', 'fa-user-circle', 'حسابي']
    ];
    var bar = document.createElement('nav');
    bar.className = 'mobile-tabbar';
    bar.setAttribute('aria-label', 'التنقل الرئيسي');
    bar.innerHTML = tabs.map(function (t) {
      return '<a href="' + t[0] + '"' + (t[0] === page ? ' class="active" aria-current="page"' : '') +
             '><i class="fas ' + t[1] + '"></i><span>' + t[2] + '</span></a>';
    }).join('');
    document.body.appendChild(bar);
    document.body.classList.add('has-tabbar');

    // logout stays reachable on phones: add a small button in the header
    var header = document.querySelector('.dashboard-nav');
    if (header && !header.querySelector('.mobile-logout')) {
      var b = document.createElement('button');
      b.className = 'mobile-logout';
      b.setAttribute('aria-label', 'خروج');
      b.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
      b.style.cssText = 'background:none;border:0;font-size:20px;color:#6c757d;min-width:44px;min-height:44px;display:none';
      b.addEventListener('click', function () {
        if (window.logout) window.logout();
      });
      header.appendChild(b);
      var mq = window.matchMedia('(max-width: 768px)');
      var apply = function () { b.style.display = mq.matches ? 'block' : 'none'; };
      apply();
      (mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

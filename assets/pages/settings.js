/* Settings (ports settings.php) */
(function () {
  var e = TZ.esc, F = TZ.fieldInput, icon = window.icon;
  var sess = TZ.currentUser();

  // Password field with a show/hide (eye) toggle.
  function pwdField(label, name) {
    return '<div><label class="block text-xs font-semibold text-slate-600 mb-1.5">' + e(label) + '</label>' +
      '<div class="relative">' +
        '<input type="password" name="' + e(name) + '" data-pwd class="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-11 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400">' +
        '<button type="button" tabindex="-1" data-pwd-toggle aria-label="Show password" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">' + icon('eye', 18) + '</button>' +
      '</div></div>';
  }

  TZ.mount({ page: 'settings', title: 'Settings' }, function (root) {
    var u = TZ.db.get('users', sess.id) || sess;

    root.innerHTML = '<div class="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">' +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">' +
        '<h3 class="font-bold text-slate-900 font-display mb-4">Profile</h3>' +
        '<form id="profile" class="space-y-4">' +
          F('Full name', 'name', u.name, 'text') + F('Email', 'email', u.email, 'email') + F('Role / title', 'role', u.role, 'text') +
          '<button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl">Save profile</button>' +
        '</form></div>' +

      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">' +
        '<h3 class="font-bold text-slate-900 font-display mb-4">Change password</h3>' +
        '<form id="password" class="space-y-4">' +
          pwdField('Current password', 'current') + pwdField('New password', 'new') + pwdField('Confirm new password', 'confirm') +
          '<button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl">Update password</button>' +
        '</form></div>' +

      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2">' +
        '<h3 class="font-bold text-slate-900 font-display mb-2">About Trackzo</h3>' +
        '<p class="text-sm text-slate-500">Construction ERP · HTML/CSS/JS edition (localStorage). Manage projects, clients, materials, purchases, finance and estimates in one place.</p>' +
        '<p class="text-xs text-slate-400 mt-3">Signed in as <strong class="text-slate-600">' + e(u.email) + '</strong></p></div>' +
      '</div>';

    // Eye show/hide toggles for the password fields
    document.getElementById('password').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-pwd-toggle]'); if (!btn) return;
      var input = btn.parentNode.querySelector('input[data-pwd]'); if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = icon(show ? 'eye-off' : 'eye', 18);
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });

    document.getElementById('profile').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = TZ.formData(this);
      var name = (d.name || '').trim(), email = (d.email || '').trim(), role = (d.role || '').trim();
      if (!name || !email) { TZ.flash('Name and email are required.', 'error'); location.href = 'settings.html'; return; }
      var clash = TZ.db.where('users', function (x) { return x.id !== u.id && String(x.email).toLowerCase() === email.toLowerCase(); });
      if (clash.length) { TZ.flash('That email is already in use.', 'error'); location.href = 'settings.html'; return; }
      TZ.db.update('users', u.id, { name: name, email: email, role: role });
      var s = TZ.currentUser(); s.name = name; s.email = email; s.role = role; TZ.setSessionUser(s);
      TZ.flash('Profile updated.'); location.href = 'settings.html';
    });

    document.getElementById('password').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = TZ.formData(this);
      var rec = TZ.db.get('users', u.id);
      if (rec.password !== d.current) TZ.flash('Current password is incorrect.', 'error');
      else if ((d['new'] || '').length < 6) TZ.flash('New password must be at least 6 characters.', 'error');
      else if (d['new'] !== d.confirm) TZ.flash('New passwords do not match.', 'error');
      else { TZ.db.update('users', u.id, { password: d['new'] }); TZ.flash('Password changed.'); }
      location.href = 'settings.html';
    });
  });
})();

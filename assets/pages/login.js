/* Login / Sign up (ports login.php) — mock auth against localStorage. */
(function () {
  if (TZ.currentUser()) { location.replace('index.html'); return; }
  var e = TZ.esc, icon = window.icon;
  TZ.db.all('users'); // ensure DB seeded

  var mode = TZ.qs('mode');
  if (mode !== 'signin' && mode !== 'signup') mode = 'signin';

  var features = [
    ['Projects', 'Track budgets & progress'],
    ['Clients', 'Manage relationships'],
    ['Finance', 'Income & expenses in ₹'],
    ['Reports', 'Export to Excel & PDF'],
  ];
  var year = new Date().getFullYear();

  var html =
    '<div class="min-h-screen flex" style="background:#F1F5F9">' +
      '<div class="hidden lg:flex flex-col justify-between p-10 w-[440px] flex-shrink-0" style="background:linear-gradient(160deg,#0B1F3A 0%,#1D4ED8 100%)">' +
        '<div class="flex items-center gap-3">' +
          '<div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">' + icon('hard-hat', 22) + '</div>' +
          '<div><p class="text-white font-bold text-xl tracking-tight font-display">Trackzo</p><p class="text-blue-200 text-[11px] tracking-widest uppercase">Construction ERP</p></div>' +
        '</div>' +
        '<div>' +
          '<h2 class="text-white text-3xl font-bold mb-4 leading-tight font-display">Build Smarter.<br>Track Better.</h2>' +
          '<p class="text-blue-200 text-sm leading-relaxed mb-8">The all-in-one ERP platform for builders and contractors to manage every project from foundation to handover.</p>' +
          '<div class="grid grid-cols-2 gap-3">' +
            features.map(function (s) {
              return '<div class="bg-white/10 rounded-xl p-3"><p class="text-white font-bold text-sm font-display">' + e(s[0]) + '</p><p class="text-blue-200 text-xs">' + e(s[1]) + '</p></div>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<p class="text-blue-300 text-xs">© ' + year + ' Trackzo. All rights reserved.</p>' +
      '</div>' +

      '<div class="flex-1 flex items-center justify-center p-6">' +
        '<div class="w-full max-w-md">' +
          '<div class="flex items-center gap-3 mb-8 lg:hidden">' +
            '<div class="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white">' + icon('hard-hat', 22) + '</div>' +
            '<div><p class="font-bold text-xl text-slate-900 font-display">Trackzo</p><p class="text-slate-400 text-xs">Construction ERP</p></div>' +
          '</div>' +
          '<div class="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">' +
            '<h1 id="formTitle" class="text-2xl font-bold text-slate-900 mb-1 font-display">Welcome back</h1>' +
            '<p id="formSub" class="text-slate-400 text-sm mb-6">Sign in to your Trackzo workspace</p>' +
            '<div class="bg-slate-100 rounded-xl p-1 flex mb-6 text-sm font-semibold">' +
              '<button type="button" id="tabIn" class="flex-1 py-2 rounded-lg transition-all">Sign In</button>' +
              '<button type="button" id="tabUp" class="flex-1 py-2 rounded-lg transition-all">Sign Up</button>' +
            '</div>' +
            '<div class="overflow-hidden"><div id="track" class="flex w-[200%] transition-transform duration-300 ease-out">' +
              '<div class="w-1/2">' +
                '<form id="signinForm" class="space-y-4">' +
                  '<div><label class="block text-xs font-semibold text-slate-600 mb-1.5">Email address</label>' +
                    '<input type="email" name="email" value="' + e(TZ.ADMIN_EMAIL) + '" placeholder="you@company.com" class="fld"></div>' +
                  '<div><div class="flex justify-between items-center mb-1.5"><label class="block text-xs font-semibold text-slate-600">Password</label><span class="text-xs text-blue-600">Forgot password?</span></div>' +
                    '<div class="relative">' +
                      '<input id="signinPwd" type="password" name="password" value="admin123" placeholder="••••••••" class="fld" style="padding-right:2.75rem">' +
                      '<button type="button" id="signinPwdToggle" tabindex="-1" aria-label="Show password" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">' + icon('eye', 18) + '</button>' +
                    '</div></div>' +
                  '<div id="signinError" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600"></div>' +
                  '<button type="submit" class="w-full flex items-center justify-center gap-2 py-3 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl text-sm">' + icon('login', 16) + ' Sign In</button>' +
                '</form>' +
              '</div>' +
              '<div class="w-1/2">' +
                '<form id="signupForm" class="space-y-4">' +
                  '<div><label class="block text-xs font-semibold text-slate-600 mb-1.5">Full name</label><input type="text" name="name" placeholder="Your name" class="fld"></div>' +
                  '<div><label class="block text-xs font-semibold text-slate-600 mb-1.5">Email address</label><input type="email" name="email" placeholder="you@company.com" class="fld"></div>' +
                  '<div class="grid grid-cols-2 gap-3">' +
                    '<div><label class="block text-xs font-semibold text-slate-600 mb-1.5">Password</label><input type="password" name="password" placeholder="Min 6 chars" class="fld"></div>' +
                    '<div><label class="block text-xs font-semibold text-slate-600 mb-1.5">Confirm</label><input type="password" name="confirm" placeholder="Repeat" class="fld"></div>' +
                  '</div>' +
                  '<div id="signupError" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600"></div>' +
                  '<button type="submit" class="w-full flex items-center justify-center gap-2 py-3 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl text-sm">' + icon('plus', 16) + ' Create account</button>' +
                '</form>' +
              '</div>' +
            '</div></div>' +
            '<p class="mt-6 text-center text-xs text-slate-400"><span id="switchHint"></span><button type="button" id="switchBtn" class="text-blue-600 font-semibold hover:underline"></button></p>' +
          '</div>' +
          '<p class="mt-4 text-center text-[11px] text-slate-400">Admin login — <strong>admin@gmail.com</strong> / admin123</p>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.getElementById('app').innerHTML = html;

  var A = 'bg-white text-brand shadow-sm', I = 'text-slate-500';
  var track = document.getElementById('track');
  function setMode(m) {
    track.dataset.mode = m;
    track.style.transform = m === 'signup' ? 'translateX(-50%)' : 'translateX(0)';
    document.getElementById('tabIn').className = 'flex-1 py-2 rounded-lg transition-all ' + (m === 'signin' ? A : I);
    document.getElementById('tabUp').className = 'flex-1 py-2 rounded-lg transition-all ' + (m === 'signup' ? A : I);
    document.getElementById('formTitle').textContent = m === 'signup' ? 'Create your account' : 'Welcome back';
    document.getElementById('formSub').textContent = m === 'signup' ? 'Set up your Trackzo workspace' : 'Sign in to your Trackzo workspace';
    document.getElementById('switchHint').textContent = m === 'signup' ? 'Already have an account? ' : "Don't have an account? ";
    document.getElementById('switchBtn').textContent = m === 'signup' ? 'Sign in' : 'Create one';
  }
  document.getElementById('tabIn').addEventListener('click', function () { setMode('signin'); });
  document.getElementById('tabUp').addEventListener('click', function () { setMode('signup'); });
  document.getElementById('switchBtn').addEventListener('click', function () { setMode(track.dataset.mode === 'signup' ? 'signin' : 'signup'); });

  // Show/hide password toggle
  (function () {
    var input = document.getElementById('signinPwd');
    var btn = document.getElementById('signinPwdToggle');
    if (!input || !btn) return;
    btn.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = icon(show ? 'eye-off' : 'eye', 18);
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      input.focus();
    });
  })();

  function showErr(id, msg) { var el = document.getElementById(id); el.textContent = msg; el.classList.remove('hidden'); }

  document.getElementById('signinForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = TZ.formData(this);
    if (!f.email || !f.password) { showErr('signinError', 'Please enter email and password.'); return; }
    var r = TZ.signin(f.email, f.password);
    if (r.error) { showErr('signinError', r.error); return; }
    location.href = 'index.html';
  });
  document.getElementById('signupForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = TZ.formData(this);
    var r = TZ.signup(f.name, f.email, f.password, f.confirm);
    if (r.error) { showErr('signupError', r.error); return; }
    location.href = 'index.html';
  });

  setMode(mode);
})();

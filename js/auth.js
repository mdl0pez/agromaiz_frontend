/* ============================================================
   AgroMaíz — auth.js
   Shared utilities for login & register pages
   ============================================================ */

(function () {
  // Generic password visibility toggle
  const togglePass = document.getElementById('toggleRegPass') || document.getElementById('togglePass');
  const passField  = document.getElementById('password');

  if (togglePass && passField) {
    togglePass.addEventListener('click', () => {
      const isText = passField.type === 'text';
      passField.type = isText ? 'password' : 'text';
      togglePass.setAttribute('aria-label', isText ? 'Mostrar contraseña' : 'Ocultar contraseña');
      togglePass.textContent = isText ? '👁️' : '🙈';
    });
  }

  // Animate form inputs on focus
  document.querySelectorAll('.input-wrap input, .input-wrap select').forEach(el => {
    el.addEventListener('focus', () => {
      el.closest('.form-group')?.querySelector('label')?.style.setProperty('color', 'var(--green-700)');
    });
    el.addEventListener('blur', () => {
      el.closest('.form-group')?.querySelector('label')?.style.removeProperty('color');
    });
  });
})();

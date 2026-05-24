/* ============================================================
   AgroMaíz — js/login.js
   Lógica del formulario de inicio de sesión
   Reemplaza el script inline de pages/login.html
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const form     = document.getElementById('loginForm');
  const emailEl  = document.getElementById('email');
  const passEl   = document.getElementById('password');
  const emailErr = document.getElementById('emailError');
  const passErr  = document.getElementById('passError');
  const loginBtn = document.getElementById('loginBtn');
  const success  = document.getElementById('loginSuccess');

  // Si ya hay sesión activa, redirigir directamente
  if (Auth.estaAutenticado()) {
    window.location.href = 'dashboard.html';
    return;
  }

  function limpiarErrores() {
    emailErr.textContent = '';
    passErr.textContent  = '';
    emailEl.classList.remove('error');
    passEl.classList.remove('error');
  }

  function mostrarError(campo, mensaje) {
    if (campo === 'email') {
      emailErr.textContent = mensaje;
      emailEl.classList.add('error');
    } else {
      passErr.textContent = mensaje;
      passEl.classList.add('error');
    }
  }

  function setLoading(cargando) {
    loginBtn.classList.toggle('loading', cargando);
    loginBtn.disabled = cargando;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores();

    // Validación básica en cliente
    let valido = true;
    if (!emailEl.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
      mostrarError('email', 'Ingresa un correo válido.');
      valido = false;
    }
    if (!passEl.value || passEl.value.length < 6) {
      mostrarError('pass', 'La contraseña debe tener al menos 6 caracteres.');
      valido = false;
    }
    if (!valido) return;

    setLoading(true);

    try {
      const { ok, datos } = await AuthService.login(emailEl.value.trim(), passEl.value);

      if (!ok) {
        // Errores del servidor
        const msg = datos.mensaje || 'Error al iniciar sesión';
        if (msg.toLowerCase().includes('correo') || msg.toLowerCase().includes('contraseña')) {
          mostrarError('email', msg);
        } else {
          mostrarError('pass', msg);
        }
        setLoading(false);
        return;
      }

      // Guardar sesión
      Auth.guardar(datos.accessToken, datos.refreshToken, datos.usuario);

      // Mostrar éxito y redirigir
      form.style.display = 'none';
      success.style.display = 'flex';

      // Animar la barra de progreso en 4 segundos
      const bar = document.getElementById('redirectBar');
      if (bar) {
        requestAnimationFrame(() => {
          bar.style.transition = 'width 4s linear';
          bar.style.width = '100%';
        });
      }

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 4000);

    } catch (err) {
      console.error('Error de red:', err);
      mostrarError('pass', 'No se pudo conectar al servidor. Verifica tu conexión.');
      setLoading(false);
    }
  });
});
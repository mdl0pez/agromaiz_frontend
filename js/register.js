/* ============================================================
   AgroMaíz — js/register.js
   Lógica del formulario de registro de cuenta
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const form        = document.getElementById('registerForm');
  const firstNameEl = document.getElementById('firstName');
  const lastNameEl  = document.getElementById('lastName');
  const emailEl     = document.getElementById('regEmail');
  const regionEl    = document.getElementById('region');
  const passEl      = document.getElementById('regPassword');
  const confirmEl   = document.getElementById('confirmPass');
  const termsEl     = document.getElementById('terms');
  const submitBtn   = document.getElementById('registerBtn');
  const success     = document.getElementById('registerSuccess');

  // Si ya hay sesión activa, redirigir
  if (Auth.estaAutenticado()) {
    window.location.href = 'dashboard.html';
    return;
  }

  function getError(id) { return document.getElementById(id); }

  function limpiarErrores() {
    ['firstNameError','lastNameError','regEmailError','regPassError','confirmError','termsError'].forEach(id => {
      const el = getError(id);
      if (el) el.textContent = '';
    });
    [firstNameEl, lastNameEl, emailEl, passEl, confirmEl].forEach(el => {
      if (el) el.classList.remove('error');
    });
  }

  function mostrarError(elId, errId, mensaje) {
    const el  = document.getElementById(elId);
    const err = document.getElementById(errId);
    if (el)  el.classList.add('error');
    if (err) err.textContent = mensaje;
  }

  // Indicador de fortaleza de contraseña
  if (passEl) {
    passEl.addEventListener('input', () => {
      const val = passEl.value;
      const indicador = document.getElementById('passStrength');
      if (!indicador) return;

      let fuerza = 0;
      if (val.length >= 8)          fuerza++;
      if (/[A-Z]/.test(val))        fuerza++;
      if (/[0-9]/.test(val))        fuerza++;
      if (/[^A-Za-z0-9]/.test(val)) fuerza++;

      const niveles = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
      const colores = ['', '#e53e3e', '#dd6b20', '#d69e2e', '#38a169'];
      indicador.textContent = fuerza > 0 ? niveles[fuerza] : '';
      indicador.style.color = colores[fuerza];
    });
  }

  function setLoading(cargando) {
    submitBtn.classList.toggle('loading', cargando);
    submitBtn.disabled = cargando;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores();

    const nombre   = `${firstNameEl?.value.trim()} ${lastNameEl?.value.trim()}`.trim();
    const email    = emailEl?.value.trim() || '';
    const password = passEl?.value || '';
    const confirm  = confirmEl?.value || '';
    const region   = regionEl?.value || '';

    let valido = true;

    if (!firstNameEl?.value.trim()) {
      mostrarError('firstName', 'firstNameError', 'El nombre es requerido.');
      valido = false;
    }
    if (!lastNameEl?.value.trim()) {
      mostrarError('lastName', 'lastNameError', 'El apellido es requerido.');
      valido = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      mostrarError('regEmail', 'regEmailError', 'Ingresa un correo válido.');
      valido = false;
    }
    if (password.length < 8) {
      mostrarError('regPassword', 'regPassError', 'La contraseña debe tener al menos 8 caracteres.');
      valido = false;
    } else if (!/[A-Z]/.test(password)) {
      mostrarError('regPassword', 'regPassError', 'Debe incluir al menos una mayúscula.');
      valido = false;
    } else if (!/[0-9]/.test(password)) {
      mostrarError('regPassword', 'regPassError', 'Debe incluir al menos un número.');
      valido = false;
    }
    if (password !== confirm) {
      mostrarError('confirmPass', 'confirmError', 'Las contraseñas no coinciden.');
      valido = false;
    }
    if (termsEl && !termsEl.checked) {
      const err = document.getElementById('termsError');
      if (err) err.textContent = 'Debes aceptar los términos y condiciones.';
      valido = false;
    }

    if (!valido) return;

    setLoading(true);

    try {
      const { ok, datos } = await AuthService.registrar(nombre, email, password);

      if (!ok) {
        const msg = datos.mensaje || 'Error al crear la cuenta';
        if (msg.toLowerCase().includes('correo') || msg.toLowerCase().includes('registrado')) {
          mostrarError('regEmail', 'regEmailError', msg);
        } else {
          mostrarError('regPassword', 'regPassError', msg);
        }
        setLoading(false);
        return;
      }

      // Guardar sesión automáticamente tras registro
      Auth.guardar(datos.accessToken, datos.refreshToken, datos.usuario);

      // Mostrar éxito con animación
      form.style.display         = 'none';
      success.style.display      = 'flex';

      // Activar barra de progreso de redirección (4 segundos)
      requestAnimationFrame(() => {
        const bar = document.getElementById('redirectBar');
        if (bar) {
          requestAnimationFrame(() => { bar.style.width = '100%'; });
        }
      });

      // Redirigir al wizard de cultivo
      setTimeout(() => {
        window.location.href = 'registrar-cultivo.html';
      }, 4000);

    } catch (err) {
      console.error('Error de red:', err);
      mostrarError('regEmail', 'regEmailError', 'No se pudo conectar al servidor. Verifica tu conexión.');
      setLoading(false);
    }
  });
});
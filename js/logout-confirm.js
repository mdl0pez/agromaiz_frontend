/* ============================================================
   AgroMaíz — js/logout-confirm.js
   Intercepta Auth.cerrarSesion() y muestra una confirmación
   con SweetAlert2 antes de cerrar la sesión.

   Incluir DESPUÉS de api.js en todas las páginas protegidas.
   SweetAlert2 se carga desde CDN — no requiere instalación.
   ============================================================ */

(function () {

  /* ── Cargar SweetAlert2 desde CDN si no está ya cargado ── */
  function cargarSwal(callback) {
    if (window.Swal) { callback(); return; }

    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js';
    script.onload = callback;
    document.head.appendChild(script);
  }

  /* ── Estilos personalizados que inyectamos en el popup ─── */
  const SWAL_CUSTOM_CSS = `
    /* Fondo overlay más suave */
    .swal2-agromaiz.swal2-backdrop-show {
      background: rgba(15, 35, 24, 0.55) !important;
      backdrop-filter: blur(4px);
    }

    /* Popup principal */
    .swal2-popup.swal2-agromaiz-popup {
      border-radius: 20px !important;
      padding: 2rem 1.75rem 1.75rem !important;
      font-family: 'DM Sans', 'Segoe UI', sans-serif !important;
      box-shadow: 0 24px 60px rgba(0,0,0,.18) !important;
      max-width: 340px !important;
    }

    /* Ícono personalizado */
    .swal2-popup.swal2-agromaiz-popup .swal2-icon.swal2-warning {
      border-color: #2D6A4F !important;
      color: #2D6A4F !important;
      width: 4rem !important;
      height: 4rem !important;
      margin-bottom: 1.25rem !important;
    }
    .swal2-popup.swal2-agromaiz-popup .swal2-icon.swal2-warning .swal2-icon-content {
      font-size: 2rem !important;
      color: #2D6A4F !important;
    }

    /* Título */
    .swal2-popup.swal2-agromaiz-popup .swal2-title {
      font-size: 1.2rem !important;
      font-weight: 700 !important;
      color: #0F2318 !important;
      padding: 0 !important;
      margin-bottom: .4rem !important;
    }

    /* Texto */
    .swal2-popup.swal2-agromaiz-popup .swal2-html-container {
      font-size: .88rem !important;
      color: #4A6356 !important;
      line-height: 1.55 !important;
      margin: 0 0 1.5rem !important;
    }

    /* Contenedor de botones */
    .swal2-popup.swal2-agromaiz-popup .swal2-actions {
      gap: .6rem !important;
      flex-direction: column !important;
      width: 100% !important;
      margin: 0 !important;
    }

    /* Botón confirmar (Cerrar sesión) */
    .swal2-popup.swal2-agromaiz-popup .swal2-confirm {
      background: #1B4332 !important;
      color: #fff !important;
      border-radius: 12px !important;
      font-family: 'DM Sans', sans-serif !important;
      font-weight: 700 !important;
      font-size: .95rem !important;
      padding: .85rem 1.5rem !important;
      width: 100% !important;
      box-shadow: 0 4px 14px rgba(27,67,50,.3) !important;
      transition: background .2s, transform .15s !important;
      border: none !important;
    }
    .swal2-popup.swal2-agromaiz-popup .swal2-confirm:hover {
      background: #2D6A4F !important;
      transform: translateY(-1px) !important;
    }

    /* Botón cancelar (Quedarme) */
    .swal2-popup.swal2-agromaiz-popup .swal2-cancel {
      background: #F0FBF4 !important;
      color: #2D6A4F !important;
      border: 1.5px solid #B7E4C7 !important;
      border-radius: 12px !important;
      font-family: 'DM Sans', sans-serif !important;
      font-weight: 600 !important;
      font-size: .92rem !important;
      padding: .8rem 1.5rem !important;
      width: 100% !important;
      transition: background .2s !important;
    }
    .swal2-popup.swal2-agromaiz-popup .swal2-cancel:hover {
      background: #D8F3DC !important;
    }
  `;

  function inyectarEstilos() {
    if (document.getElementById('swal-agromaiz-styles')) return;
    const style = document.createElement('style');
    style.id = 'swal-agromaiz-styles';
    style.textContent = SWAL_CUSTOM_CSS;
    document.head.appendChild(style);
  }

  /* ── Función de confirmación ─────────────────────────── */
  function confirmarCerrarSesion() {
    cargarSwal(() => {
      inyectarEstilos();

      Swal.fire({
        title:             '¿Cerrar sesión?',
        html:              'Se cerrará tu sesión en este dispositivo.<br>Podrás volver a ingresar cuando quieras.',
        iconHtml:          '🚪',
        showCancelButton:  true,
        confirmButtonText: 'Sí, cerrar sesión',
        cancelButtonText:  'Quedarme',
        reverseButtons:    false,
        focusCancel:       true,   // enfoca "Quedarme" por defecto (más seguro)

        // Clases para los estilos personalizados
        customClass: {
          popup:   'swal2-agromaiz-popup',
          backdrop: 'swal2-agromaiz',
        },

        // Quitar el ícono por defecto de SweetAlert2
        // (usamos iconHtml en su lugar)
        icon: undefined,

        showClass: {
          popup: 'swal2-show',
        },
        hideClass: {
          popup: 'swal2-hide',
        },
      }).then(result => {
        if (result.isConfirmed) {
          // Pequeño delay para que el popup cierre suavemente antes de redirigir
          setTimeout(() => Auth.cerrarSesion(), 200);
        }
      });
    });
  }

  /* ── Interceptar onclick="Auth.cerrarSesion()" ─────────
     Espera a que el DOM esté listo y reemplaza todos los
     elementos que llamen a Auth.cerrarSesion en su onclick
     por la versión con confirmación.
  ─────────────────────────────────────────────────────── */
  function interceptarBotones() {
    // Seleccionar todos los elementos con onclick que contengan cerrarSesion
    const elementos = document.querySelectorAll(
      '[onclick*="cerrarSesion"], [onclick*="cerrarSesión"]'
    );

    elementos.forEach(el => {
      // Reemplazar el onclick inline por la función con confirmación
      el.removeAttribute('onclick');
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        confirmarCerrarSesion();
      });
    });
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', interceptarBotones);
  } else {
    interceptarBotones();
  }

  // Exponer globalmente por si alguna página lo llama directamente
  window.confirmarCerrarSesion = confirmarCerrarSesion;

})();
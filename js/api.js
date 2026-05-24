/* ============================================================
   AgroMaíz — js/api.js
   Cliente centralizado para todas las llamadas al backend.
   Maneja tokens JWT, refresco automático y errores.

   INCLUIR en todas las páginas que necesiten el backend:
   <script src="../js/api.js"></script>
   ============================================================ */

const API_BASE = 'https://agromaizbackend-production.up.railway.app/api'; // Cambiar en producción

/* ──────────────────────────────────────────────────────────
   GESTIÓN DE TOKENS
   ────────────────────────────────────────────────────────── */

const Auth = {
  /** Guarda los tokens y datos del usuario tras login/registro */
  guardar(accessToken, refreshToken, usuario) {
    sessionStorage.setItem('access_token',  accessToken);
    sessionStorage.setItem('refresh_token', refreshToken);
    sessionStorage.setItem('usuario',       JSON.stringify(usuario));
  },

  getAccessToken()  { return sessionStorage.getItem('access_token'); },
  getRefreshToken() { return sessionStorage.getItem('refresh_token'); },

  getUsuario() {
    const raw = sessionStorage.getItem('usuario');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },

  estaAutenticado() { return !!this.getAccessToken(); },

  /** Borra sesión local y redirige al login */
  cerrarSesion() {
    const refreshToken = this.getRefreshToken();

    // Notificar al servidor (best-effort)
    if (refreshToken) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }

    sessionStorage.clear();
    window.location.href = '/pages/login.html';
  },

  /** Intenta renovar el access token usando el refresh token */
  async renovarToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        this.cerrarSesion();
        return false;
      }

      const datos = await res.json();
      sessionStorage.setItem('access_token',  datos.accessToken);
      sessionStorage.setItem('refresh_token', datos.refreshToken);
      return true;

    } catch {
      return false;
    }
  },
};

/* ──────────────────────────────────────────────────────────
   FUNCIÓN BASE DE FETCH CON REFRESCO AUTOMÁTICO
   ────────────────────────────────────────────────────────── */

async function apiFetch(ruta, opciones = {}) {
  const url = `${API_BASE}${ruta}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(opciones.headers || {}),
  };

  const token = Auth.getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let respuesta = await fetch(url, { ...opciones, headers });

  // Si el token expiró, intentar refrescarlo y reintentar
  if (respuesta.status === 401) {
    const datos = await respuesta.json().catch(() => ({}));

    if (datos.expirado) {
      const renovado = await Auth.renovarToken();
      if (renovado) {
        headers['Authorization'] = `Bearer ${Auth.getAccessToken()}`;
        respuesta = await fetch(url, { ...opciones, headers });
      } else {
        return { ok: false, status: 401, datos: { mensaje: 'Sesión expirada' } };
      }
    }
  }

  let cuerpo = {};
  try { cuerpo = await respuesta.json(); } catch { /* respuesta sin body */ }

  return { ok: respuesta.ok, status: respuesta.status, datos: cuerpo };
}

/* ──────────────────────────────────────────────────────────
   SERVICIOS DE AUTENTICACIÓN
   ────────────────────────────────────────────────────────── */

const AuthService = {
  async registrar(nombre, email, password) {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nombre, email, password }),
    });
  },

  async login(email, password) {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async logout() {
    Auth.cerrarSesion();
  },

  async obtenerPerfil() {
    return apiFetch('/auth/me');
  },
};

/* ──────────────────────────────────────────────────────────
   SERVICIOS DE CULTIVOS
   ────────────────────────────────────────────────────────── */

const CultivoService = {
  async obtener() {
    return apiFetch('/cultivos');
  },

  async registrar(datos) {
    return apiFetch('/cultivos', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  },

  async actualizar(id, datos) {
    return apiFetch(`/cultivos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    });
  },

  async eliminar(id) {
    return apiFetch(`/cultivos/${id}`, { method: 'DELETE' });
  },
};

/* ──────────────────────────────────────────────────────────
   SERVICIOS DE CLIMA Y GEOLOCALIZACIÓN
   ────────────────────────────────────────────────────────── */

const ClimaService = {
  /** Obtiene pronóstico de 7 días para unas coordenadas */
  async obtenerPronostico(lat, lon) {
    return apiFetch(`/clima?lat=${lat}&lon=${lon}`);
  },

  /** Convierte coordenadas en nombre de lugar */
  async reverseGeocode(lat, lon) {
    return apiFetch(`/clima/geo/reverse?lat=${lat}&lon=${lon}`);
  },

  /** Busca un lugar por nombre (para autocompletar) */
  async buscarLugar(texto) {
    return apiFetch(`/clima/geo/search?q=${encodeURIComponent(texto)}`);
  },

  /** Obtiene coordenadas del dispositivo via Browser Geolocation API */
  obtenerGPS() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Tu navegador no soporta geolocalización'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        err => {
          const msgs = {
            1: 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.',
            2: 'No se pudo determinar tu ubicación.',
            3: 'No se pudo obtener tu ubicación automáticamente. Ingresa la ubicación manualmente.',
          };
          reject(new Error(msgs[err.code] || 'Error de geolocalización'));
        },
        { 
          timeout: 20000,           // 20 segundos en vez de 10
          enableHighAccuracy: false, // no intentar GPS físico
          maximumAge: 60000,        // aceptar ubicación cacheada de hasta 1 minuto
         }
      );
    });
  },
};

/* ──────────────────────────────────────────────────────────
   GUARDIA DE AUTENTICACIÓN
   Llama esto al inicio de páginas protegidas:
   requireAuth();
   ────────────────────────────────────────────────────────── */

function requireAuth() {
  if (!Auth.estaAutenticado()) {
    window.location.href = '/pages/login.html';
    return false;
  }
  return true;
}

// Exponer globalmente
window.API_BASE       = API_BASE;
window.Auth           = Auth;
window.AuthService    = AuthService;
window.CultivoService = CultivoService;
window.ClimaService   = ClimaService;
window.requireAuth    = requireAuth;

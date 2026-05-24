# AgroMaíz — Prototipo Web Fase 2

Plataforma digital de apoyo agronómico a la toma de decisiones para el manejo del cultivo de maíz.


---

## 📌 Flujo de navegación actual

```
index.html (Inicio)
    ├── → pages/login.html    (Iniciar sesión)
    │       └── → pages/register.html
    └── → pages/register.html (Crear cuenta)
            └── → pages/login.html
```

---

## 🎨 Decisiones de diseño

| Aspecto        | Decisión                                                   |
|----------------|------------------------------------------------------------|
| Paleta         | Verde agrícola (#1B4332 → #52B788) + ámbar (#F59E0B)      |
| Tipografía     | Playfair Display (títulos) + DM Sans (cuerpo)             |
| Layout auth    | Panel izquierdo (branding) + Panel derecho (formulario)   |
| Responsive     | Grid CSS + media queries en 768px y 680px                 |
| Semántica HTML | `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>` |
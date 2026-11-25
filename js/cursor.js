/* ─────────────────────────────────────────────────────────────────────────────
   Alma Digital — cursor propio (anillo + 6 partículas en cadena con lerp)
   MÓDULO CERRADO: copiado tal cual del index.html anterior. Tamaños, opacidades
   y lerp están calibrados; no modificar. El color en el tema claro se ajusta
   desde css/site.css, sin tocar este archivo.
   ───────────────────────────────────────────────────────────────────────── */
    // Cursor — anillo + 6 partículas en cadena (desktop only)
    if (!window.matchMedia('(pointer: coarse)').matches) {
    const ring = document.getElementById('cursor-ring');

    // Configuración de cada partícula: [tamaño px, opacidad, lerp]
    const PARTICLE_CONFIG = [
        { size: 6,   opacity: 0.90, lerp: 0.18 },
        { size: 5,   opacity: 0.72, lerp: 0.13 },
        { size: 4,   opacity: 0.55, lerp: 0.09 },
        { size: 3.5, opacity: 0.40, lerp: 0.065 },
        { size: 2.5, opacity: 0.26, lerp: 0.045 },
        { size: 2,   opacity: 0.14, lerp: 0.030 },
    ];

    // Crear elementos
    const particles = PARTICLE_CONFIG.map(cfg => {
        const el = document.createElement('div');
        el.className = 'cursor-particle';
        el.style.width  = cfg.size + 'px';
        el.style.height = cfg.size + 'px';
        el.style.background = `rgba(255,255,255,${cfg.opacity})`;
        el.style.boxShadow  = `0 0 ${cfg.size * 2}px rgba(255,255,255,${cfg.opacity * 0.6})`;
        document.body.appendChild(el);
        return { el, x: window.innerWidth / 2, y: window.innerHeight / 2, lerp: cfg.lerp };
    });

    let mx = window.innerWidth  / 2;
    let my = window.innerHeight / 2;

    window.addEventListener('mousemove', e => {
        mx = e.clientX;
        my = e.clientY;
        ring.style.transform = `translate(calc(-50% + ${mx}px), calc(-50% + ${my}px))`;
    });

    function animateCursor () {
        let targetX = mx, targetY = my;
        particles.forEach(p => {
            p.x += (targetX - p.x) * p.lerp;
            p.y += (targetY - p.y) * p.lerp;
            p.el.style.transform = `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px))`;
            targetX = p.x;
            targetY = p.y;
        });
        requestAnimationFrame(animateCursor);
    }

    animateCursor();
    } // end desktop cursor

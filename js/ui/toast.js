      // ─── TOAST NOTIFICATION ───────────────────────────────────────────────────────
      function showToast(msg, duration = 2200) {
        let el = document.getElementById('_toast');
        if (!el) {
          el = document.createElement('div');
          el.id = '_toast';
          el.style.cssText =
            'position:fixed;bottom:24px;right:24px;z-index:9999;background:#1a2235;color:#fff;padding:10px 18px;border-radius:10px;font-size:0.85rem;font-family:"DM Sans",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.18);opacity:0;transform:translateY(12px);transition:all 0.25s;pointer-events:none';
          document.body.appendChild(el);
        }
        el.textContent = msg;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
        clearTimeout(el._t);
        el._t = setTimeout(() => {
          el.style.opacity = '0';
          el.style.transform = 'translateY(12px)';
        }, duration);
      }


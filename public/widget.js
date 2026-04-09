(function() {
  // P0-4: Safe currentScript — works with async/defer too
  var scripts = document.querySelectorAll('script[data-business-id]');
  var script  = scripts[scripts.length - 1];
  if (!script) { console.error('iLEO: No script tag with data-business-id found'); return; }

  var businessId = script.getAttribute('data-business-id');
  if (!businessId) { console.error('iLEO: data-business-id attribute is empty'); return; }

  var apiUrl;
  try   { apiUrl = new URL('/api/chat', new URL(script.src).origin).href; }
  catch (e) { apiUrl = '/api/chat'; }

  // P0-4: Persist conversationId so the same visitor continues the same conversation
  var STORAGE_KEY = 'ileo_cid_' + businessId;
  var conversationId = localStorage.getItem(STORAGE_KEY);
  if (!conversationId) {
    conversationId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, conversationId);
  }

  // ── Bubble ────────────────────────────────────────────────────────────
  var bubble = document.createElement('div');
  bubble.innerHTML = '&#x1F4AC;';
  bubble.style.cssText = [
    'position:fixed',
    'bottom:20px',
    'right:16px',
    'width:52px',
    'height:52px',
    'background:#1D9E75',
    'border-radius:50%',
    'cursor:pointer',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'font-size:22px',
    'z-index:9999',
    'box-shadow:0 4px 12px rgba(0,0,0,0.2)',
    'transition:transform 0.2s',
    'user-select:none'
  ].join(';');
  bubble.onmouseover = function() { bubble.style.transform = 'scale(1.05)'; };
  bubble.onmouseout  = function() { bubble.style.transform = 'scale(1)'; };

  // ── Chat window ───────────────────────────────────────────────────────
  var chatWindow = document.createElement('div');
  chatWindow.style.cssText = [
    'position:fixed',
    'bottom:80px',
    'right:12px',
    'width:min(340px, calc(100vw - 24px))',
    'height:420px',
    'background:#fff',
    'border-radius:12px',
    'box-shadow:0 8px 32px rgba(0,0,0,0.15)',
    'display:none',
    'flex-direction:column',
    'z-index:9998',
    'overflow:hidden',
    'font-family:system-ui,-apple-system,sans-serif'
  ].join(';');

  chatWindow.innerHTML =
    '<div style="background:#1D9E75;padding:14px;color:#fff;font-weight:500;font-size:14px;display:flex;justify-content:space-between;align-items:center;">' +
      '<span>Assistant</span>' +
      '<button id="tuni-close" style="background:none;border:none;color:white;cursor:pointer;font-size:18px;line-height:1;">&times;</button>' +
    '</div>' +
    '<div id="ileo-messages" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;"></div>' +
    '<div id="ileo-lead-form" style="display:none;padding:10px;background:#f9f9f9;border-top:1px solid #eee;flex-direction:column;gap:6px;">' +
      '<div style="font-size:12px;color:#555;">Leave your details and we will contact you:</div>' +
      '<input id="ileo-lead-name"  placeholder="Name"  style="border:1px solid #ddd;border-radius:4px;padding:6px;font-size:12px;width:100%;box-sizing:border-box;" />' +
      '<input id="ileo-lead-phone" placeholder="Phone" style="border:1px solid #ddd;border-radius:4px;padding:6px;font-size:12px;width:100%;box-sizing:border-box;" />' +
      '<button id="ileo-lead-submit" style="background:#1D9E75;color:#fff;border:none;border-radius:4px;padding:7px;cursor:pointer;font-size:12px;">Submit Details</button>' +
    '</div>' +
    '<div style="padding:10px;border-top:1px solid #eee;display:flex;gap:6px;">' +
      '<input id="ileo-input" placeholder="Type a message..." style="flex:1;border:1px solid #ddd;border-radius:20px;padding:8px 14px;font-size:13px;outline:none;" />' +
      '<button id="ileo-send" style="background:#1D9E75;color:#fff;border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;">&#x2191;</button>' +
    '</div>';

  document.body.appendChild(bubble);
  document.body.appendChild(chatWindow);

  // ── Toggle ────────────────────────────────────────────────────────────
  var isOpen = false;
  function toggleWindow() {
    isOpen = !isOpen;
    chatWindow.style.display = isOpen ? 'flex' : 'none';

    // Show greeting once on first open
    if (isOpen && !greeted) {
      greeted = true;
      setTimeout(function() { addMessage('Bonjour ! Comment puis-je vous aider ?', false); }, 300);
    }
  }
  var greeted = false;
  bubble.onclick = toggleWindow;
  document.getElementById('tuni-close').onclick = toggleWindow;

  var messagesContainer = document.getElementById('ileo-messages');
  var isSending = false;

  // ── Helpers ───────────────────────────────────────────────────────────
  function addMessage(text, isUser) {
    var msg = document.createElement('div');
    msg.textContent = text;
    msg.style.cssText = isUser
      ? 'background:#1D9E75;color:#fff;padding:8px 12px;border-radius:12px 12px 2px 12px;font-size:13px;align-self:flex-end;max-width:80%;word-wrap:break-word;'
      : 'background:#f5f5f5;color:#333;padding:8px 12px;border-radius:12px 12px 12px 2px;font-size:13px;align-self:flex-start;max-width:80%;word-wrap:break-word;';
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function showTypingIndicator() {
    // Inject animation CSS once
    if (!document.getElementById('ileo-typing-css')) {
      var style = document.createElement('style');
      style.id = 'ileo-typing-css';
      style.textContent =
        '@keyframes ileoBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}' +
        '.ileo-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#888;margin:0 2px;animation:ileoBounce 1.2s infinite}' +
        '.ileo-dot:nth-child(2){animation-delay:0.15s}' +
        '.ileo-dot:nth-child(3){animation-delay:0.3s}';
      document.head.appendChild(style);
    }
    var msg = document.createElement('div');
    msg.id = 'ileo-typing';
    msg.innerHTML = '<span class="ileo-dot"></span><span class="ileo-dot"></span><span class="ileo-dot"></span>';
    msg.style.cssText = 'background:#f5f5f5;padding:10px 14px;border-radius:12px 12px 12px 2px;align-self:flex-start;display:flex;align-items:center;gap:1px;';
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTypingIndicator() {
    var el = document.getElementById('ileo-typing');
    if (el) el.remove();
  }

  // ── Lead form submit ──────────────────────────────────────────────────
  document.getElementById('ileo-lead-submit').onclick = function() {
    var name  = document.getElementById('ileo-lead-name').value.trim();
    var phone = document.getElementById('ileo-lead-phone').value.trim();

    // P2-3: Inline validation — no alert()
    if (!name || !phone) {
      var errEl = document.getElementById('ileo-lead-err');
      if (!errEl) {
        errEl = document.createElement('div');
        errEl.id = 'ileo-lead-err';
        errEl.style.cssText = 'color:#e53e3e;font-size:11px;margin-bottom:4px;';
        document.getElementById('ileo-lead-form').prepend(errEl);
      }
      errEl.textContent = 'Please provide both your name and phone number.';
      return;
    }

    var btn = document.getElementById('ileo-lead-submit');
    btn.textContent = 'Submitting...';
    btn.disabled = true;

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: businessId, conversationId: conversationId, lead: { name: name, phone: phone } })
    })
    .then(function() {
      document.getElementById('ileo-lead-form').innerHTML =
        '<div style="color:#1D9E75;font-size:12px;text-align:center;padding:4px;">Details submitted! We will be in touch shortly.</div>';
      setTimeout(function() {
        var lf = document.getElementById('ileo-lead-form');
        if (lf) lf.style.display = 'none';
      }, 4000);
    })
    .catch(function(e) {
      console.error(e);
      btn.textContent = 'Error — try again';
      btn.disabled = false;
    });
  };

  // ── Send message ──────────────────────────────────────────────────────
  function sendMessage() {
    if (isSending) return;
    var input   = document.getElementById('ileo-input');
    var sendBtn = document.getElementById('ileo-send');
    var text    = input.value.trim();
    if (!text) return;

    isSending = true;
    // P2-2: Visually disable send button while waiting
    sendBtn.disabled = true;
    sendBtn.style.opacity = '0.5';
    sendBtn.style.cursor  = 'not-allowed';

    addMessage(text, true);
    input.value = '';
    showTypingIndicator();

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: businessId, message: text, conversationId: conversationId })
    })
    .then(function(res) {
      // P1-1: Check HTTP status before reading body
      if (!res.ok) {
        return res.json().catch(function() { return {}; }).then(function(d) {
          hideTypingIndicator();
          addMessage(d.error || 'Sorry, something went wrong. Please try again.', false);
        });
      }
      return res.json().then(function(data) {
        hideTypingIndicator();
        if (data.reply) addMessage(data.reply, false);
        if (data.action === 'SHOW_LEAD_FORM') {
          document.getElementById('ileo-lead-form').style.display = 'flex';
        }
      });
    })
    .catch(function(e) {
      console.error(e);
      hideTypingIndicator();
      addMessage('Network error. Please check your connection and try again.', false);
    })
    .finally(function() {
      isSending = false;
      sendBtn.disabled = false;
      sendBtn.style.opacity = '1';
      sendBtn.style.cursor  = 'pointer';
    });
  }

  document.getElementById('ileo-send').onclick = sendMessage;
  document.getElementById('ileo-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
})();
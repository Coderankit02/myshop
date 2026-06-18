/*!
 * ANANYA AI - Smart Shopping Assistant
 * Rinku Kirana Store
 * Version: 3.0 PREMIUM — WhatsApp-style Chat
 * UI redesigned. Business logic untouched.
 * FIX: Supabase v2 .catch() → try/catch (all DB calls)
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     CONFIG — unchanged
  ══════════════════════════════════════════════════════ */
  const CONFIG = {
    storeName:      'Rinku Kirana Store',
    whatsappNumber: '916393196765',
    supabaseUrl:    'https://pffaflasgwhydkmxwkky.supabase.co',
    supabaseKey:    'sb_publishable__tFDYhkM3blZ0pIVT0YxLA_YvkKq79L',

    storeInfo: {
      timings:   'Monday–Saturday: 8 AM – 9 PM | Sunday: 9 AM – 7 PM',
      phone:     '+91 63931 96765',
      whatsapp:  '6393196765',
      address:   'Rinku Kirana Store, Uttar Pradesh, India',
      email:     'support@rinkukiranastore.com',
      delivery:  '5 km ke andar same-day delivery hoti hai',
      minOrder:  '₹200 minimum order delivery ke liye',
      freeDeliv: '₹200 se upar FREE delivery',
      payment:   'Cash, UPI (GPay, PhonePe, Paytm), Debit/Credit Cards',
      returns:   'Fresh items: 24 ghante | Packaged: 7 din',
      firstOffer:'First order par 10% OFF — code: WELCOME10',
      appOffer:  'App install karo aur weekly special offers paao!',
    },

    faqs: [
      { q: 'Store timings kya hain?',
        a: '🕐 Hamare store ke timings:\nMonday–Saturday: 8 AM – 9 PM\nSunday: 9 AM – 7 PM\n\nOnline order 24/7 place kar sakte hain! 😊' },
      { q: 'Delivery kitni door tak hoti hai?',
        a: '🚚 Hum 5 km ke andar same-day delivery karte hain.\n\n✅ ₹200 se upar FREE delivery\n⏱️ Delivery time: 2–4 ghante\n📦 Order track kar sakte hain account mein.' },
      { q: 'Kaunse payment methods accepted hain?',
        a: '💳 Hum ye payment methods accept karte hain:\n\n• Cash on Delivery\n• Google Pay (GPay)\n• PhonePe\n• Paytm\n• Debit/Credit Cards\n• Net Banking' },
      { q: 'Return policy kya hai?',
        a: '↩️ Return Policy:\n\n🥦 Fresh items (sabzi, fruits, dairy): 24 ghante\n📦 Packaged goods: 7 din\n\nReturn ke liye WhatsApp par contact karein order ID ke saath.' },
      { q: 'Order track kaise karein?',
        a: '🛒 Order track karne ke 2 tarike:\n\n1️⃣ Account → Orders section mein jaayein\n2️⃣ WhatsApp par order ID share karein\n\nHum jaldi update denge! 😊' },
      { q: 'Koi discount ya offer hai?',
        a: '🎉 Current Offers:\n\n🆕 WELCOME10 — First order par 10% OFF\n📱 App install karo — weekly special offers\n🛒 ₹500+ order par extra 5% off\n\nOffer use karne ke liye checkout pe apply karein!' },
      { q: 'Minimum order kya hai?',
        a: '📦 Delivery ke liye minimum order ₹200 hai.\n\nIn-store shopping ke liye koi minimum nahi.\n\n💡 Tip: ₹200+ order karo aur FREE delivery paao!' },
      { q: 'Organic products available hain?',
        a: '🌿 Haan! Hamare paas organic products available hain:\n\n• Organic fruits & vegetables\n• Organic dal & atta\n• Natural spices\n\n"Organic" filter use karke products search karein.' },
    ],

    infoCards: [
      { icon: '🕐', title: 'Store Timings',  body: 'Mon–Sat: 8 AM – 9 PM\nSun: 9 AM – 7 PM' },
      { icon: '🚚', title: 'Delivery',        body: 'Same-day within 5 km\nFREE delivery above ₹200' },
      { icon: '💳', title: 'Payment Methods', body: 'Cash · UPI · GPay\nPhonePe · Paytm · Cards' },
      { icon: '↩️', title: 'Return Policy',   body: 'Fresh items: 24 hours\nPackaged goods: 7 days' },
      { icon: '📞', title: 'Contact',         body: '+91 63931 96765\n(WhatsApp available)' },
      { icon: '🎁', title: 'Current Offer',   body: 'WELCOME10 — 10% OFF\non your first order!' },
    ],

    intents: [
      {
        keys: ['timing','time','open','close','band','kab khula','kab band','schedule','hours','khula'],
        reply: ({ storeInfo: s }) =>
          `🕐 *Store Timings:*\n\n📅 Monday–Saturday: 8 AM – 9 PM\n📅 Sunday: 9 AM – 7 PM\n\nOnline order 24/7 kar sakte hain! 😊`,
      },
      {
        keys: ['deliver','delivery','ship','door','ghar','kitna time','courier','home'],
        reply: ({ storeInfo: s }) =>
          `🚚 *Delivery Info:*\n\n📍 Area: ${s.delivery}\n✅ ${s.freeDeliv}\n⏱️ Time: 2–4 ghante\n\nOrder place karne ke baad track kar sakte hain account mein!`,
      },
      {
        keys: ['payment','pay','upi','gpay','google pay','cash','card','paytm','phonepe','online pay','paise'],
        reply: ({ storeInfo: s }) =>
          `💳 *Payment Methods:*\n\n✅ Cash on Delivery\n✅ Google Pay (GPay)\n✅ PhonePe\n✅ Paytm\n✅ Debit/Credit Cards\n✅ Net Banking\n\nSabse safe: UPI payment recommend karte hain! 😊`,
      },
      {
        keys: ['return','refund','wapas','vapas','exchange','damage','toot','kharab'],
        reply: ({ storeInfo: s }) =>
          `↩️ *Return Policy:*\n\n🥦 Fresh items: 24 ghante ke andar\n📦 Packaged goods: 7 din ke andar\n\nReturn ke liye WhatsApp par order ID bhejein:\n📲 ${s.phone}`,
      },
      {
        keys: ['contact','phone','call','number','email','helpline','support','help'],
        reply: ({ storeInfo: s }) =>
          `📞 *Contact Us:*\n\n📱 Phone/WhatsApp: ${s.phone}\n📧 Email: ${s.email}\n📍 ${s.address}\n\nHum 9 AM–8 PM available hain! 😊`,
      },
      {
        keys: ['address','location','where','kahan','shop','store','map','place','area'],
        reply: ({ storeInfo: s }) =>
          `📍 *Store Location:*\n\n${s.address}\n\nDirections ke liye WhatsApp par message karein — hum map share karenge! 🗺️`,
      },
      {
        keys: ['order','track','status','kahan hai','mera order','my order','order id'],
        reply: () =>
          `🛒 *Order Track Kaise Karein:*\n\n1️⃣ Website pe login karein\n2️⃣ Account → "My Orders" mein jaayein\n3️⃣ Order ID click karein\n\nYa WhatsApp par order ID bhejein — hum status batayenge! 📦`,
      },
      {
        keys: ['discount','offer','coupon','sale','promo','cashback','deal','off','scheme'],
        reply: ({ storeInfo: s }) =>
          `🎉 *Current Offers:*\n\n🆕 Code: WELCOME10 — ${s.firstOffer}\n📱 ${s.appOffer}\n🛒 ₹500+ order par extra 5% off\n\nCheckout pe code apply karein!`,
      },
      {
        keys: ['minimum','min order','kitna order','minimum order'],
        reply: ({ storeInfo: s }) =>
          `📦 *Minimum Order:*\n\nDelivery ke liye: ${s.minOrder}\nIn-store: Koi minimum nahi!\n\n💡 ₹200+ order karo → FREE delivery milegi! ✅`,
      },
      {
        keys: ['organic','natural','fresh','healthy','pesticide free','jaivik'],
        reply: () =>
          `🌿 *Organic Products:*\n\nHaan, hamare paas available hain:\n• Organic Fruits & Vegetables\n• Organic Dal, Atta, Chawal\n• Natural Spices & Masale\n\nWebsite par "Organic" category mein dekho! 🛒`,
      },
      {
        keys: ['price','rate','cost','kitne ka','kitna','mahenga','sasta','cheap'],
        reply: () =>
          `💰 *Pricing:*\n\nHamare prices market rate par hain — kabhi kabhi usse bhi saste!\n\n🛒 Products browse karne ke liye home page par jaayein.\n\n💡 Offers check karo — aur bhi savings milegi! 🎉`,
      },
      {
        keys: ['account','login','signup','password','register','profile'],
        reply: () =>
          `👤 *Account Help:*\n\nLogin/Signup: Website ke top-right corner mein\nPassword bhool gaye: Login page par "Forgot Password"\nProfile update: Account → Profile section\n\nKoi issue? WhatsApp karein! 📲`,
      },
      {
        keys: ['cart','wishlist','basket','add to cart','remove'],
        reply: () =>
          `🛒 *Cart & Wishlist:*\n\nCart: Top-right basket icon\nWishlist: Product page par ❤️ icon tap karein\n\nCart items automatically save hote hain! ✅`,
      },
      {
        keys: ['cancel','cancel order','order cancel'],
        reply: () =>
          `❌ *Order Cancel:*\n\nOrder cancel karne ke liye:\n1️⃣ Account → My Orders mein jaayein\n2️⃣ Order select karein\n3️⃣ "Cancel" button click karein\n\nYa turant WhatsApp karein: +91 63931 96765 📲`,
      },
      {
        keys: ['pwa','app','install','download','mobile app'],
        reply: () =>
          `📱 *App Install Karo:*\n\n1️⃣ Chrome mein website open karo\n2️⃣ Menu (⋮) → "Add to Home Screen"\n3️⃣ Install tap karo\n\nBilkul FREE hai — no Play Store needed! ✅\n\n🎁 App users ko weekly special offers milte hain!`,
      },
      {
        keys: ['namaste','hello','hi','hey','helo','namaskar','good morning','good evening','salam'],
        reply: () =>
          `Namaste! 🙏😊\n\nMain Ananya hoon — Rinku Kirana Store ki smart assistant.\n\nMain in topics mein help kar sakti hoon:\n🚚 Delivery · 💳 Payment · ↩️ Returns\n🎁 Offers · 📞 Contact · 🛒 Orders\n\nKya poochna chahte hain? 😊`,
      },
      {
        keys: ['thanks','thank you','shukriya','dhanyawad','theek hai','ok','okay','achha'],
        reply: () =>
          `Bahut bahut shukriya! 🙏😊\n\nKoi aur sawaal ho toh zaroor poochein.\n\nRinku Kirana Store mein aapka swagat hai! 🌸`,
      },
      {
        keys: ['bye','goodbye','alvida','baad mein','later','tata'],
        reply: () =>
          `Alvida! 👋😊\n\nRinku Kirana Store par aate rahein.\n\nKoi zaroorat ho toh main hamesha yahaan hoon! 🌸`,
      },
    ],
  };

  /* ══════════════════════════════════════════
     STATE — unchanged
  ══════════════════════════════════════════ */
  const state = {
    isOpen:        false,
    activeTab:     'chat',
    messages:      [],
    sessionId:     null,
    userId:        null,
    isTyping:      false,
    unread:        0,
    supabase:      null,
    initialized:   false,
    historyLoaded: false,
  };

  /* ══════════════════════════════════════════
     THEME — unchanged
  ══════════════════════════════════════════ */
  function applyTheme() {
    const isDark = window.matchMedia('(prefers-color-scheme:dark)').matches;
    const el = document.getElementById('ananya-widget');
    if (el) el.setAttribute('data-ananya-theme', isDark ? 'dark' : 'light');
  }
  window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', applyTheme);

  /* ══════════════════════════════════════════
     SUPABASE — FIXED: .catch() → try/catch
  ══════════════════════════════════════════ */
  async function initSupabase() {
    try {
      const SB = window.supabase || window.supabaseJs;
      if (SB && CONFIG.supabaseUrl !== 'YOUR_SUPABASE_URL') {
        state.supabase = SB.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
        let session = null;
        try {
          const res = await state.supabase.auth.getSession();
          session = res?.data?.session || null;
        } catch (e) { /* auth optional */ }
        if (session?.user) state.userId = session.user.id;
      }
    } catch (e) { /* supabase optional */ }
  }

  async function getOrCreateSession() {
    state.sessionId = localStorage.getItem('ananya-session-id');
    if (!state.sessionId) {
      state.sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('ananya-session-id', state.sessionId);
    }
    if (state.supabase) {
      try {
        await state.supabase.from('ananya_chat_sessions').upsert({
          id: state.sessionId,
          user_id: state.userId || null,
          page_url: window.location.pathname,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (e) { /* optional */ }
    }
  }

  async function saveMessage(role, text) {
    if (!state.supabase || !state.sessionId) return;
    try {
      await state.supabase.from('ananya_chat_messages').insert({
        session_id: state.sessionId,
        role,
        content: text,
        created_at: new Date().toISOString(),
      });
    } catch (e) { /* optional */ }
    try {
      await state.supabase.from('ananya_chat_sessions').update({
        last_message: text.slice(0, 100),
        updated_at: new Date().toISOString(),
      }).eq('id', state.sessionId);
    } catch (e) { /* optional */ }
  }

  async function loadHistory() {
    if (!state.supabase || !state.sessionId) return [];
    try {
      const { data } = await state.supabase
        .from('ananya_chat_messages')
        .select('*')
        .eq('session_id', state.sessionId)
        .order('created_at', { ascending: true })
        .limit(20);
      return data || [];
    } catch (e) {
      return [];
    }
  }

  /* ══════════════════════════════════════════
     SMART FREE AI — unchanged
  ══════════════════════════════════════════ */
  function getSmartReply(userMsg) {
    const msg = userMsg.toLowerCase().trim();
    for (const intent of CONFIG.intents) {
      if (intent.keys.some(k => msg.includes(k))) {
        return intent.reply(CONFIG);
      }
    }
    if (/ky[ao]|kaise|kab|kahan|kitna|kaun/.test(msg)) {
      return `Hmm, mujhe exactly samajh nahi aaya 🤔\n\nKya aap in topics mein se kuch pooch rahe hain?\n\n🕐 Timings  🚚 Delivery  💳 Payment\n↩️ Returns  📞 Contact  🎁 Offers\n\nYa seedha WhatsApp karein — hum help karenge! 😊`;
    }
    return `Mujhe is sawaal ka exact jawab abhi nahi pata 😊\n\nMain in topics mein help kar sakti hoon:\n🕐 Store Timings\n🚚 Delivery Info\n💳 Payment Methods\n↩️ Return Policy\n🎁 Offers & Discounts\n📞 Contact Us\n\nYa seedha hamare WhatsApp par poochein:\n📲 +91 63931 96765`;
  }

  /* ══════════════════════════════════════════
     RENDER HELPERS — REDESIGNED (WhatsApp style)
  ══════════════════════════════════════════ */
  function timeStr() {
    return new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  function appendMessage(role, text) {
    const container = document.getElementById('ananya-msgs');
    if (!container) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `ananya-msg ${role}`;

    // Sender name for bot (WhatsApp group style)
    if (role === 'bot') {
      const nameEl = document.createElement('div');
      nameEl.className = 'ananya-sender-name';
      nameEl.textContent = '🌸 Ananya';
      msgDiv.appendChild(nameEl);
    }

    // Bubble
    const bubble = document.createElement('div');
    bubble.className = 'ananya-bubble';
    bubble.style.whiteSpace = 'pre-wrap';
    bubble.textContent = text;
    msgDiv.appendChild(bubble);

    // Meta row: time + ticks
    const meta = document.createElement('div');
    meta.className = 'ananya-msg-meta';

    const timeEl = document.createElement('span');
    timeEl.className = 'ananya-msg-time';
    timeEl.textContent = timeStr();
    meta.appendChild(timeEl);

    if (role === 'user') {
      const ticks = document.createElement('span');
      ticks.className = 'ananya-ticks';
      ticks.textContent = '✓';
      meta.appendChild(ticks);
      // Simulate "seen" after 1.2s
      setTimeout(() => {
        ticks.textContent = '✓✓';
        ticks.classList.add('seen');
      }, 1200);
    }

    msgDiv.appendChild(meta);
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    state.messages.push({ role, text, time: Date.now() });

    if (role === 'bot' && !state.isOpen) {
      state.unread++;
      updateBadge();
    }
  }

  function showTyping() {
    removeTyping();
    const container = document.getElementById('ananya-msgs');
    if (!container) return;
    const el = document.createElement('div');
    el.id = 'ananya-typing-indicator';
    el.className = 'ananya-typing';
    el.innerHTML = `
      <div class="ananya-msg-avatar">🌸</div>
      <div class="ananya-typing-bubble">
        <div class="ananya-typing-dot"></div>
        <div class="ananya-typing-dot"></div>
        <div class="ananya-typing-dot"></div>
      </div>`;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }

  function removeTyping() {
    document.getElementById('ananya-typing-indicator')?.remove();
  }

  function updateBadge() {
    const badge = document.getElementById('ananya-badge');
    if (!badge) return;
    if (state.unread > 0) {
      badge.textContent = state.unread > 9 ? '9+' : state.unread;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  /* ══════════════════════════════════════════
     SEND MESSAGE — unchanged
  ══════════════════════════════════════════ */
  async function sendMessage(text) {
    text = (text || '').trim();
    if (!text || state.isTyping) return;

    const input = document.getElementById('ananya-input');
    if (input) { input.value = ''; input.style.height = 'auto'; }

    appendMessage('user', text);
    saveMessage('user', text);

    state.isTyping = true;
    showTyping();

    await new Promise(r => setTimeout(r, 700 + Math.random() * 700));

    const reply = getSmartReply(text);
    removeTyping();
    state.isTyping = false;

    appendMessage('bot', reply);
    saveMessage('assistant', reply);

    if (state.messages.filter(m => m.role === 'user').length >= 3
        && !document.querySelector('.ananya-whatsapp-banner-inline')) {
      showWhatsappBanner();
    }
  }

  function showWhatsappBanner() {
    const container = document.getElementById('ananya-msgs');
    if (!container) return;
    const banner = document.createElement('a');
    banner.className = 'ananya-whatsapp-banner ananya-whatsapp-banner-inline';
    banner.href = `https://wa.me/${CONFIG.whatsappNumber}?text=Namaste! Rinku Kirana Store se help chahiye.`;
    banner.target = '_blank';
    banner.rel = 'noopener noreferrer';
    banner.innerHTML = `
      <span class="ananya-whatsapp-icon">💬</span>
      <div class="ananya-whatsapp-text">
        <strong>Human se baat karein?</strong>
        <span>WhatsApp par seedha connect karein</span>
      </div>
      <span class="ananya-whatsapp-arrow">→</span>`;
    container.appendChild(banner);
    container.scrollTop = container.scrollHeight;
  }

  /* ══════════════════════════════════════════
     BUILD HTML WIDGET — redesigned markup only
  ══════════════════════════════════════════ */
  function buildWidget() {
    /* Trigger Button */
    const trigger = document.createElement('button');
    trigger.id = 'ananya-trigger';
    trigger.setAttribute('aria-label', 'Open Ananya AI');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `
      <div class="ananya-avatar-ring"></div>
      <span class="ananya-avatar-emoji">🌸</span>
      <span id="ananya-badge" class="ananya-badge hidden">0</span>`;

    /* Hover label */
    const label = document.createElement('div');
    label.className = 'ananya-trigger-label';
    label.textContent = '🌸 Ananya AI';

    /* FAQ HTML */
    const faqHTML = CONFIG.faqs.map((f, i) => `
      <div class="ananya-faq-item" data-idx="${i}">
        <div class="ananya-faq-q">${f.q}<span class="faq-icon">+</span></div>
        <div class="ananya-faq-a">${f.a.replace(/\n/g, '<br>')}</div>
      </div>`).join('');

    /* Info cards */
    const infoHTML = CONFIG.infoCards.map(c => `
      <div class="ananya-info-card">
        <div class="ananya-info-card-icon">${c.icon}</div>
        <div class="ananya-info-card-body">
          <strong>${c.title}</strong>
          <p>${c.body.replace(/\n/g, '<br>')}</p>
        </div>
      </div>`).join('');

    /* Main Widget */
    const widget = document.createElement('div');
    widget.id = 'ananya-widget';
    widget.setAttribute('role', 'dialog');
    widget.setAttribute('aria-label', 'Ananya AI Chat');
    widget.innerHTML = `
      <!-- HEADER -->
      <div class="ananya-header">
        <div class="ananya-header-avatar">🌸</div>
        <div class="ananya-header-info">
          <div class="ananya-header-name">Ananya AI</div>
          <div class="ananya-header-status">Online · Shopping Assistant</div>
        </div>
        <div class="ananya-header-actions">
          <button class="ananya-header-btn" id="ananya-close-btn" title="Close" aria-label="Close">✕</button>
        </div>
      </div>

      <!-- TABS -->
      <div class="ananya-tabs" role="tablist">
        <button class="ananya-tab active" data-tab="chat" role="tab">
          <span class="tab-icon">💬</span>Chat
        </button>
        <button class="ananya-tab" data-tab="faq" role="tab">
          <span class="tab-icon">❓</span>FAQ
        </button>
        <button class="ananya-tab" data-tab="info" role="tab">
          <span class="tab-icon">ℹ️</span>Store Info
        </button>
      </div>

      <!-- CHAT PANEL -->
      <div class="ananya-panel active" data-panel="chat" role="tabpanel">
        <div class="ananya-messages" id="ananya-msgs"></div>
        <div class="ananya-input-area">
          <div class="ananya-input-row">
            <textarea
              id="ananya-input"
              class="ananya-input"
              placeholder="Message..."
              rows="1"
              aria-label="Message input"
            ></textarea>
            <button class="ananya-send-btn" id="ananya-send-btn" aria-label="Send">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- FAQ PANEL -->
      <div class="ananya-panel" data-panel="faq" role="tabpanel">
        <div class="ananya-faq-list">${faqHTML}</div>
      </div>

      <!-- INFO PANEL -->
      <div class="ananya-panel" data-panel="info" role="tabpanel">
        <div class="ananya-info-panel">${infoHTML}</div>
        <a class="ananya-whatsapp-banner"
           href="https://wa.me/${CONFIG.whatsappNumber}?text=Namaste! Rinku Kirana Store se help chahiye."
           target="_blank" rel="noopener noreferrer"
           style="margin:0 12px 12px; display:flex;">
          <span class="ananya-whatsapp-icon">💬</span>
          <div class="ananya-whatsapp-text">
            <strong>WhatsApp Support</strong>
            <span>+91 63931 96765 par connect karein</span>
          </div>
          <span class="ananya-whatsapp-arrow">→</span>
        </a>
      </div>`;

    document.body.appendChild(trigger);
    document.body.appendChild(label);
    document.body.appendChild(widget);
  }

  /* ══════════════════════════════════════════
     EVENTS — unchanged
  ══════════════════════════════════════════ */
  function bindEvents() {
    document.getElementById('ananya-trigger').addEventListener('click', toggleWidget);
    document.getElementById('ananya-close-btn').addEventListener('click', closeWidget);

    document.addEventListener('click', e => {
      const w = document.getElementById('ananya-widget');
      const t = document.getElementById('ananya-trigger');
      if (state.isOpen && w && t && !w.contains(e.target) && !t.contains(e.target)) {
        closeWidget();
      }
    });

    document.querySelectorAll('.ananya-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    document.getElementById('ananya-send-btn').addEventListener('click', () => {
      sendMessage(document.getElementById('ananya-input').value);
    });

    document.getElementById('ananya-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(e.target.value);
      }
    });

    document.getElementById('ananya-input').addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    document.querySelectorAll('.ananya-faq-item').forEach(item => {
      item.querySelector('.ananya-faq-q').addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.ananya-faq-item').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && state.isOpen) closeWidget();
    });
  }

  /* ══════════════════════════════════════════
     OPEN / CLOSE / TABS — unchanged
  ══════════════════════════════════════════ */
  function openWidget() {
    state.isOpen = true;
    document.getElementById('ananya-widget').classList.add('ananya-open');
    document.getElementById('ananya-trigger').classList.add('ananya-trigger-hidden');
    document.getElementById('ananya-trigger').setAttribute('aria-expanded', 'true');
    document.querySelector('.ananya-trigger-label')?.classList.remove('show');
    state.unread = 0;
    updateBadge();

    if (!state.historyLoaded) {
      state.historyLoaded = true;
      loadInitialConversation();
    }

    setTimeout(() => document.getElementById('ananya-input')?.focus(), 420);
  }

  function closeWidget() {
    state.isOpen = false;
    document.getElementById('ananya-widget').classList.remove('ananya-open');
    document.getElementById('ananya-trigger').classList.remove('ananya-trigger-hidden');
    document.getElementById('ananya-trigger').setAttribute('aria-expanded', 'false');
  }

  function toggleWidget() { state.isOpen ? closeWidget() : openWidget(); }

  function switchTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('.ananya-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === tabName));
    document.querySelectorAll('.ananya-panel').forEach(p =>
      p.classList.toggle('active', p.dataset.panel === tabName));
  }

  /* ══════════════════════════════════════════
     INITIAL CONVERSATION — unchanged
  ══════════════════════════════════════════ */
  async function loadInitialConversation() {
    const history = await loadHistory();

    if (history.length > 0) {
      history.forEach(m => appendMessage(
        m.role === 'assistant' ? 'bot' : m.role === 'admin' ? 'bot' : 'user',
        m.content
      ));
      return;
    }

    showTyping();
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 600));
    removeTyping();

    const welcome =
      `Namaste 👋\n\nMain Ananya hoon.\n\nRinku Kirana Store ki smart shopping assistant. 🌸\n\nMain products, orders, delivery aur support mein aapki madad kar sakti hoon.\n\nAaj main aapki kaise madad kar sakti hoon?`;
    appendMessage('bot', welcome);
    saveMessage('assistant', welcome);
  }

  /* ══════════════════════════════════════════
     INIT — unchanged
  ══════════════════════════════════════════ */
  async function init() {
    if (state.initialized) return;
    state.initialized = true;

    buildWidget();
    bindEvents();
    applyTheme();

    await initSupabase();
    await getOrCreateSession();

    setTimeout(() => {
      if (!state.isOpen) {
        const lbl = document.querySelector('.ananya-trigger-label');
        if (lbl) {
          lbl.classList.add('show');
          setTimeout(() => lbl.classList.remove('show'), 4000);
        }
      }
    }, 3000);

    if (!localStorage.getItem('ananya-visited')) {
      localStorage.setItem('ananya-visited', '1');
      setTimeout(() => { if (!state.isOpen) openWidget(); }, 6000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.AnanyaAI = {
    open: openWidget,
    close: closeWidget,
    toggle: toggleWidget,
    send: sendMessage,
  };

})();

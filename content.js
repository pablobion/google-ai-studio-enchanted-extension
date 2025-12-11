
// Enchanted Queue Logic for AI Studio
(() => {
    // Prevent multiple injections
    if (window.ENCHANTED_LOADED) return;
    window.ENCHANTED_LOADED = true;

    console.log("✨ AI Studio Enchanted loaded...");

    // Application State
    const state = {
        queue: [],
        isLoopRunning: false,
        editingId: null // Tracks which item is being edited
    };

    // Selectors Based on User provided HTML
    const SELECTORS = {
        // Specifically searches for textarea inside input container
        textarea: '.input-container textarea', 
        // The send button
        sendButton: 'button.send-button'
    };

    // --- ICONS SVG ---
    const Icons = {
        trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
        minimize: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>`,
        close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
        sparkles: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
        edit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
        check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
    };

    // --- UI CREATION ---
    const createEnchantedUI = () => {
        const existing = document.getElementById('enchanted-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'enchanted-panel';
        
        // HTML Structure
        panel.innerHTML = `
            <div class="enchanted-header">
                <div class="enchanted-title">
                    ${Icons.sparkles}
                    <span>Queue <span id="queue-count" style="opacity:0.6; font-size:11px; margin-left:4px">(0)</span></span>
                </div>
                <div class="enchanted-controls">
                    <button id="enchanted-clear" class="enchanted-btn-icon" title="Clear Queue">${Icons.trash}</button>
                    <button id="enchanted-toggle" class="enchanted-btn-icon" title="Minimize">${Icons.minimize}</button>
                </div>
            </div>
            <div class="enchanted-body">
                <textarea id="enchanted-input" placeholder="Type your prompt...\nEnter to add (Shift+Enter for new line)"></textarea>
                <button id="enchanted-add-btn">
                    Add to Queue
                </button>
                <div id="enchanted-list" class="enchanted-list">
                    <div class="enchanted-empty">Queue is empty</div>
                </div>
                <div class="enchanted-status" id="enchanted-status">
                    <span class="status-dot"></span> <span id="status-text">Ready</span>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Event Listeners
        const addBtn = document.getElementById('enchanted-add-btn');
        const inputEl = document.getElementById('enchanted-input');
        const clearBtn = document.getElementById('enchanted-clear');
        const toggleBtn = document.getElementById('enchanted-toggle');

        addBtn.onclick = addToQueue;
        
        inputEl.onkeydown = (e) => {
            // If Enter WITHOUT Shift, submit.
            // If Shift + Enter, default behavior (new line)
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addToQueue();
            }
        };

        clearBtn.onclick = () => {
            if (state.queue.length > 0 && confirm('Clear entire queue?')) {
                state.queue = [];
                renderQueue();
            }
        };

        toggleBtn.onclick = () => {
            panel.classList.toggle('minimized');
        };
    };

    // --- LOGIC ---
    const addToQueue = () => {
        const input = document.getElementById('enchanted-input');
        const text = input.value.trim();
        
        if (!text) return;

        const item = {
            id: Date.now().toString(),
            text: text,
            status: 'pending'
        };

        state.queue.push(item);
        input.value = '';
        input.focus();
        renderQueue();
        
        if (!state.isLoopRunning) {
            startProcessingLoop();
        }
    };

    // Save item edit
    const saveEdit = (id, newText) => {
        const text = newText.trim();
        if (text) {
            state.queue = state.queue.map(item => 
                item.id === id ? { ...item, text: text } : item
            );
        }
        state.editingId = null;
        renderQueue();
    };

    // Cancel edit
    const cancelEdit = () => {
        state.editingId = null;
        renderQueue();
    };

    const renderQueue = () => {
        const list = document.getElementById('enchanted-list');
        const countSpan = document.getElementById('queue-count');
        
        if (!list || !countSpan) return;

        countSpan.textContent = `(${state.queue.length})`;

        if (state.queue.length === 0) {
            list.innerHTML = '<div class="enchanted-empty">Queue is empty</div>';
            return;
        }

        list.innerHTML = '';
        state.queue.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'enchanted-item';

            if (state.editingId === item.id) {
                // --- EDIT MODE ---
                el.classList.add('editing');
                el.innerHTML = `
                    <textarea class="enchanted-edit-textarea">${item.text}</textarea>
                    <div class="enchanted-edit-actions">
                        <button class="enchanted-btn-action save" title="Save">${Icons.check}</button>
                        <button class="enchanted-btn-action cancel" title="Cancel">${Icons.close}</button>
                    </div>
                `;

                // Edit Listeners
                const textarea = el.querySelector('textarea');
                const saveBtn = el.querySelector('.save');
                const cancelBtn = el.querySelector('.cancel');

                // Auto focus and cursor at end
                setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                }, 10);

                // Save on button click
                saveBtn.onclick = () => saveEdit(item.id, textarea.value);
                
                // Save with Ctrl+Enter
                textarea.onkeydown = (e) => {
                    if (e.ctrlKey && e.key === 'Enter') saveEdit(item.id, textarea.value);
                    if (e.key === 'Escape') cancelEdit();
                };

                cancelBtn.onclick = cancelEdit;

            } else {
                // --- VIEW MODE ---
                el.innerHTML = `
                    <span class="enchanted-item-number">#${index + 1}</span>
                    <span class="enchanted-item-text">${item.text}</span>
                    <div class="enchanted-item-actions">
                        <button class="enchanted-btn-action edit" data-id="${item.id}" title="Edit">
                            ${Icons.edit}
                        </button>
                        <button class="enchanted-btn-action remove" data-id="${item.id}" title="Remove">
                            ${Icons.close}
                        </button>
                    </div>
                `;

                // Action Listeners
                el.querySelector('.edit').onclick = (e) => {
                    e.stopPropagation();
                    state.editingId = item.id;
                    renderQueue();
                };

                el.querySelector('.remove').onclick = (e) => {
                    e.stopPropagation();
                    state.queue = state.queue.filter(i => i.id !== item.id);
                    // If we removed the item being edited, clear edit state
                    if (state.editingId === item.id) state.editingId = null;
                    renderQueue();
                };
            }

            list.appendChild(el);
        });
    };

    const updateStatus = (status) => {
        const statusEl = document.getElementById('enchanted-status');
        const textEl = document.getElementById('status-text');
        
        if (!statusEl || !textEl) return;

        statusEl.classList.remove('status-active', 'status-sending');
        statusEl.style.color = '#94a3b8';

        if (status === 'processing') {
            statusEl.classList.add('status-active');
            textEl.textContent = 'AI Processing...';
        } else if (status === 'sending') {
            statusEl.classList.add('status-sending');
            textEl.textContent = 'Sending...';
        } else {
            textEl.textContent = 'Ready';
        }
    };

    // --- CORE INJECTION LOGIC ---
    const injectTextIntoAngular = (textarea, text) => {
        // 1. Focus
        textarea.focus();
        textarea.click(); 

        // 2. Set value using HTMLTextAreaElement Prototype
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        nativeInputValueSetter.call(textarea, text);

        // 3. Dispatch events to wake up Angular
        const events = ['input', 'change', 'keydown', 'keypress', 'keyup'];
        events.forEach(eventType => {
            textarea.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
    };

    const startProcessingLoop = () => {
        if (state.isLoopRunning) return;
        state.isLoopRunning = true;
        
        console.log("🚀 Enchanted Loop Started");

        setInterval(async () => {
            // If queue is empty or Editing, wait
            if (state.queue.length === 0 || state.editingId) {
                updateStatus('idle');
                return;
            }

            // Find DOM elements
            const sendBtn = document.querySelector(SELECTORS.sendButton);
            const textarea = document.querySelector(SELECTORS.textarea);

            if (!sendBtn || !textarea) {
                return;
            }

            // Check if processing (class 'running')
            const isRunning = sendBtn.classList.contains('running');
            if (isRunning) {
                updateStatus('processing');
                return;
            }

            // Check if disabled
            const isBtnDisabled = sendBtn.hasAttribute('disabled') || sendBtn.getAttribute('aria-disabled') === 'true' || sendBtn.classList.contains('disabled');

            const nextItem = state.queue[0];
            updateStatus('sending');

            // Sending Logic
            // If button is disabled, we likely need to type the text
            if (isBtnDisabled) {
                // Only inject if current text is different
                if (textarea.value !== nextItem.text) {
                    injectTextIntoAngular(textarea, nextItem.text);
                }
            } 
            // If button is enabled and text matches, click!
            else {
                sendBtn.click();
                
                // Remove from queue
                state.queue.shift();
                renderQueue();
                
                // Delay to wait for 'running' state to appear
                await new Promise(r => setTimeout(r, 2000));
            }

        }, 1000); // Loop every 1s
    };

    // Init (Delay to ensure page load)
    setTimeout(createEnchantedUI, 2500);

})();
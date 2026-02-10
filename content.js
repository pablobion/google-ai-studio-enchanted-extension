
// Enchanted Queue Logic for AI Studio
(() => {
    // Prevent multiple injections
    if (window.ENCHANTED_LOADED) return;
    window.ENCHANTED_LOADED = true;

    console.log("✨ AI Studio Enchanted loaded...");

    // Application State
    const state = {
        queue: [],
        status: 'idle',
        isLoopRunning: false,
        editingId: null,
        lastProcessedItemId: null,
        questionMode: false
    };

    // Load initial queue from storage
    chrome.storage.local.get(['enchantedQueue'], (result) => {
        if (result.enchantedQueue) {
            state.queue = result.enchantedQueue;
            renderQueue();
            if (state.queue.length > 0 && !state.isLoopRunning) {
                startProcessingLoop();
            }
        }
    });

    const syncStorage = () => {
        chrome.storage.local.set({ enchantedQueue: state.queue });
    };

    // Selectors Based on User provided HTML
    const SELECTORS = {
        // Container of the chat input (queue is inserted above this)
        inputContainer: '.input-container',
        // Specifically searches for textarea inside input container
        textarea: '.input-container textarea',
        // The send button
        sendButton: 'button.send-button',
        // Running indicator (spinner + stop) shown when AI is processing
        runningIcon: '.running-icon',
        // File support (scoped to input)
        previewImage: '.input-container img.preview-image',
        removeFileBtn: '.input-container .remove-file-button'
    };

    const ADD_TO_QUEUE_BTN_ID = 'enchanted-add-to-queue-btn';
    const QUESTION_MODE_BTN_ID = 'enchanted-question-mode-btn';
    const COFFEE_BTN_ID = 'enchanted-coffee-btn';
    const COFFEE_URL = 'https://buymeacoffee.com/bionlabs';
    const QUESTION_PROMPT = `[SYSTEM] The user has enabled "QUESTIONS ONLY" mode.

MANDATORY INSTRUCTIONS:
1. ONLY answer questions or conceptual doubts.
2. DO NOT GENERATE CODE (no code blocks), unless it is ABSOLUTELY necessary for a minimal 1-2 line example.
3. Focus on theoretical, educational, and direct explanations.
4. If the user asks to generate something, politely decline and remind them that this mode is for questions.

---
User Message:
`;

    // --- ICONS SVG ---
    const Icons = {
        trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
        minimize: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>`,
        close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
        sparkles: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
        edit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
        check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        send: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4L22 2Z"/><path d="M22 2 11 13"/></svg>`
    };

    // --- UI CREATION (queue bar above main chat input) ---
    const createEnchantedUI = () => {
        const existing = document.getElementById('enchanted-panel');
        if (existing) existing.remove();

        const inputContainer = document.querySelector(SELECTORS.inputContainer);
        if (!inputContainer || !inputContainer.parentNode) return;

        const panel = document.createElement('div');
        panel.id = 'enchanted-panel';
        panel.className = 'enchanted-queue-above-chat';

        panel.innerHTML = `<div id="enchanted-list" class="enchanted-list"></div>`;

        inputContainer.parentNode.insertBefore(panel, inputContainer);
    };

    // --- LOGIC ---
    const addToQueue = () => {
        const input = document.getElementById('enchanted-input');
        if (!input) return;
        const text = input.value.trim();

        if (!text) return;

        const item = {
            id: Date.now().toString(),
            text: text,
            status: 'pending'
        };

        state.queue.push(item);
        syncStorage();
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
        const panel = document.getElementById('enchanted-panel');
        const list = document.getElementById('enchanted-list');
        if (!list) return;

        if (state.queue.length === 0) {
            list.innerHTML = '';
            if (panel) panel.classList.add('enchanted-queue-hidden');
            return;
        }

        if (panel) panel.classList.remove('enchanted-queue-hidden');
        list.innerHTML = '';
        state.queue.forEach((item, index) => {
            const hasImages = item.images && item.images.length > 0;
            const el = document.createElement('div');
            el.className = 'enchanted-item';

            let imagesHtml = '';
            if (hasImages) {
                // Show only the first image as a thumbnail per line
                imagesHtml = `<div class="enchanted-item-thumbnail-container">
                    <img src="${item.images[0]}" class="enchanted-item-thumbnail">
                    ${item.images.length > 1 ? `<span class="enchanted-item-more-count">+${item.images.length - 1}</span>` : ''}
                </div>`;
            }

            el.innerHTML = `
                <span class="enchanted-item-number">${index + 1}.</span>
                ${imagesHtml}
                <span class="enchanted-item-text">
                    ${hasImages ? '<span style="color: #eab308; margin-right: 4px;" title="Contém imagem">🖼️</span>' : ''}
                    ${item.isQuestionMode ? '<span style="color: #a855f7; font-weight: bold; margin-right: 4px;" title="Modo Dúvida Ativo">[?]</span>' : ''}
                    ${escapeHtml(item.originalText || item.text) || (hasImages ? '<i style="opacity: 0.5">Apenas imagem</i>' : '')}
                </span>
                <button type="button" class="enchanted-item-remove" data-id="${item.id}" title="Remover">×</button>
            `;
            el.querySelector('.enchanted-item-remove').onclick = (e) => {
                e.stopPropagation();
                state.queue = state.queue.filter(i => i.id !== item.id);
                syncStorage();
                if (state.editingId === item.id) state.editingId = null;
                renderQueue();
            };
            list.appendChild(el);
        });
    };

    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
    const updateStatus = (status) => {
        state.status = status || 'idle';
        try {
            chrome.storage.local.set({ enchantedStatus: state.status });
        } catch (e) {}
    };

    // Add current chat input to queue (from the page textarea) and clear the input
    const addFromChatToQueue = () => {
        const textarea = document.querySelector(SELECTORS.textarea);
        if (!textarea) return;

        const text = textarea.value.trim();
        const inputContainer = document.querySelector(SELECTORS.inputContainer);
        const previewImages = inputContainer
            ? Array.from(inputContainer.querySelectorAll('img.preview-image')).map(img => img.src)
            : [];

        if (!text && previewImages.length === 0) return;

        let finalText = text;
        if (state.questionMode) {
            finalText = QUESTION_PROMPT + text;
        }

        const item = {
            id: Date.now().toString(),
            text: finalText,
            originalText: text, // Keep original for UI if needed, or just use text
            isQuestionMode: state.questionMode,
            images: previewImages,
            status: 'pending'
        };
        state.queue.push(item);
        syncStorage();

        // Clear textarea
        injectTextIntoAngular(textarea, '');

        // Clear files from preview
        document.querySelectorAll(SELECTORS.removeFileBtn).forEach(btn => btn.click());

        renderQueue();
        if (!state.isLoopRunning) startProcessingLoop();
    };

    // Inject the "Add to queue" button as a sibling to the LEFT of the send button
    // --- CORE INJECTION LOGIC ---
    const handleKeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // Check if AI is processing
            const sendBtn = document.querySelector(SELECTORS.sendButton);
            if (!sendBtn) return;

            const sendIcon = sendBtn.querySelector('.send-icon');
            const iconText = sendIcon ? sendIcon.textContent.trim().toLowerCase() : '';
            const isSendIcon = iconText.includes('arrow_upward');

            const isProcessing = !isSendIcon ||
                               sendBtn.classList.contains('running') ||
                               !!document.querySelector(SELECTORS.runningIcon) ||
                               !!document.querySelector('button.stop-button, ms-stop-button, .stop-icon');

            if (isProcessing) {
                console.log("⌨️ Intercepted Enter while processing -> Adding to queue");
                e.preventDefault();
                e.stopPropagation();
                addFromChatToQueue();
            }
        }
    };

    const injectAddToQueueButton = () => {
        const textarea = document.querySelector(SELECTORS.textarea);
        if (textarea && !textarea.dataset.enchantedListener) {
            textarea.addEventListener('keydown', handleKeydown, true);
            textarea.dataset.enchantedListener = 'true';
        }

        const sendBtn = document.querySelector(SELECTORS.sendButton);
        if (!sendBtn || !sendBtn.parentNode) return;

        // 1. Inject Question Mode Button
        if (!document.getElementById(QUESTION_MODE_BTN_ID)) {
             const qBtn = document.createElement('button');
             qBtn.id = QUESTION_MODE_BTN_ID;
             qBtn.type = 'button';
             qBtn.title = 'Modo Dúvida (Não gera código)';
             qBtn.textContent = '?';
             qBtn.onclick = (e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 state.questionMode = !state.questionMode;
                 qBtn.classList.toggle('active', state.questionMode);
             };
             sendBtn.parentNode.insertBefore(qBtn, sendBtn);
        }

        // 2. Inject Add Queue Button
        if (document.getElementById(ADD_TO_QUEUE_BTN_ID)) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = ADD_TO_QUEUE_BTN_ID;
        btn.title = 'Adicionar comando à fila';
        btn.setAttribute('aria-label', 'Adicionar comando à fila');
        btn.className = 'enchanted-add-to-queue-btn';
        btn.innerHTML = `<span class="enchanted-add-to-queue-icon">${Icons.send}</span>`;
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            addFromChatToQueue();
        };

        // Insert BEFORE the send button (so: QuestionBtn, QueueBtn, SendBtn)
        // Since we already inserted QuestionBtn before SendBtn, if we insert this before SendBtn again,
        // it will end up between QuestionBtn and SendBtn if called in order, or we might need to be careful with siblings.
        // Actually insertBefore inserts before the reference node.
        // Current DOM: [ ... , QuestionBtn, SendBtn ]
        // We want: [ ... , QuestionBtn, QueueBtn, SendBtn ]
        // So simply inserting before SendBtn again works fine.
        sendBtn.parentNode.insertBefore(btn, sendBtn);
    };

    const injectCoffeeButton = () => {
        if (document.getElementById(COFFEE_BTN_ID)) return;

        // Find the "draw" icon span
        const spans = Array.from(document.querySelectorAll('span.material-symbols-outlined'));
        const drawSpan = spans.find(s => s.textContent.trim() === 'draw');

        if (!drawSpan) return;

        // Find the parent button or container to insert before
        const targetElement = drawSpan.closest('button') || drawSpan;
        if (!targetElement || !targetElement.parentNode) return;

        const coffeeBtn = document.createElement('button');
        coffeeBtn.id = COFFEE_BTN_ID;
        coffeeBtn.type = 'button';
        coffeeBtn.className = 'enchanted-coffee-btn';
        coffeeBtn.title = 'Buy me a coffee';
        coffeeBtn.innerHTML = '☕';
        coffeeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(COFFEE_URL, '_blank');
        };

        targetElement.parentNode.insertBefore(coffeeBtn, targetElement);
    };

    // --- CORE INJECTION LOGIC ---
    const injectTextIntoAngular = (textarea, text) => {
        // 1. Focus
        textarea.focus();
        textarea.click();

        // 2. Set value using HTMLTextAreaElement Prototype
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(textarea, text);
        } else {
            textarea.value = text;
        }

        // 3. Dispatch events to wake up Angular
        // We include a variety of events to ensure change detection triggers
        const events = ['input', 'change', 'keydown', 'keypress', 'keyup'];
        events.forEach(eventType => {
            textarea.dispatchEvent(new Event(eventType, { bubbles: true }));
        });

        // Trigger a fake composition event if needed
        textarea.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: text }));
    };

    const pasteBase64Image = async (textarea, base64) => {
        try {
            const fetchRes = await fetch(base64);
            const blob = await fetchRes.blob();
            const file = new File([blob], "image.png", { type: blob.type });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);

            const event = new ClipboardEvent('paste', {
                clipboardData: dataTransfer,
                bubbles: true,
                cancelable: true
            });

            textarea.focus();
            textarea.dispatchEvent(event);
            console.log("📸 Image paste event dispatched");
        } catch (e) {
            console.error("❌ Error pasting image:", e);
        }
    };

    let lastPasteTime = 0;
    let pasteAttempts = 0;

    const startProcessingLoop = () => {
        if (state.isLoopRunning) return;
        state.isLoopRunning = true;

        console.log("🚀 Enchanted Loop Started");

        setInterval(async () => {
            // If queue is empty or Editing, wait
            if (state.queue.length === 0 || state.editingId) {
                updateStatus('idle');
                state.lastProcessedItemId = null;
                return;
            }

            // Find DOM elements
            const sendBtn = document.querySelector(SELECTORS.sendButton);
            const textarea = document.querySelector(SELECTORS.textarea);

            if (!sendBtn || !textarea) return;

            // Robust running check: inspect icon text and look for stop indicators
            const sendIcon = sendBtn.querySelector('.send-icon');
            const iconText = sendIcon ? sendIcon.textContent.trim().toLowerCase() : '';
            const isSendIcon = iconText.includes('arrow_upward');

            const isProcessing = !isSendIcon ||
                               sendBtn.classList.contains('running') ||
                               !!document.querySelector(SELECTORS.runningIcon) ||
                               !!document.querySelector('button.stop-button, ms-stop-button, .stop-icon');

            if (isProcessing) {
                updateStatus('processing');
                // Reset pasting state if AI starts running
                pasteAttempts = 0;
                return;
            }

            const nextItem = state.queue[0];
            updateStatus('sending');

            // NEW: Sanitize state between items
            if (state.lastProcessedItemId !== nextItem.id) {
                const currentPreviews = document.querySelectorAll(SELECTORS.previewImage);
                const currentText = textarea.value || '';

                if (currentPreviews.length > 0 || currentText.trim() !== '') {
                    console.log(`🧹 Cleaning up before starting item ${nextItem.id}`);
                    injectTextIntoAngular(textarea, '');
                    document.querySelectorAll(SELECTORS.removeFileBtn).forEach(btn => btn.click());
                    // We don't return here, we proceed to set the id so next tick it's ready
                }
                state.lastProcessedItemId = nextItem.id;
                return; // Wait for next tick to ensure cleanup is processed by Angular/DOM
            }

            // 1. Ensure Text is correct (using trim for comparison)
            const currentText = textarea.value || '';
            if (currentText.trim() !== nextItem.text.trim()) {
                injectTextIntoAngular(textarea, nextItem.text);
                // Return to wait for Angular to update the button status in the next tick
                return;
            }

            // 2. Ensure Images are correct
            if (nextItem.images && nextItem.images.length > 0) {
                const currentPreviews = document.querySelectorAll(SELECTORS.previewImage);
                if (currentPreviews.length < nextItem.images.length) {
                    const now = Date.now();
                    // Avoid flooding pastes: attempt every 3 seconds
                    if (now - lastPasteTime > 3000) {
                        const missingCount = nextItem.images.length - currentPreviews.length;
                        console.log(`🖼️ Pasting ${missingCount} missing image(s) [${currentPreviews.length}/${nextItem.images.length}]`);

                        // To avoid duplicates, we only paste the missing items.
                        // We paste from index 'currentPreviews.length' onwards.
                        for (let i = currentPreviews.length; i < nextItem.images.length; i++) {
                            await pasteBase64Image(textarea, nextItem.images[i]);
                        }

                        lastPasteTime = now;
                        pasteAttempts++;
                    }
                    return;
                } else if (currentPreviews.length > nextItem.images.length) {
                    // This shouldn't happen with the cleanup logic above, but just in case
                    document.querySelectorAll(SELECTORS.removeFileBtn).forEach(btn => btn.click());
                    return;
                }
            } else {
                // Item has NO images, but if there are previews, clear them
                const currentPreviews = document.querySelectorAll(SELECTORS.previewImage);
                if (currentPreviews.length > 0) {
                    document.querySelectorAll(SELECTORS.removeFileBtn).forEach(btn => btn.click());
                    return;
                }
            }

            // Reset paste attempts once everything is ready
            pasteAttempts = 0;

            // 3. Final Send Check
            // Check if disabled by attribute, aria-disabled, or specific classes
            const isBtnDisabled = sendBtn.hasAttribute('disabled') ||
                                 sendBtn.getAttribute('aria-disabled') === 'true' ||
                                 sendBtn.classList.contains('disabled') ||
                                 sendBtn.classList.contains('mat-button-disabled');

            if (!isBtnDisabled) {
                console.log(`✅ Sending item: ${nextItem.id}`);
                sendBtn.click();

                // Remove from queue ONLY after clicking
                state.queue.shift();
                syncStorage();
                renderQueue();

                // Delay to wait for 'running' state to trigger
                await new Promise(r => setTimeout(r, 2000));
            } else {
                // If text is there but button is still disabled, try one more nudge
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }

        }, 1000); // Loop every 1s
    };

    const ensureQueuePanel = () => {
        if (!document.getElementById('enchanted-panel') && document.querySelector(SELECTORS.inputContainer)) {
            createEnchantedUI();
        }
    };

    // Init (Delay to ensure page load)
    setTimeout(() => {
        createEnchantedUI();
        injectAddToQueueButton();
        injectCoffeeButton();
        setInterval(() => {
            ensureQueuePanel();
            injectAddToQueueButton();
            injectCoffeeButton();
        }, 3000);
    }, 2500);

})();
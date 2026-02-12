
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
        questionMode: false,
        extensionEnabled: true,
        commands: []
    };

    // Load initial queue and settings from storage
    chrome.storage.local.get(['enchantedQueue', 'extensionEnabled', 'focusModeEnabled', 'enchantedCommands'], (result) => {
        if (result.extensionEnabled !== undefined) {
            state.extensionEnabled = result.extensionEnabled;
        }
        const defaultCommands = [
            { name: '/refactor', prompt: 'Refactor this code to be more efficient and follow best practices.' },
            { name: '/fix', prompt: 'Find and fix the bugs in this code snippet.' }
        ];
        state.commands = result.enchantedCommands || defaultCommands;

        if (result.enchantedQueue) {
            state.queue = result.enchantedQueue;
            renderQueue();
            if (state.queue.length > 0 && !state.isLoopRunning && state.extensionEnabled) {
                startProcessingLoop();
            }
        }
    });

    // Listen for storage changes (On/Off toggle)
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.extensionEnabled) {
            state.extensionEnabled = changes.extensionEnabled.newValue;
            console.log("✨ Extension " + (state.extensionEnabled ? "Enabled" : "Disabled"));
            if (!state.extensionEnabled) {
                removeUI();
            } else {
                init();
            }
        }
        if (changes.enchantedCommands) {
            state.commands = changes.enchantedCommands.newValue || [];
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
    const COMMAND_MODE_BTN_ID = 'enchanted-command-mode-btn';
    const COMMAND_MANAGER_BTN_ID = 'enchanted-command-manager-btn';
    const COFFEE_BTN_ID = 'enchanted-coffee-btn';
    const COFFEE_URL = 'https://buymeacoffee.com/bionlabs';
    const QUESTION_PROMPT_PREFIX = `This is a question only, do not provide any code in your response. Answer it in the same language as the following message: `;


    // --- ICONS SVG ---
    const Icons = {
        check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        send: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4L22 2Z"/><path d="M22 2 11 13"/></svg>`,
        plusCircle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
        drag: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>`
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

    let draggedItemIdx = null;

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
            el.draggable = true;
            el.dataset.index = index;

            let imagesHtml = '';
            if (hasImages) {
                imagesHtml = `<div class="enchanted-item-thumbnail-container">
                    <img src="${item.images[0]}" class="enchanted-item-thumbnail">
                    ${item.images.length > 1 ? `<span class="enchanted-item-more-count">+${item.images.length - 1}</span>` : ''}
                </div>`;
            }

            el.innerHTML = `
                <div class="enchanted-item-drag-handle" style="cursor: grab; display: flex; align-items: center; color: rgba(255,255,255,0.25);">
                    ${Icons.drag}
                </div>
                <span class="enchanted-item-number">${index + 1}.</span>
                ${imagesHtml}
                <span class="enchanted-item-text">
                    ${hasImages ? '<span style="color: #eab308; margin-right: 4px;" title="Contém imagem">🖼️</span>' : ''}
                    ${item.isQuestionMode ? '<span style="color: #a855f7; font-weight: bold; margin-right: 4px;" title="Question Mode Active">[?]</span>' : ''}
                    ${escapeHtml(item.originalText || item.text) || (hasImages ? '<i style="opacity: 0.5">Image only</i>' : '')}
                </span>
                <button type="button" class="enchanted-item-remove" data-id="${item.id}" title="Remove">×</button>
            `;

            // Drag Events
            el.ondragstart = (e) => {
                draggedItemIdx = index;
                el.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            };

            el.ondragend = () => {
                el.classList.remove('dragging');
                draggedItemIdx = null;
                document.querySelectorAll('.enchanted-item').forEach(i => i.classList.remove('drag-over'));
            };

            el.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                return false;
            };

            el.ondragenter = () => el.classList.add('drag-over');
            el.ondragleave = () => el.classList.remove('drag-over');

            el.ondrop = (e) => {
                e.preventDefault();
                const targetIdx = parseInt(el.dataset.index);
                if (draggedItemIdx !== null && draggedItemIdx !== targetIdx) {
                    const itemToMove = state.queue.splice(draggedItemIdx, 1)[0];
                    state.queue.splice(targetIdx, 0, itemToMove);
                    syncStorage();
                    renderQueue();
                }
                return false;
            };

            el.querySelector('.enchanted-item-remove').onclick = (e) => {
                e.stopPropagation();
                state.queue = state.queue.filter(i => i.id !== item.id);
                syncStorage();
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
            finalText = QUESTION_PROMPT_PREFIX + text;
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

    const showCommandManagerModal = () => {
        let modal = document.getElementById('enchanted-command-manager-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'enchanted-command-manager-modal';
            document.body.appendChild(modal);
        }

        const renderManagerList = () => {
            const listContainer = modal.querySelector('.enchanted-manager-list');
            if (!listContainer) return;
            listContainer.innerHTML = '';

            if (state.commands.length === 0) {
                listContainer.innerHTML = '<div style="padding: 10px; color: #94a3b8; font-size: 11px; text-align: center;">No commands yet. Create one below!</div>';
            } else {
                state.commands.forEach((cmd, idx) => {
                    const item = document.createElement('div');
                    item.className = 'enchanted-manager-item';
                    item.innerHTML = `
                        <div class="enchanted-manager-info">
                            <span class="enchanted-manager-name">${cmd.name}</span>
                            <span class="enchanted-manager-prompt">${cmd.prompt}</span>
                        </div>
                        <button class="enchanted-manager-delete" data-index="${idx}" title="Delete">${Icons.trash}</button>
                    `;
                    item.querySelector('.enchanted-manager-delete').onclick = () => {
                        state.commands.splice(idx, 1);
                        chrome.storage.local.set({ enchantedCommands: state.commands }, renderManagerList);
                    };
                    listContainer.appendChild(item);
                });
            }
        };

        modal.innerHTML = `
            <div class="enchanted-manager-header">
                <span class="enchanted-manager-title">Manage Commands</span>
                <button id="enchanted-manager-modal-close" title="Close">${Icons.close}</button>
            </div>
            <div class="enchanted-manager-list"></div>
            <div class="enchanted-manager-form">
                <input type="text" class="enchanted-manager-input cmd-name-in" placeholder="/name (ex: /fix)">
                <input type="text" class="enchanted-manager-input cmd-prompt-in" placeholder="Prompt text...">
                <button class="enchanted-manager-add-btn">Add Command</button>
            </div>
        `;

        renderManagerList();

        modal.querySelector('#enchanted-manager-modal-close').onclick = () => modal.classList.remove('visible');

        modal.querySelector('.enchanted-manager-add-btn').onclick = () => {
            const nameIn = modal.querySelector('.cmd-name-in');
            const promptIn = modal.querySelector('.cmd-prompt-in');
            const name = nameIn.value.trim();
            const prompt = promptIn.value.trim();

            if (name && prompt) {
                const finalName = name.startsWith('/') ? name : '/' + name;
                state.commands.push({ name: finalName, prompt });
                chrome.storage.local.set({ enchantedCommands: state.commands }, () => {
                    renderManagerList();
                    nameIn.value = '';
                    promptIn.value = '';
                });
            }
        };

        modal.classList.add('visible');

        // Hide modal when clicking far outside
        const hideManagerModal = (e) => {
            if (modal.classList.contains('visible') && !modal.contains(e.target)) {
                modal.classList.remove('visible');
                document.removeEventListener('click', hideManagerModal);
            }
        };
        setTimeout(() => document.addEventListener('click', hideManagerModal), 10);
    };

    const showCommandsModal = (textarea, filter = '') => {
        let modal = document.getElementById('enchanted-commands-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'enchanted-commands-modal';
            document.body.appendChild(modal);
        }

        const rect = textarea.getBoundingClientRect();
        modal.style.left = `${rect.left}px`;
        modal.style.bottom = `${window.innerHeight - rect.top + 10}px`;

        modal.innerHTML = '';
        const allCommands = state.commands || [];
        const filtered = filter
            ? allCommands.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
            : allCommands;

        if (filtered.length === 0) {
            modal.innerHTML = `<div style="padding: 10px; color: #94a3b8; font-size: 12px; text-align: center;">${filter ? 'No commands match "' + filter + '"' : 'No commands saved.'}</div>`;
        } else {
            filtered.forEach(cmd => {
                const item = document.createElement('div');
                item.className = 'enchanted-command-item';
                item.innerHTML = `
                    <span class="enchanted-command-name">${cmd.name}</span>
                    <span class="enchanted-command-prompt">${cmd.prompt}</span>
                `;
                item.onclick = (e) => {
                    e.stopPropagation();
                    const currentVal = textarea.value;
                    const words = currentVal.split(' ');
                    // Replace the word that starts with /
                    const slashIndex = words.findIndex(w => w.startsWith('/'));
                    if (slashIndex !== -1) {
                        words[slashIndex] = cmd.prompt;
                        injectTextIntoAngular(textarea, words.join(' '));
                    } else {
                        const newVal = currentVal ? currentVal + ' ' + cmd.prompt : cmd.prompt;
                        injectTextIntoAngular(textarea, newVal);
                    }
                    modal.classList.remove('visible');
                    textarea.focus();
                };
                modal.appendChild(item);
            });
        }

        // Add "Manage Commands" button at the bottom
        const manageItem = document.createElement('div');
        manageItem.className = 'enchanted-command-item manage-trigger';
        manageItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; color: #3b82f6;">
                <span style="display: flex; align-items: center; justify-content: center; width: 16px; height: 16px;">${Icons.plusCircle}</span>
                <span style="font-weight: 700; font-size: 16px;">Manage Slash Commands</span>
            </div>
        `;
        manageItem.onclick = (e) => {
            e.stopPropagation();
            modal.classList.remove('visible');
            showCommandManagerModal();
        };
        modal.appendChild(manageItem);

        modal.classList.add('visible');

        // Auto-select first item
        const items = modal.querySelectorAll('.enchanted-command-item');
        if (items.length > 0) {
            items[0].classList.add('selected');
        }

        // Hide modal when clicking outside
        const hideModal = (e) => {
            if (!modal.contains(e.target)) {
                modal.classList.remove('visible');
                document.removeEventListener('click', hideModal);
            }
        };
        setTimeout(() => document.addEventListener('click', hideModal), 10);
    };

    const handleTextareaInput = (e) => {
        const value = e.target.value;
        const words = value.split(' ');
        const activeWord = words[words.length - 1];

        if (activeWord.startsWith('/') && !activeWord.includes(' ', 1)) {
            showCommandsModal(e.target, activeWord.substring(1));
        } else {
            const modal = document.getElementById('enchanted-commands-modal');
            if (modal) modal.classList.remove('visible');
        }
    };

    let isRecording = false;
    const handleAltPushToTalk = (e) => {
        if (!state.extensionEnabled) return;

        if (e.key === 'Alt') {
            const micBtn = document.querySelector('button[aria-label="Speech to text"]');
            if (!micBtn) return;

            if (e.type === 'keydown' && !isRecording) {
                e.preventDefault();
                isRecording = true;
                micBtn.click();
                console.log("🎤 Recording started (Alt hold)");
            } else if (e.type === 'keyup' && isRecording) {
                isRecording = false;
                micBtn.click();
                console.log("🎤 Recording stopped (Alt release)");
            }
        }
    };

    const handleKeydown = (e) => {
        const modal = document.getElementById('enchanted-commands-modal');
        const isModalVisible = modal && modal.classList.contains('visible');

        if (isModalVisible) {
            const items = Array.from(modal.querySelectorAll('.enchanted-command-item'));
            let selectedIndex = items.findIndex(item => item.classList.contains('selected'));

            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (selectedIndex !== -1) {
                    items[selectedIndex].click();
                } else if (items.length > 0) {
                    items[0].click();
                }
                return;
            }

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (items.length === 0) return;

                items.forEach(item => item.classList.remove('selected'));

                if (e.key === 'ArrowDown') {
                    selectedIndex = (selectedIndex + 1) % items.length;
                } else {
                    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                }

                items[selectedIndex].classList.add('selected');
                items[selectedIndex].scrollIntoView({ block: 'nearest' });
                return;
            }

            if (e.key === 'Escape') {
                modal.classList.remove('visible');
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            // Check if extension is enabled
            if (!state.extensionEnabled) return;

            const sendBtn = document.querySelector(SELECTORS.sendButton);
            if (!sendBtn) return;

            const sendIcon = sendBtn.querySelector('.send-icon');
            const iconText = sendIcon ? sendIcon.textContent.trim().toLowerCase() : '';
            const isSendIcon = iconText.includes('arrow_upward');

            const isProcessing = !isSendIcon ||
                               sendBtn.classList.contains('running') ||
                               !!document.querySelector(SELECTORS.runningIcon) ||
                               !!document.querySelector('button.stop-button, ms-stop-button, .stop-icon');

            // If Question Mode is ON OR AI is processing, we ALWAYS use the queue
            if (state.questionMode || isProcessing) {
                console.log("⌨️ Intercepted Enter (Queue/Question Mode) -> Adding to queue");
                e.preventDefault();
                e.stopPropagation();
                addFromChatToQueue();
            }
        }
    };

    const handleNativeSendClick = (e) => {
        // Only intercept if extension is enabled AND it's a real user click (e.isTrusted)
        // This prevents intercepting our own programmatic clicks from the loop
        if (!state.extensionEnabled || !e.isTrusted) return;

        if (state.questionMode) {
            console.log("🖱️ Intercepted User Send Click (Question Mode) -> Adding to queue instead");
            e.preventDefault();
            e.stopPropagation();
            addFromChatToQueue();
        }
    };

    const injectAddToQueueButton = () => {
        const textarea = document.querySelector(SELECTORS.textarea);
        if (textarea && !textarea.dataset.enchantedListener) {
            textarea.addEventListener('keydown', handleKeydown, true);
            window.addEventListener('keydown', handleAltPushToTalk, true);
            window.addEventListener('keyup', handleAltPushToTalk, true);
            textarea.addEventListener('input', handleTextareaInput);
            textarea.addEventListener('click', () => {
                const modal = document.getElementById('enchanted-commands-modal');
                if (modal) modal.classList.remove('visible');
            });
            textarea.dataset.enchantedListener = 'true';
        }

        const sendBtn = document.querySelector(SELECTORS.sendButton);
        if (!sendBtn || !sendBtn.parentNode) return;

        // Attach listener to native send button to intercept if Question Mode is ON
        if (!sendBtn.dataset.enchantedInterceptor) {
            sendBtn.addEventListener('click', handleNativeSendClick, true);
            sendBtn.dataset.enchantedInterceptor = 'true';
        }

        // 0.1 Inject Command Button (/)
        if (!document.getElementById(COMMAND_MODE_BTN_ID)) {
             const cBtn = document.createElement('button');
             cBtn.id = COMMAND_MODE_BTN_ID;
             cBtn.type = 'button';
             cBtn.title = 'Slash Commands';
             cBtn.className = 'enchanted-chat-btn';
             cBtn.textContent = '/';
             cBtn.onclick = (e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 showCommandsModal(textarea);
             };
             sendBtn.parentNode.insertBefore(cBtn, sendBtn);
        }
        // 1. Inject Question Mode Button
        if (!document.getElementById(QUESTION_MODE_BTN_ID)) {
             const qBtn = document.createElement('button');
             qBtn.id = QUESTION_MODE_BTN_ID;
             qBtn.type = 'button';
             qBtn.className = 'enchanted-chat-btn';
             qBtn.title = 'Question Mode (No Code)';
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
        btn.title = 'Add to Queue';
        btn.setAttribute('aria-label', 'Add to Queue');
        btn.className = 'enchanted-chat-btn';
        btn.style.borderRadius = '50% !important';
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

    const removeUI = () => {
        console.log("🧹 Removing Enchanted UI...");

        // remove summ logic
        const elementsToRemove = [
            'enchanted-panel',
            QUESTION_MODE_BTN_ID,
            COMMAND_MODE_BTN_ID,
            FOCUS_MODE_BTN_ID,
            'enchanted-commands-modal',
            ADD_TO_QUEUE_BTN_ID,
            COFFEE_BTN_ID
        ];

        elementsToRemove.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        // Revert message styles
        document.querySelectorAll('.enchanted-question-bubble').forEach(msg => {
            msg.classList.remove('enchanted-question-bubble');
        });

        // Remove listeners from native elements
        const textarea = document.querySelector(SELECTORS.textarea);
        if (textarea) {
            textarea.removeEventListener('keydown', handleKeydown, true);
            textarea.removeEventListener('input', handleTextareaInput);
            delete textarea.dataset.enchantedListener;
        }

        const sendBtn = document.querySelector(SELECTORS.sendButton);
        if (sendBtn) {
            sendBtn.removeEventListener('click', handleNativeSendClick, true);
            delete sendBtn.dataset.enchantedInterceptor;
        }
    };

    const cleanupChatMessages = () => {
        if (!state.extensionEnabled) return;

        // Search for messages containing our prefix
        const messages = document.querySelectorAll('.model-request-component, ms-chat-breakpoint, .user-message-content');
        messages.forEach(msg => {
            if (msg.textContent.includes(QUESTION_PROMPT_PREFIX)) {
                // Apply visual question style
                msg.classList.add('enchanted-question-bubble');

                // Remove prefix visually if it's still there
                const walker = document.createTreeWalker(msg, NodeFilter.SHOW_TEXT, null, false);
                let node;
                while (node = walker.nextNode()) {
                    if (node.nodeValue.includes(QUESTION_PROMPT_PREFIX)) {
                        node.nodeValue = node.nodeValue.replace(QUESTION_PROMPT_PREFIX, '');
                    }
                }
            }
        });
    };

    const init = () => {
        if (!state.extensionEnabled) return;
        createEnchantedUI();
        injectAddToQueueButton();
        injectCoffeeButton();
    };

    // Init (Delay to ensure page load)
    setTimeout(() => {
        init();
        setInterval(() => {
            if (state.extensionEnabled) {
                ensureQueuePanel();
                injectAddToQueueButton();
                injectCoffeeButton();
                cleanupChatMessages();

                // Patch Mic Tooltip
                const micBtn = document.querySelector('button[aria-label="Speech to text"]');
                if (micBtn && !micBtn.dataset.enchantedTooltip) {
                    micBtn.title = 'Speech to text [Hold Alt]';
                    micBtn.dataset.enchantedTooltip = 'true';
                }
            }
        }, 2000);
    }, 2500);

})();
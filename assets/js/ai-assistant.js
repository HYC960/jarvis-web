document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI elements
    const aiInterface = document.querySelector('.ai-interface');
    const aiButton = document.getElementById('aiButton');
    const aiPanel = document.getElementById('aiPanel');
    const closeBtn = document.getElementById('closeBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const chatContainer = document.getElementById('chatContainer');
    const queryInput = document.getElementById('queryInput');
    const sendBtn = document.getElementById('sendBtn');
    const pauseBtn = document.getElementById('pauseBtn');

    // Initialize Markdown-it with plugins
    const md = window.markdownit({
        html: true,
        linkify: true,
        typographer: true,
        highlight: function (str, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return '<pre class="hljs"><code>' +
                        hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                        '</code></pre>';
                } catch (__) {}
            }
            return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
        }
    }).use(window.texmath, {
        engine: window.katex,
        delimiters: 'dollars',
        katexOptions: {
            throwOnError: false,
            macros: {
                "\\RR": "\\mathbb{R}",
                "\\Z": "\\mathbb{Z}",
                "\\Q": "\\mathbb{Q}",
                "\\N": "\\mathbb{N}",
                "\\C": "\\mathbb{C}"
            }
        }
    });

    // API configuration for Together AI
    const apiKeys = [
        '0e2ecc906d7eb82afad652ec41a6548fb7526421eea9bf6023d61bb55d936aae'
    ];
    let currentKeyIndex = 0;
    let isStreaming = false;
    let streamController = null;
    let isFullscreen = false;
    let keyHealth = Array(apiKeys.length).fill(true);

    const API_URL = 'https://api.together.xyz/v1/chat/completions';
    const CHAT_HISTORY_KEY = 'jarvis_chat_history';
    const MAX_HISTORY = 20;
    const RETRY_DELAY = 1500; // 1.5 seconds delay between retries

    // Initialize chat history
    let chatHistory = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY)) || [
        { sender: 'ai', text: "# Hello! I'm JARVIS Web Assistant. How can I assist you today?" }
    ];

    // Create lightbox element for images
    const lightbox = document.createElement('div');
    lightbox.className = 'image-lightbox';
    lightbox.innerHTML = `
        <span class="close-btn">&times;</span>
        <button class="nav-btn prev-btn">&larr;</button>
        <button class="nav-btn next-btn">&rarr;</button>
        <img src="" alt="">
        <div class="image-counter"></div>
    `;
    document.body.appendChild(lightbox);

    // Lightbox navigation variables
    let currentImageIndex = 0;
    let lightboxImages = [];

    // Add lightbox event listeners
    lightbox.querySelector('.close-btn').addEventListener('click', () => {
        lightbox.classList.remove('active');
    });

    lightbox.querySelector('.prev-btn').addEventListener('click', () => {
        if (lightboxImages.length > 0) {
            currentImageIndex = (currentImageIndex - 1 + lightboxImages.length) % lightboxImages.length;
            updateLightboxImage();
        }
    });

    lightbox.querySelector('.next-btn').addEventListener('click', () => {
        if (lightboxImages.length > 0) {
            currentImageIndex = (currentImageIndex + 1) % lightboxImages.length;
            updateLightboxImage();
        }
    });

    function updateLightboxImage() {
        if (lightboxImages.length > 0) {
            lightbox.querySelector('img').src = lightboxImages[currentImageIndex].src;
            lightbox.querySelector('img').alt = lightboxImages[currentImageIndex].alt;
            lightbox.querySelector('.image-counter').textContent = `${currentImageIndex + 1}/${lightboxImages.length}`;
        }
    }

    // Add global click handler for images
    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG' && e.target.closest('.ai-message')) {
            const message = e.target.closest('.ai-message');
            lightboxImages = Array.from(message.querySelectorAll('img')).map(img => ({
                src: img.src,
                alt: img.alt
            }));
            currentImageIndex = lightboxImages.findIndex(img => img.src === e.target.src);
            updateLightboxImage();
            lightbox.classList.add('active');
        }
    });

    // Load chat history when page loads
    loadChatHistory(); 
    
    // Clear chat history if this is a fresh page load (not a refresh)
    if (performance.navigation.type === performance.navigation.TYPE_NAVIGATE) {
        clearChatHistory();
    }

    // Event Listeners
    aiButton.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', closePanel);
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    sendBtn.addEventListener('click', sendMessage);
    queryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    pauseBtn.addEventListener('click', pauseResponse);

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!aiPanel.contains(e.target) && e.target !== aiButton && !isFullscreen) {
            closePanel();
        }
    });

    // Functions
    function togglePanel() {
        aiButton.classList.toggle('active');
        aiPanel.classList.toggle('active');
        if (aiPanel.classList.contains('active')) {
            queryInput.focus();
        }
    }

    function closePanel() {
        aiButton.classList.remove('active');
        aiPanel.classList.remove('active');
    }

    function toggleFullscreen() {
        isFullscreen = !isFullscreen;
        aiInterface.classList.toggle('fullscreen', isFullscreen);
        
        // Update icon
        const icon = fullscreenBtn.querySelector('i');
        if (isFullscreen) {
            icon.classList.remove('fa-expand');
            icon.classList.add('fa-compress');
            fullscreenBtn.setAttribute('title', 'Exit Fullscreen');
        } else {
            icon.classList.remove('fa-compress');
            icon.classList.add('fa-expand');
            fullscreenBtn.setAttribute('title', 'Toggle Fullscreen');
        }
        
        // Ensure panel is open in fullscreen mode
        if (isFullscreen) {
            aiPanel.classList.add('active');
        }
    }

    function loadChatHistory() {
        chatContainer.innerHTML = '';
        chatHistory.forEach(msg => {
            addMessage(msg.text, msg.sender, false);
        });
    }

    function clearChatHistory() {
        chatHistory = [
            { sender: 'ai', text: "Hello! I'm JARVIS Web Assistant. How can I assist you today?" }
        ];
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
        loadChatHistory();
    }

    function sendMessage() {
        const message = queryInput.value.trim();
        if (!message || isStreaming) return;

        addMessage(message, 'user');
        queryInput.value = '';
        showTypingIndicator();
        callTogetherAIAPI(message);
    }

    function addMessage(text, sender, saveToHistory = true) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        
        if (sender === 'error') {
            messageDiv.classList.add('error-message');
        }

        if (sender === 'ai' || sender === 'error') {
            // Process markdown with enhanced image handling for multiple images
            let processedText = text.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
                return `<div class="image-container">
                    <img src="${src}" alt="${alt || 'AI Generated Image'}" loading="lazy">
                    ${alt ? `<div class="image-caption">${alt}</div>` : ''}
                </div>`;
            });
            
            // Wrap multiple consecutive images in a gallery
            processedText = processedText.replace(/(<div class="image-container">.*?<\/div>){2,}/gs, 
                (match) => `<div class="image-gallery">${match}</div>`);
            
            messageDiv.innerHTML = md.render(processedText);
            
            // Add click handlers to images
            messageDiv.querySelectorAll('img').forEach(img => {
                img.style.cursor = 'pointer';
            });
            
            messageDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
                
                // Add copy button to each code block
                const pre = block.parentElement;
                if (pre.tagName === 'PRE') {
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'copy-btn';
                    copyBtn.innerHTML = '<i class="far fa-copy"></i> Copy';
                    copyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(block.textContent).then(() => {
                            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                            copyBtn.classList.add('copied');
                            setTimeout(() => {
                                copyBtn.innerHTML = '<i class="far fa-copy"></i> Copy';
                                copyBtn.classList.remove('copied');
                            }, 2000);
                        });
                    });
                    pre.style.position = 'relative';
                    pre.appendChild(copyBtn);
                }
            });
            
            renderKatex(messageDiv);
        } else {
            messageDiv.textContent = text;
        }

        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        if (saveToHistory) {
            chatHistory.push({ sender, text });
            
            if (chatHistory.length > MAX_HISTORY) {
                chatHistory = chatHistory.slice(-MAX_HISTORY);
            }
            
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
        }
    }

    function renderKatex(element) {
        if (!window.katex) return;
        
        const inlineElements = element.querySelectorAll('.inline-math');
        const displayElements = element.querySelectorAll('.display-math');
        
        inlineElements.forEach(el => {
            try {
                katex.render(el.textContent, el, {
                    throwOnError: false,
                    displayMode: false
                });
            } catch (e) {
                console.error('KaTeX inline error:', e);
                el.classList.add('katex-error');
                el.textContent = 'Error rendering equation: ' + el.textContent;
            }
        });
        
        displayElements.forEach(el => {
            try {
                katex.render(el.textContent, el, {
                    throwOnError: false,
                    displayMode: true
                });
            } catch (e) {
                console.error('KaTeX display error:', e);
                el.classList.add('katex-error');
                el.textContent = 'Error rendering equation: ' + el.textContent;
            }
        });
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('typing-indicator');
        typingDiv.id = 'typingIndicator';

        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.classList.add('typing-dot');
            typingDiv.appendChild(dot);
        }

        chatContainer.appendChild(typingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) typingIndicator.remove();
    }

    function pauseResponse() {
        if (streamController) {
            streamController.abort();
            streamController = null;
            isStreaming = false;
            pauseBtn.classList.remove('active');
            sendBtn.classList.remove('active');
            removeTypingIndicator();
            addMessage("Response stopped by user.", 'ai');
        }
    }

    async function loadRAGFiles() {
        const files = [
            "web_info.txt",
            "creator_info.txt",
        ];

        const results = await Promise.all(files.map(async (file) => {
            try {
                const res = await fetch(`assets/RAG/${file}`);
                if (!res.ok) return '';
                const text = await res.text();
                return `--- ${file} ---\n${text}`;
            } catch (e) {
                return '';
            }
        }));

        return results.join("\n\n");
    }

    function getNextValidKeyIndex() {
        const originalIndex = currentKeyIndex;
        
        do {
            currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            if (currentKeyIndex === originalIndex) {
                keyHealth = keyHealth.map(() => true);
            }
        } while (!keyHealth[currentKeyIndex] && currentKeyIndex !== originalIndex);
        
        return currentKeyIndex;
    }

    async function callTogetherAIAPI(prompt, retry = 0) {
        if (retry >= apiKeys.length) {
            addMessage("All API keys are rate limited or invalid. Please try again later.", 'error');
            return;
        }

        sendBtn.classList.add('active');
        pauseBtn.classList.add('active');
        isStreaming = true;
        const apiKey = apiKeys[currentKeyIndex];

        try {
            const ragContext = await loadRAGFiles();
            
            const controller = new AbortController();
            streamController = controller;

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({
                    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
                    messages: [
                        {
                            role: "system",
                            content: `You are JARVIS — an intelligent, futuristic AI assistant built to assist users on this website with accurate, helpful, and context-aware responses. Your role is to guide users, answer their questions, and provide support based on the knowledge base provided below.

Respond in a clear, concise, and professional tone. Adapt your replies based on the user's intent — whether they are seeking help, browsing products, asking about policies, or just exploring.

Use the knowledge base below as trusted internal context for your answers. Do not mention that this is a file or external source. If an answer is not found, respond gracefully or infer if appropriate.

--- BEGIN KNOWLEDGE BASE ---
${ragContext}
--- END KNOWLEDGE BASE ---`
                        },
                        ...chatHistory.slice(0, -1).map(msg => ({
                            role: msg.sender === 'user' ? 'user' : 'assistant',
                            content: msg.text
                        })),
                        { role: "user", content: prompt }
                    ],
                    stream: true
                }),
                signal: controller.signal
            });

            if (!response.ok || !response.body) {
                if (response.status === 401) {
                    keyHealth[currentKeyIndex] = false;
                    getNextValidKeyIndex();
                    throw new Error('Invalid or expired API key.');
                } else if (response.status === 429) {
                    keyHealth[currentKeyIndex] = false;
                    getNextValidKeyIndex();
                    throw new Error('API rate limit reached.');
                } else {
                    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
                }
            }

            removeTypingIndicator();

            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', 'ai-message');
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            let fullResponse = "";
            let partialBuffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                partialBuffer += chunk;

                const lines = partialBuffer.split("\n");

                for (let i = 0; i < lines.length - 1; i++) {
                    const line = lines[i].trim();
                    if (!line || !line.startsWith("data:")) continue;

                    const jsonStr = line.replace("data:", "").trim();
                    if (jsonStr === "[DONE]") continue;

                    try {
                        const parsed = JSON.parse(jsonStr);
                        const token = parsed.choices?.[0]?.delta?.content;
                        if (token) {
                            fullResponse += token;
                            messageDiv.textContent = fullResponse;
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        }
                    } catch (err) {
                        console.warn("Streaming parse error:", err);
                    }
                }

                partialBuffer = lines[lines.length - 1];
            }

            // Final rendering with markdown and LaTeX
            let processedText = fullResponse.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
                return `<div class="image-container">
                    <img src="${src}" alt="${alt || 'AI Generated Image'}" loading="lazy">
                    ${alt ? `<div class="image-caption">${alt}</div>` : ''}
                </div>`;
            });
            
            // Wrap multiple consecutive images in a gallery
            processedText = processedText.replace(/(<div class="image-container">.*?<\/div>){2,}/gs, 
                (match) => `<div class="image-gallery">${match}</div>`);
            
            messageDiv.innerHTML = md.render(processedText);
            
            // Add click handlers to images in streaming response
            messageDiv.querySelectorAll('img').forEach(img => {
                img.style.cursor = 'pointer';
            });
            
            messageDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
                
                // Add copy button to each code block in streaming response
                const pre = block.parentElement;
                if (pre.tagName === 'PRE') {
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'copy-btn';
                    copyBtn.innerHTML = '<i class="far fa-copy"></i> Copy';
                    copyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(block.textContent).then(() => {
                            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                            copyBtn.classList.add('copied');
                            setTimeout(() => {
                                copyBtn.innerHTML = '<i class="far fa-copy"></i> Copy';
                                copyBtn.classList.remove('copied');
                            }, 2000);
                        });
                    });
                    pre.style.position = 'relative';
                    pre.appendChild(copyBtn);
                }
            });
            renderKatex(messageDiv);
            
            chatContainer.scrollTop = chatContainer.scrollHeight;

            // Add the final response to chat history
            chatHistory.push({ sender: 'ai', text: fullResponse });
            if (chatHistory.length > MAX_HISTORY) {
                chatHistory = chatHistory.slice(-MAX_HISTORY);
            }
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));

        } catch (error) {
            console.error('Error calling Together AI API:', error.message);
            removeTypingIndicator();
            
            if (error.name === 'AbortError') {
                return;
            }
            
            let userMessage = 'Sorry, something went wrong.';
            let isRetryable = false;
            
            if (error.message.includes('Invalid or expired API key')) {
                userMessage = 'Invalid or expired API key. Switching to another key...';
                isRetryable = true;
            } else if (error.message.includes('API rate limit reached')) {
                userMessage = 'API rate limit reached. Trying again...';
                isRetryable = true;
            } else if (error.message.includes('API request failed')) {
                userMessage = 'API request failed. Trying again...';
                isRetryable = true;
            }
            
            addMessage(userMessage, 'error');
            
            if (isRetryable && retry < apiKeys.length - 1) {
                await new Promise(res => setTimeout(res, RETRY_DELAY));
                return callTogetherAIAPI(prompt, retry + 1);
            } else {
                let finalMessage = 'All API keys are rate limited or invalid. Please try again later.';
                if (error.message.includes('Invalid')) {
                    finalMessage = 'All provided API keys are invalid or expired.';
                } else if (error.message.includes('rate limit')) {
                    finalMessage = 'All API keys have reached their rate limits. Please try again later.';
                }
                addMessage(finalMessage, 'error');
            }
        } finally {
            sendBtn.classList.remove('active');
            pauseBtn.classList.remove('active');
            isStreaming = false;
            streamController = null;
        }
    }
});

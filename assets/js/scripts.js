// Main chat functionality
const chatBox = document.getElementById("chat");
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const modelToggle = document.getElementById("modelToggle");
const modelIndicator = document.querySelector(".model-indicator");
const streamingProgress = document.getElementById("streamingProgress");
const backToDownBtn = document.getElementById("backToDownBtn");

const TOGETHER_API_KEY = "0e2ecc906d7eb82afad652ec41a6548fb7526421eea9bf6023d61bb55d936aae";

// Store conversation history (last 20 messages)
window.conversationHistory = [];
const MAX_HISTORY = 20; // Keep last 20 messages for context

// Store the last assistant message for regeneration
let lastAssistantMessageId = null;
let isRegenerating = false;

// Model state
let currentModel = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
const models = {
  turbo: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
  deep: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free"
};

// Initialize markdown-it with all plugins
const md = window.markdownit({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return '';
  }
})
.use(window.texmath, {
  engine: window.katex,
  delimiters: [
    {left: "$$", right: "$$", display: true},
    {left: "$", right: "$", display: false},
    {left: "\\(", right: "\\)", display: false},
    {left: "\\[", right: "\\]", display: true}
  ],
  katexOptions: { 
    macros: { 
      "\\RR": "\\mathbb{R}",
      "\\CC": "\\mathbb{C}",
      "\\NN": "\\mathbb{N}",
      "\\ZZ": "\\mathbb{Z}",
      "\\QQ": "\\mathbb{Q}",
      "\\abs": ["\\left|#1\\right|", 1],
      "\\norm": ["\\left\\|#1\\right\\|", 1],
      "\\bm": ["\\boldsymbol{#1}", 1]
    },
    throwOnError: false,
    strict: false,
    displayMode: true,
    output: 'htmlAndMathml'
  }
})
.use(window.markdownitEmoji)
.use(window.markdownitTaskLists)
.use(window.markdownitFootnote)
.use(window.markdownitAbbr);

// Set up syntax highlighting aliases
hljs.registerAliases('py', {languageName: 'python'});
hljs.registerAliases('js', {languageName: 'javascript'});
hljs.registerAliases('sh', {languageName: 'bash'});

// Buffer to accumulate streaming content
let streamingBuffer = "";
let messageContainer = null;
let accumulatedText = "";
let streamController = null; // To control the stream
let isStreaming = false; // To track streaming state
let lastRenderTime = 0;
let tokensSinceLastRender = 0;
let typingIndicator = null;

// Set initial model class
document.body.classList.add(currentModel === models.turbo ? 'model-turbo' : 'model-deep');

// Generate a unique ID for messages
function generateMessageId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Toggle between models
function toggleModel() {
  if (currentModel === models.turbo) {
    currentModel = models.deep;
    modelIndicator.textContent = "Current Model: deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free";
    document.body.classList.remove('model-turbo');
    document.body.classList.add('model-deep');
  } else {
    currentModel = models.turbo;
    modelIndicator.textContent = "Current Model: meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
    document.body.classList.remove('model-deep');
    document.body.classList.add('model-turbo');
  }
}

// Process thinking content with animation
function processThinkingContent(content) {
  return content.replace(/<think>(.*?)<\/think>/gs, (match, thinkContent) => {
    // First render the markdown inside the think tags
    const renderedContent = md.render(thinkContent);
    return `
      <div class="thinking-container">
        <div class="thinking-icon">💭</div>
        <div class="thinking-content">${renderedContent}</div>
      </div>
    `;
  });
}

modelToggle.addEventListener("click", toggleModel);
async function fetchUserAbout(email) {
  return new Promise((resolve, reject) => {
    const safeEmail = email.replace(/\./g, '_'); // sanitize key (Firebase doesn't allow dots in keys)
    const aboutRef = ref(db, `users/${safeEmail}/about`);
    onValue(aboutRef, (snapshot) => {
      resolve(snapshot.val() || "No additional info.");
    }, {
      onlyOnce: true
    });
  });
}

async function sendMessage() {
  removeSuggestions();
  let input = userInput.value.trim();

  if (selectedQuote) {
  const contextNote = "📌 The user selected the following text from your previous response and is now asking a related question:\n\n";
  input = `${contextNote}> ${selectedQuote.replace(/\n/g, '\n> ')}\n\n${input}`;
  selectedQuote = null;
  document.getElementById("quotedPreview").style.display = "none";
}


  // Modified: Only show filename instead of full content
  if (uploadedFileName) {
    input += `\n\n[Attached file: ${uploadedFileName}]`;
  }

  if (!input) return;

  // Disable input during streaming
  userInput.disabled = true;
  
  // Add user message to history
  const userMessageId = generateMessageId();
  conversationHistory.push({
    id: userMessageId,
    role: "user",
    content: input,
    timestamp: Date.now()
  });
  
  // Trim history if needed
  if (conversationHistory.length > MAX_HISTORY) {
    conversationHistory = conversationHistory.slice(-MAX_HISTORY);
  }

  appendMessage(input, "user", userMessageId);
  userInput.value = "";

  // Show typing indicator
  typingIndicator = document.createElement("div");
  typingIndicator.className = "typing-indicator";
  typingIndicator.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  chatBox.appendChild(typingIndicator);
  scrollToBottom();

  // Create empty assistant message container
  const assistantMessageId = generateMessageId();
  messageContainer = document.createElement("div");
  messageContainer.classList.add("message", "assistant");
  messageContainer.dataset.messageId = assistantMessageId;
  
  const contentDiv = document.createElement("div");
  contentDiv.classList.add("message-content", "message-content-updating");
  messageContainer.appendChild(contentDiv);
  
  // Add action buttons
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "message-actions";
  
  const copyBtn = document.createElement("button");
  copyBtn.className = "message-copy-btn";
  copyBtn.title = "Copy message";
  copyBtn.innerHTML = '<i class="far fa-copy"></i>';
  copyBtn.addEventListener("click", () => copyMessageContent(contentDiv, copyBtn));
  actionsDiv.appendChild(copyBtn);
  
  const regenerateBtn = document.createElement("button");
  regenerateBtn.className = "message-regenerate-btn";
  regenerateBtn.title = "Regenerate response";
  regenerateBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
  regenerateBtn.addEventListener("click", () => regenerateMessage(assistantMessageId));
  actionsDiv.appendChild(regenerateBtn);
  
  messageContainer.appendChild(actionsDiv);
  
  chatBox.appendChild(messageContainer);
  scrollToBottom();
  lastAssistantMessageId = assistantMessageId;

  // Initialize with empty content
  accumulatedText = "";
  
  // Show streaming progress
  streamingProgress.style.width = '0';
  streamingProgress.style.opacity = '1';

  // Change send button to stop button
  sendBtn.innerHTML = '<i class="fas fa-stop"></i>';
  sendBtn.classList.add('stop-btn');
  sendBtn.title = "Stop";
  isStreaming = true;

  try {
    const currentUser = JSON.parse(sessionStorage.getItem("user"));
const userName = currentUser?.displayName || currentUser?.name || currentUser?.fullName || 'Unknown User';
const userEmail = currentUser?.email || 'Unknown Email';

let systemPrompt = {
  role: "system",
  content: `🧑‍🏫 You are **TIM** – *Teaching and Intelligent Mentor* – an emotionally aware, super-friendly, and deeply adaptive AI assistant built to help students **understand, not memorize**.

🎯 **Mission Summary**:
- Simplify **complex concepts** into **relatable, real-world examples**.
- Use **step-by-step logic**, **visual analogies**, and **life-based parallels**.
- Ensure students feel **motivated, stress-free, and confident**.

🧠 **Smart Personalization (Context-Aware)**:
- Use student’s **name, interests, and learning style** to **tailor every explanation**.
- Refer to the student’s **"About Me" info** from Firebase to:
  - Match tone with their personality.
  - Align examples with their hobbies, goals, and background.
  - Recall previously discussed preferences (e.g. NEET, Python beginner, visual learner).

👤 **Student Context**:
- Name: ${userName}
- Email: ${userEmail}
- Use this ONLY to personalize tone and engagement.
- Also, fetch and utilize the student's "About Me" dynamically to enhance relevance.

💬 **Tone & Style**:
- Speak in **casual Hinglish** (mix of Hindi + English) unless told otherwise.
- Be like a **chilled-out study buddy** — not a boring teacher.
- Encourage curiosity, never shame confusion. If they don’t get it, rephrase.

📚 **Teaching Style**:
- Prioritize intuition and clarity.
- Use simple metaphors:  
  - Stack = Tiffin Boxes 🍱  
  - Binary Search = Phonebook Lookup 📖  
  - Arrays = Dabbas 📦  
- Customize teaching if:
  - They mention NEET, focus on relevant exam strategies.
  - They're a beginner, avoid heavy jargon.
  - They're a visual learner, explain using spatial and scene-based imagery.

🎨 **Formatting Guide** (Strictly Follow):
- Use **Markdown**: bold headings, bullet points, inline code.
- Use **emojis** to boost fun and clarity 😊.
- Render all math using **KaTeX**:  
  e.g., \`$$F = ma$$\`

🧘‍♂️ **Lastly – Your Identity**:
You’re not just an answer gene  rator. You’re **TIM**, a kind, smart, adaptive mentor. Your job is to **guide with heart**, **teach with clarity**, and **leave the student more confident** every time you chat. 🌱`
};

// Inject dynamic "About Me" from Firebase
if (window.addUserAboutToSystemPrompt) {
  systemPrompt = await window.addUserAboutToSystemPrompt(systemPrompt);
}

    const apiMessages = [
      systemPrompt,
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Modified: Include file content in the API call if available
    if (uploadedFileContent) {
      apiMessages[apiMessages.length - 1].content += `\n\nFile content:\n${uploadedFileContent}`;
    }

    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: currentModel,
        messages: apiMessages,
        stream: true,
      })
    });

    // Store the stream controller
    streamController = response;

    // Remove typing indicator
    if (typingIndicator && typingIndicator.parentNode) {
      chatBox.removeChild(typingIndicator);
      typingIndicator = null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    streamingBuffer = "";
    let receivedBytes = 0;
    let totalBytes = response.headers.get('Content-Length') || 0;

    while (isStreaming) {
      const { value, done } = await reader.read();
      if (done) break;

      receivedBytes += value ? value.length : 0;
      // Update progress bar
      if (totalBytes > 0) {
        const progress = Math.min(100, (receivedBytes / totalBytes) * 100);
        streamingProgress.style.width = `${progress}%`;
      }

      const chunk = decoder.decode(value, { stream: true });
      processStreamChunk(chunk);
    }

    // Final update after stream completes
    updateContent(true);
    
    // Add assistant message to history
    if (!isRegenerating) {
      conversationHistory.push({
        id: assistantMessageId,
        role: "assistant",
        content: accumulatedText,
        timestamp: Date.now()
      });
    } else {
      // If regenerating, update the existing assistant message
      const existingMsgIndex = conversationHistory.findIndex(msg => msg.id === assistantMessageId);
      if (existingMsgIndex !== -1) {
        conversationHistory[existingMsgIndex].content = accumulatedText;
        conversationHistory[existingMsgIndex].timestamp = Date.now();
      }
      isRegenerating = false;
    }
  } catch (error) {
    console.error("Error:", error);
    if (typingIndicator && typingIndicator.parentNode) {
      chatBox.removeChild(typingIndicator);
      typingIndicator = null;
    }
    appendMessage("Sorry, there was an error processing your request.", "assistant", generateMessageId());
  } finally {
    // Reset the button and input
    resetSendButton();
    userInput.disabled = false;
    userInput.focus();
    isStreaming = false;
    streamController = null;
    
    // Hide progress bar
    streamingProgress.style.width = '100%';
    setTimeout(() => {
      streamingProgress.style.opacity = '0';
      setTimeout(() => {
        streamingProgress.style.width = '0';
      }, 300);
    }, 100);
    
    // Reset file after sending
    uploadedFileName = null;
    uploadedFileContent = null;
    fileInput.value = ""; // clear input
  }
}
  
function copyMessageContent(contentDiv, button) {
  // Create a temporary element to get the text content without HTML tags
  const temp = document.createElement("div");
  temp.innerHTML = contentDiv.innerHTML;
  
  // Remove any copy buttons from the temp element
  temp.querySelectorAll('.copy-btn, .message-copy-btn, .message-regenerate-btn').forEach(el => el.remove());
  
  // Get the text content
  const textToCopy = temp.textContent.trim();
  
  navigator.clipboard.writeText(textToCopy).then(() => {
    button.classList.add("copied");
    button.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
      button.classList.remove("copied");
      button.innerHTML = '<i class="far fa-copy"></i>';
    }, 2000);
  });
}

function regenerateMessage(messageId) {
  if (!messageId) return;
  
  // Find the message in history
  const messageIndex = conversationHistory.findIndex(msg => msg.id === messageId);
  if (messageIndex === -1) return;
  
  // Get all messages before this one
  const messagesBefore = conversationHistory.slice(0, messageIndex);
  
  // Find the last user message before this assistant message
  let lastUserMessageIndex = -1;
  for (let i = messageIndex - 1; i >= 0; i--) {
    if (conversationHistory[i].role === "user") {
      lastUserMessageIndex = i;
      break;
    }
  }
  
  if (lastUserMessageIndex === -1) return;
  
  // Remove all messages after the last user message (including the assistant message we're regenerating)
  conversationHistory = conversationHistory.slice(0, lastUserMessageIndex + 1);
  
  // Remove the assistant message from the DOM
  const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
  if (messageElement && messageElement.parentNode) {
    chatBox.removeChild(messageElement);
  }
  
  // Set regenerating flag and resend the last user message
  isRegenerating = true;
  userInput.value = conversationHistory[lastUserMessageIndex].content;
  sendMessage();
}

function processStreamChunk(chunk) {
  if (!isStreaming) return;
  
  streamingBuffer += chunk;
  const lines = streamingBuffer.split("\n");
  streamingBuffer = lines.pop(); // Save incomplete line for next chunk

  for (const line of lines) {
    if (line.trim() === "") continue;
    
    try {
      const data = JSON.parse(line.replace(/^data: /, ""));
      const token = data.choices?.[0]?.delta?.content;
      if (token) {
        accumulatedText += token;
        tokensSinceLastRender++;
        
        // Throttle rendering based on token count and time
        const now = performance.now();
        if (tokensSinceLastRender > 5 || now - lastRenderTime > 100) {
          updateContent();
          lastRenderTime = now;
          tokensSinceLastRender = 0;
        }
      }
    } catch (e) {
      console.error("Error parsing JSON:", e);
    }
  }
}

function updateContent(final = false) {
  if (!messageContainer) return;
  
  const contentDiv = messageContainer.querySelector('.message-content');
  if (!contentDiv) return;
  
  // Mark as updating
  contentDiv.classList.add('active');
  
  // Use requestAnimationFrame for smoother updates
  requestAnimationFrame(() => {
    // First render markdown
    let renderedContent = md.render(accumulatedText);
    
    // Process thinking content with animation
    renderedContent = processThinkingContent(renderedContent);
    
    contentDiv.innerHTML = renderedContent;
    
    // Apply syntax highlighting
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
      
      // Add copy button to each code block
      const pre = block.parentElement;
      if (!pre.querySelector('.copy-btn')) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.title = 'Copy code';
        copyBtn.innerHTML = '<i class="far fa-copy"></i>';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(block.textContent).then(() => {
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
              copyBtn.classList.remove('copied');
              copyBtn.innerHTML = '<i class="far fa-copy"></i>';
            }, 2000);
          });
        });
        pre.appendChild(copyBtn);
      }
    });
    
    // Render math expressions with a slight delay to ensure DOM is ready
    setTimeout(() => {
      renderMathInElement(contentDiv, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
          {left: '\\(', right: '\\)', display: false},
          {left: '\\[', right: '\\]', display: true}
        ],
        throwOnError: false,
        strict: false,
        output: 'htmlAndMathml',
        fleqn: false
      });
      
      // Remove updating class after rendering is complete
      contentDiv.classList.remove('active');
    }, 50);
    
    scrollToBottom();
  });
}

function appendMessage(text, className, messageId) {
  const div = document.createElement("div");
  div.classList.add("message", className);
  if (messageId) {
    div.dataset.messageId = messageId;
  }
  
  const contentDiv = document.createElement("div");
  contentDiv.classList.add("message-content");
  
  if (className === "user") {
    contentDiv.textContent = text;
  } else {
    // Process thinking content for non-streaming messages
    let renderedContent = md.render(text);
    renderedContent = processThinkingContent(renderedContent);
    contentDiv.innerHTML = renderedContent;
    
    // Add action buttons for assistant messages
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "message-actions";
    
    const copyBtn = document.createElement("button");
    copyBtn.className = "message-copy-btn";
    copyBtn.title = "Copy message";
    copyBtn.innerHTML = '<i class="far fa-copy"></i>';
    copyBtn.addEventListener("click", () => copyMessageContent(contentDiv, copyBtn));
    actionsDiv.appendChild(copyBtn);
    
    if (className === "assistant") {
      const regenerateBtn = document.createElement("button");
      regenerateBtn.className = "message-regenerate-btn";
      regenerateBtn.title = "Regenerate response";
      regenerateBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
      regenerateBtn.addEventListener("click", () => regenerateMessage(messageId));
      actionsDiv.appendChild(regenerateBtn);
    }
    
    div.appendChild(actionsDiv);
    
    // Apply syntax highlighting and math rendering after DOM update
    setTimeout(() => {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
        
        // Add copy button to each code block
        const pre = block.parentElement;
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.title = 'Copy code';
        copyBtn.innerHTML = '<i class="far fa-copy"></i>';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(block.textContent).then(() => {
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
              copyBtn.classList.remove('copied');
              copyBtn.innerHTML = '<i class="far fa-copy"></i>';
            }, 2000);
          });
        });
        pre.appendChild(copyBtn);
      });
      
      // Render math with a slight delay
      setTimeout(() => {
        renderMathInElement(contentDiv, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
          ],
          throwOnError: false,
          strict: false,
          output: 'htmlAndMathml'
        });
      }, 50);
    }, 0);
  }
  
  div.appendChild(contentDiv);
  chatBox.appendChild(div);
  scrollToBottom();
  return contentDiv;
}

function resetSendButton() {
  sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
  sendBtn.classList.remove('stop-btn');
  sendBtn.title = "Send";
}

function toggleStreaming() {
  if (isStreaming) {
    // stop the streaming
    isStreaming = false;
    if (streamController) {
      streamController.abort();
    }
    resetSendButton();
    
    // Hide progress bar immediately when stopped
    streamingProgress.style.width = '0';
    streamingProgress.style.opacity = '0';
    
    // Re-enable input
    userInput.disabled = false;
    userInput.focus();
  } else {
    // Start new message
    sendMessage();
  }
}

function scrollToBottom() {
  // Use smooth scrolling if not at bottom already
  const isNearBottom = chatBox.scrollHeight - chatBox.clientHeight - chatBox.scrollTop < 100;
  if (isNearBottom) {
    chatBox.scrollTop = chatBox.scrollHeight;
  }
  
  // Show/hide back to down button
  const shouldShowButton = chatBox.scrollHeight - chatBox.clientHeight - chatBox.scrollTop > 100;
  backToDownBtn.classList.toggle('visible', shouldShowButton);
}

// Back to down button functionality
backToDownBtn.addEventListener('click', () => {
  chatBox.scrollTo({
    top: chatBox.scrollHeight,
    behavior: 'smooth'
  });
});

// Track scroll events to show/hide back to down button
chatBox.addEventListener('scroll', () => {
  const shouldShowButton = chatBox.scrollHeight - chatBox.clientHeight - chatBox.scrollTop > 100;
  backToDownBtn.classList.toggle('visible', shouldShowButton);
});

sendBtn.addEventListener("click", () => {
  if (isStreaming) {
    toggleStreaming();
  } else {
    sendMessage();
  }
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (isStreaming) {
      toggleStreaming();
    } else {
      sendMessage();
    }
  }
});

// Allow Shift+Enter for new lines
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && e.shiftKey) {
    return; // Allow default behavior (new line)
  }
});

window.addEventListener('load', () => {
  userInput.focus();
});

// Auto-focus input when user types any key (excluding modifier keys)
document.addEventListener('keydown', (event) => {
  const activeElement = document.activeElement;
  const isInputFocused = activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.isContentEditable
  );

  // Only focus if not already in input field
  if (!isInputFocused) {
    const key = event.key;
    const isCharacterKey = key.length === 1;

    if (isCharacterKey) {
      userInput.focus();
    }
  }
});

import { db, ref, onValue, remove, set } from "./firebase-config.js";

    const chatList = document.getElementById('chatList');
    const chatBox = document.getElementById('chat');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const collapseSidebarBtn = document.getElementById('collapseSidebarBtn');
    let currentChatId = null;

    // Toggle sidebar
    function toggleSidebar() {
      sidebar.classList.toggle('collapsed');
      chatBox.classList.toggle('collapsed');
      sidebarToggle.classList.toggle('collapsed');
      
      const isCollapsed = sidebar.classList.contains('collapsed');
      collapseSidebarBtn.innerHTML = isCollapsed ? '<i class="fas fa-chevron-right"></i>' : '<i class="fas fa-chevron-left"></i>';
      localStorage.setItem('sidebarCollapsed', isCollapsed);
    }

    // Initialize sidebar state
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
      toggleSidebar();
    }

    sidebarToggle.addEventListener('click', toggleSidebar);
    collapseSidebarBtn.addEventListener('click', toggleSidebar);

    // Get user email from sessionStorage
    const user = JSON.parse(sessionStorage.getItem("user"));
    const userEmail = user?.email?.replace(/\./g, "_");

    if (!userEmail) {
      console.error("User email not found. Cannot load chats.");
      chatList.innerHTML = "<p style='color:red;'>Login required to view chats.</p>";
    } else {
      // Load user's chat list
      const userRef = ref(db, `users/${userEmail}`);
      onValue(userRef, (snapshot) => {
        const chats = snapshot.val();
        chatList.innerHTML = "";

        if (chats) {
          Object.keys(chats).forEach((chatId) => {
            const item = document.createElement("div");
            item.className = "chat-item";
            if (chatId === currentChatId) {
              item.classList.add('active');
            }

            const name = document.createElement("div");
            name.className = "chat-name";
            name.textContent = chatId;
            name.onclick = () => loadChat(userEmail, chatId);

            const del = document.createElement("i");
            del.className = "fas fa-trash delete-btn";
            del.title = "Delete chat";
            del.onclick = (e) => {
              e.stopPropagation();
              if (confirm(`Delete chat "${chatId}"?`)) {
                remove(ref(db, `users/${userEmail}/${chatId}`));
                if (currentChatId === chatId) {
                  currentChatId = null;
                  chatBox.innerHTML = '';
                  window.conversationHistory = [];
                }
              }
            };

            item.appendChild(name);
            item.appendChild(del);
            chatList.appendChild(item);
          });
        } else {
          chatList.innerHTML = "<p style='color: gray;'>No chats found.</p>";
        }
      });
    }

    function loadChat(userEmail, chatId) {
      // Update active state in sidebar
      document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
      });
      document.querySelector(`.chat-name[onclick*="${chatId}"]`)?.parentElement?.classList.add('active');

      currentChatId = chatId;
      const messagesRef = ref(db, `users/${userEmail}/${chatId}`);
      onValue(messagesRef, (snapshot) => {
        const messages = snapshot.val();
        chatBox.innerHTML = '';

        // Clear conversation history and rebuild from loaded chat
        window.conversationHistory = [];

        if (messages) {
          const sorted = Object.keys(messages)
            .sort((a, b) => Number(a) - Number(b))
            .map((key) => messages[key]);

          sorted.forEach((msg) => {
            // Add to conversation history
            window.conversationHistory.push({
              id: generateMessageId(),
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp || Date.now()
            });

            // Display message in chat UI
            appendMessage(msg.content, msg.role, generateMessageId());
          });
        } else {
          appendMessage("No messages in this chat yet. Start a new conversation!", "assistant", generateMessageId());
        }
        
        scrollToBottom();
      });
    }

    // Modified sendMessage function to save to Firebase
    const originalSendMessage = window.sendMessage;
    window.sendMessage = async function() {
      if (!currentChatId) {
  const previousCount = Number(localStorage.getItem("chatCount") || 0) + 1;
  currentChatId = `Chat ${previousCount}`;
  localStorage.setItem("chatCount", previousCount);
}


      await originalSendMessage();
      
      // Save conversation to Firebase
      if (userEmail && currentChatId) {
        const messagesRef = ref(db, `users/${userEmail}/${currentChatId}`);
        const messagesToSave = window.conversationHistory.reduce((acc, msg) => {
          acc[msg.timestamp] = {
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          };
          return acc;
        }, {});
        
        set(messagesRef, messagesToSave);
      }
    };

    // Helper functions from scripts.js
    function generateMessageId() {
      return Date.now().toString(36) + Math.random().toString(36).substring(2);
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
        contentDiv.innerHTML = md.render(text);
        
        // Apply syntax highlighting
        document.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
          
          // Add copy button to code blocks
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
        
        // Render math expressions
        renderMathInElement(contentDiv, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
          ],
          throwOnError: false,
          strict: false
        });
      }
      
      div.appendChild(contentDiv);
      chatBox.appendChild(div);
      return contentDiv;
    }

    function scrollToBottom() {
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    // New Chat button functionality
    document.getElementById('newChatBtn').addEventListener('click', () => {
      currentChatId = null;
      chatBox.innerHTML = '';
      window.conversationHistory = [];
      
      // Remove active state from all chat items
      document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
      });
      
      userInput.focus();
    });

    // Handle window resize for responsive behavior
    window.addEventListener('resize', () => {
      if (window.innerWidth < 768) {
        sidebar.classList.add('collapsed');
        chatBox.classList.add('collapsed');
        sidebarToggle.classList.add('collapsed');
      }
    });

    // Initialize responsive behavior
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
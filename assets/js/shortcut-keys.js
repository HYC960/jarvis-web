document.addEventListener('keydown', function(e) {
  if (e.altKey && e.key.toLowerCase() === 'n') {
    e.preventDefault(); // prevent default Alt+N behavior (if any)
    const newChatBtn = document.getElementById('newChatBtn');
    if (newChatBtn) {
      newChatBtn.click();
    }
  }
});

document.addEventListener('keydown', function(e) {
  if (e.altKey && e.key.toLowerCase() === 's') {
    e.preventDefault(); // prevent default Alt+S behavior (if any)
    const newChatBtn = document.getElementById('sidebarToggle');
    if (newChatBtn) {
      newChatBtn.click();
    }
  }
});

document.addEventListener('keydown', function(e) {
  if (e.altKey && e.key.toLowerCase() === 'e') {
    e.preventDefault(); // prevent default Alt+S behavior (if any)
    const newChatBtn = document.getElementById('exportChatBtn');
    if (newChatBtn) {
      newChatBtn.click();
    }
  }
});

document.addEventListener('keydown', function(e) {
  if (e.altKey && e.key.toLowerCase() === 'l') {
    e.preventDefault(); // prevent default Alt+S behavior (if any)
    const newChatBtn = document.getElementById('shareChatBtn');
    if (newChatBtn) {
      newChatBtn.click();
    }
  }
});

document.addEventListener('keydown', function(e) {
  if (e.altKey && e.key.toLowerCase() === 'r') {
    e.preventDefault(); // prevent default Alt+S behavior (if any)
    const newChatBtn = document.getElementById('modelToggle');
    if (newChatBtn) {
      newChatBtn.click();
    }
  }
});

document.addEventListener('keydown', function(e) {
  if (e.altKey && e.key.toLowerCase() === 'u') {
    e.preventDefault(); // prevent default Alt+S behavior (if any)
    const newChatBtn = document.getElementById('uploadBtn');
    if (newChatBtn) {
      newChatBtn.click();
    }
  }
});

document.addEventListener('keydown', function(e) {
  if (e.altKey && e.key.toLowerCase() === 'v') {
    e.preventDefault(); // prevent default Alt+S behavior (if any)
    const newChatBtn = document.getElementById('userInput');
    if (newChatBtn) {
      newChatBtn.click();
    }
  }
});
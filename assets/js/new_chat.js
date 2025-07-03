// New Chat Function
function newChat() {
  // 1. Clear chat messages
  chatBox.innerHTML = "";

  // 2. Clear conversation history
  conversationHistory = [];

  // 3. Clear and focus input
  userInput.value = "";
  userInput.focus();

  // 4. Hide quoted preview if exists
  const quotedPreview = document.getElementById("quotedPreview");
  if (quotedPreview) {
    quotedPreview.style.display = "none";
  }

  // 5. Reset progress bar
  streamingProgress.style.width = "0";
  streamingProgress.style.opacity = "0";

  // 6. Stop streaming if active
  if (isStreaming && streamController) {
    isStreaming = false;
    streamController.abort?.();
    resetSendButton();
  }

  // 7. Remove old suggestions if any
  removeSuggestions();

  // 8. Show new suggestions after DOM is cleared
  setTimeout(() => {
    showSuggestions();
  }, 50);
}

// Add click listener to the "New Chat" button
document.getElementById("newChatBtn").addEventListener("click", newChat);


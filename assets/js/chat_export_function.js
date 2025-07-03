function exportChatAsMarkdown() {
  if (conversationHistory.length === 0) {
    alert("No chat to export!");
    return;
  }

  const username = "kaif"; // Change this dynamically if needed
  const timestamp = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).replace(/[\/, ]/g, "-").replace(/--/g, "-");

  let content = `# 💬 Chat Export\n\n`;
  conversationHistory.forEach((msg) => {
    if (msg.role === "user") {
      content += `## 👤 User\n`;
    } else if (msg.role === "assistant") {
      content += `## 🤖 Assistant\n`;
    }
    content += `${msg.content.trim()}\n\n`;
  });

  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `chat-${username}-${timestamp}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById("exportChatBtn").addEventListener("click", exportChatAsMarkdown);

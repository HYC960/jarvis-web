// assets/js/share-chat.js
import { db } from './firebase-config.js';
import {
  collection,
  doc,
  setDoc,
  getFirestore
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firestore = getFirestore();

const modal = document.getElementById("shareModal");
const closeBtn = document.querySelector(".close");
const copyBtn = document.getElementById("copyLinkBtn");
const shareLinkInput = document.getElementById("shareLink");

document.getElementById("shareChatBtn").addEventListener("click", async () => {
  if (!window.conversationHistory || window.conversationHistory.length === 0) {
    alert("❌ No chat to share!");
    return;
  }

  const chatId = Date.now().toString(36) + Math.random().toString(36).substring(2);

  try {
    await setDoc(doc(firestore, "sharedChats", chatId), {
      history: window.conversationHistory,
      createdAt: new Date()
    });

    const shareUrl = `${window.location.origin}/assets/chat/view-chat.html?id=${chatId}`;
    shareLinkInput.value = shareUrl;

    document.getElementById("waShare").href = `https://wa.me/?text=${encodeURIComponent(shareUrl)}`;
    document.getElementById("fbShare").href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    document.getElementById("tgShare").href = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`;

    modal.style.display = "flex";
  } catch (err) {
    console.error("Error sharing chat:", err);
    alert("❌ Failed to share chat.");
  }
});

closeBtn.onclick = () => {
  modal.style.display = "none";
};

window.onclick = (e) => {
  if (e.target === modal) modal.style.display = "none";
};

copyBtn.onclick = () => {
  navigator.clipboard.writeText(shareLinkInput.value);
  copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
  setTimeout(() => copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Link', 2000);
};
  document.addEventListener('DOMContentLoaded', () => {
    const navBar = document.getElementById('topNavBar');

    document.addEventListener('mousemove', (e) => {
      const halfScreenHeight = window.innerHeight / 2;

      if (e.clientY < halfScreenHeight) {
        navBar.classList.add('show'); // Show navbar
      } else {
        navBar.classList.remove('show'); // Hide navbar
      }
    });
  });

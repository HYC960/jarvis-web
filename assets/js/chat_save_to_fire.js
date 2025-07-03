import { db, ref, set } from "./firebase-config.js";

// 🔐 Get logged in user email
const user = JSON.parse(sessionStorage.getItem("user"));
const userEmail = user?.email?.replace(/\./g, "_") || "anonymous";

// 🔁 Declare global variables
let sessionId = sessionStorage.getItem("sessionId");
let messageCount = Number(sessionStorage.getItem("messageCount") || 0);
let firstUserMessage = null;
let firstAIMessage = null;
let sessionCreated = !!sessionId;

// ✅ Helper to clean and shorten text
function cleanAndShorten(text, maxWords = 4) {
  return text
    .replace(/\n/g, " ")
    .replace(/[^\w\s]/g, "")
    .split(" ")
    .slice(0, maxWords)
    .join(" ");
}

// 💾 Function to generate session title and create new chat session
function createSessionIdFromMessages(userMsg, aiMsg) {
  const userPart = cleanAndShorten(userMsg);
  const aiPart = cleanAndShorten(aiMsg);
  const sessionTitle = `${userPart} | ${aiPart}`.slice(0, 60); // limit name length
  sessionStorage.setItem("sessionId", sessionTitle);
  sessionStorage.setItem("messageCount", 0);
  sessionId = sessionTitle;
  messageCount = 0;
  sessionCreated = true;
}

// ✅ Override conversationHistory.push to save each message
const originalPush = window.conversationHistory.push;
window.conversationHistory.push = function (...args) {
  const result = originalPush.apply(this, args);

  const latestMsg = args[0];
  if (latestMsg?.role && latestMsg?.content) {
    if (!sessionCreated) {
      if (latestMsg.role === "user" && !firstUserMessage) {
        firstUserMessage = latestMsg.content;
      } else if (latestMsg.role === "assistant" && firstUserMessage && !firstAIMessage) {
        firstAIMessage = latestMsg.content;
        createSessionIdFromMessages(firstUserMessage, firstAIMessage);
      } else {
        // wait for both user & ai first message
        return result;
      }
    }

    const msgIndex = `${messageCount}`;
    const messageRef = ref(db, `users/${userEmail}/${sessionId}/${msgIndex}`);

    set(messageRef, {
      role: latestMsg.role,
      content: latestMsg.content,
      timestamp: Date.now()
    });

    messageCount++;
    sessionStorage.setItem("messageCount", messageCount);
  }

  return result;
};

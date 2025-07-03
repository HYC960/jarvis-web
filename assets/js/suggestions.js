function showSuggestions() {
 const introLines = [
  "👋 Ready. When you are",
  "💡 Ask me anything smart",
  "✨ Powered by intelligence",
  "🧠 Let's spark ideas together",
  "🚀 Fuel your curiosity",
  "📚 Learn something new today",
  "🤔 Get answers to your questions",
  "📝 Improve your knowledge and skills",
  "🧭 Guide your thoughts with prompts",
  "💻 Explore the world of technology",
  "🛠️ Tools are ready — what's the mission?"
];

  const suggestions = [
    "🧠 What can you do?", "🔍 Latest AI news", "🧾 Summarize this", "🚀 GitHub trends",
    "📊 Weekly plan", "🧪 Explain Quantum", "🎬 Sci-fi movie", "📷 Reel ideas",
    "🎯 Goal tracker ideas", "🧘‍♂️ Daily mindfulness tip", "📱 Best mobile app today",
    "🎓 Explain blockchain", "📈 Stock market update", "🌐 Translate this sentence",
    "🛠️ Fix this bug in code", "📂 Organize my day", "💡 Give startup ideas",
    "🛒 Amazon bestsellers", "📚 Recommend a book", "🎤 Latest rap lyrics",
    "🖼️ Image generation idea", "🧬 Explain DNA structure", "📝 Resume improvement tips",
    "👨‍🍳 Quick dinner recipe", "🖋️ Rephrase this sentence", "📍 Nearby places to visit",
    "🎮 Latest gaming trends", "💬 Translate to Hindi", "📜 Write a poem",
    "📧 Draft a formal email", "🔢 Solve this math problem", "🗣️ Improve spoken English",
    "🧾 Budget planning tips", "📺 Show me today's news", "💻 HTML beginner project",
    "🧮 Explain Machine Learning", "🔐 Generate a secure password",
    "🗓️ Monthly habit tracker", "📤 Social media caption idea", "🌎 Facts about space",
    "🤖 How do transformers work?", "🎉 Plan a birthday surprise", "🌤️ Weather in Shamli",
    "🚴 Workout routine for beginners", "🧠 Brain teaser", "💬 Best ChatGPT prompt",
    "📝 Create a to-do list", "🪙 Cryptocurrency trends", "🎧 New music releases",
    "🛫 Weekend trip ideas", "👨‍💻 How to learn Python fast", "🎥 Movie for tonight?",
    "🧠 Mental health tip", "🗳️ Latest elections update", "🔍 Find this article",
    "📌 Pin this thought", "🖼️ Generate AI logo", "🌐 Website design inspiration"
  ];

  // 🔄 Get a random intro line each time
  const randomLine = introLines[Math.floor(Math.random() * introLines.length)];

  const suggestionsDiv = document.createElement("div");
  suggestionsDiv.id = "suggestions";

  const listItems = suggestions.map(text => `<li>${text}</li>`).join("");

  suggestionsDiv.innerHTML = `
    <p>${randomLine}</p>
    <ul>${listItems}</ul>
  `;

  chatBox.appendChild(suggestionsDiv);

  // 💬 Add click functionality
  suggestionsDiv.querySelectorAll("li").forEach(li => {
    li.addEventListener("click", () => {
      userInput.value = li.textContent.trim();
      userInput.focus();
    });
  });

  // 🖱️ Horizontal scroll
  const ul = suggestionsDiv.querySelector("ul");
  ul.addEventListener("wheel", function (e) {
    if (e.deltaY !== 0) {
      e.preventDefault();
      ul.scrollLeft += e.deltaY;
    }
  }, { passive: false });
}


// Remove Suggestions
function removeSuggestions() {
  const existing = document.getElementById("suggestions");
  if (existing) existing.remove();
}

// Show suggestions on initial page load (if no history)
window.addEventListener("load", () => {
  if (conversationHistory.length === 0) {
    showSuggestions();
  }
});
// Enhanced smooth and amplified horizontal scroll
document.addEventListener("DOMContentLoaded", () => {
  const ul = document.querySelector("#suggestions ul");

  if (ul) {
    let scrollAmount = 0;
    let isScrolling = false;

    ul.addEventListener(
      "wheel",
      function (e) {
        if (e.deltaY !== 0) {
          e.preventDefault();

          // 🔁 Amplify scroll amount (increase 3x or more for stronger effect)
          scrollAmount += e.deltaY * 3;

          if (!isScrolling) {
            isScrolling = true;
            smoothScroll();
          }
        }

        function smoothScroll() {
          const currentScroll = ul.scrollLeft;
          const targetScroll = currentScroll + scrollAmount;

          // ⚙️ Easing and speed control
          scrollAmount *= 0.7; // Lower = slower stop
          ul.scrollLeft += (targetScroll - currentScroll) * 0.2;

          if (Math.abs(scrollAmount) > 1) {
            requestAnimationFrame(smoothScroll);
          } else {
            isScrolling = false;
          }
        }
      },
      { passive: false }
    );
  }
});

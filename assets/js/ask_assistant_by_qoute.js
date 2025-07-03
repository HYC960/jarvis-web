const quoteBtn = document.getElementById("quoteBtn");
let selectedQuote = null;

document.addEventListener("mouseup", (e) => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (
    selectedText.length > 0 &&
    e.target.closest(".message-content")
  ) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    quoteBtn.style.top = `${rect.top + window.scrollY - 40}px`;
    quoteBtn.style.left = `${rect.left + window.scrollX}px`;
    quoteBtn.style.display = "block";

    quoteBtn.onclick = () => {
      showQuote(selectedText);
      quoteBtn.style.display = "none";
      selection.removeAllRanges(); // clear selection
    };
  } else {
    quoteBtn.style.display = "none";
  }
});
function showQuote(text) {
  selectedQuote = text;
  document.getElementById("quotedText").textContent = text;
  document.getElementById("quotedPreview").style.display = "flex";
}

document.getElementById("cancelQuoteBtn").addEventListener("click", () => {
  selectedQuote = null;
  document.getElementById("quotedPreview").style.display = "none";
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    selectedQuote = null;
    document.getElementById("quotedPreview").style.display = "none";
    window.getSelection().removeAllRanges(); // remove any selection
    quoteBtn.style.display = "none"; // also hide the quote button
  }
});

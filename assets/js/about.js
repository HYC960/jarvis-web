import { db, ref, set, onValue } from './firebase-config.js';

const aboutBtn = document.getElementById('aboutBtn');
const aboutOverlay = document.getElementById('aboutOverlay');
const submitAbout = document.getElementById('submitAbout');
const aboutInput = document.getElementById('aboutInput');
const statusMessage = document.getElementById('statusMessage');

let emailKey = '';
let userEmail = '';
let isUpdating = false; // tracks if about info already exists

// Show popup and load existing about (if any)
aboutBtn.addEventListener('click', () => {
  const user = JSON.parse(sessionStorage.getItem('user'));

  if (!user || !user.email) {
    alert("User not logged in.");
    return;
  }

  userEmail = user.email;
  emailKey = userEmail.replace(/\./g, '_');
  aboutOverlay.style.display = 'flex';
  aboutInput.value = '';
  statusMessage.textContent = '';
  submitAbout.textContent = "Submit"; // reset default

  // 🔄 Fetch existing about info (if any)
  const aboutRef = ref(db, `users/${emailKey}/about`);
  onValue(aboutRef, (snapshot) => {
    const existingText = snapshot.val();
    if (existingText) {
      aboutInput.value = existingText;
      submitAbout.textContent = "Update";
      isUpdating = true;
    } else {
      submitAbout.textContent = "Submit";
      isUpdating = false;
    }
  }, {
    onlyOnce: true
  });
});

// Save or Update about info
submitAbout.addEventListener('click', () => {
  const text = aboutInput.value.trim();

  if (text === '') {
    statusMessage.style.color = 'red';
    statusMessage.textContent = "Please enter something.";
    return;
  }

  set(ref(db, `users/${emailKey}/about`), text)
    .then(() => {
      statusMessage.style.color = 'limegreen';
      statusMessage.textContent = isUpdating ? "Updated successfully!" : "Saved successfully!";
      setTimeout(() => {
        aboutOverlay.style.display = 'none';
      }, 1000);
    })
    .catch(err => {
      console.error(err);
      statusMessage.style.color = 'red';
      statusMessage.textContent = "Failed to save.";
    });
});

// Close popup on outside click
aboutOverlay.addEventListener('click', (e) => {
  if (e.target === aboutOverlay) {
    aboutOverlay.style.display = 'none';
  }
});

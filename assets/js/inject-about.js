import { db, ref, onValue } from './firebase-config.js';

window.addUserAboutToSystemPrompt = async function (systemPrompt) {
  const currentUser = JSON.parse(sessionStorage.getItem("user"));
  const userName = currentUser?.displayName || currentUser?.name || currentUser?.fullName || 'Unknown User';
  const userEmail = currentUser?.email || 'Unknown Email';
  const safeEmail = userEmail.replace(/\./g, "_");

  const aboutRef = ref(db, `users/${safeEmail}/about`);

  return new Promise((resolve) => {
    onValue(aboutRef, (snapshot) => {
      const aboutText = snapshot.val() || "No additional info.";
      systemPrompt.content += `\n\n🧠 User 'About Me': ${aboutText}`;
      resolve(systemPrompt);
    }, { onlyOnce: true });
  });
};

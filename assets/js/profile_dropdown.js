 window.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(sessionStorage.getItem('user'));
  if (user && user.photoURL) {
    document.getElementById('userPic').src = user.photoURL;
    document.getElementById('dropdownPic').src = user.photoURL;

    const name = user.displayName || user.name || user.fullName || 'Unknown User';
    document.getElementById('userName').textContent = name;

    document.getElementById('userEmail').textContent = user.email || 'No email';
  }

  const profile = document.getElementById('userProfile');
  const dropdown = document.getElementById('userDropdown');

  profile.addEventListener('click', () => {
    dropdown.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!profile.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });
});

  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('user');
    window.location.href = 'login.html';
  });
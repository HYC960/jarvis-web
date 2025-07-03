
// Check if user is logged in
const userData = sessionStorage.getItem('user');
if (!userData) {
  // Redirect to login page if not logged in
  window.location.href = 'assets/chat/login.html';
}


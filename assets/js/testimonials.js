// Add this to your script.js (if you want auto-scrolling)
document.addEventListener('DOMContentLoaded', function() {
  // Auto-scroll testimonials
  const container = document.querySelector('.testimonials-container');
  if (container) {
    let scrollAmount = 0;
    const scrollSpeed = 1; // Adjust speed as needed
    
    function autoScroll() {
      scrollAmount += scrollSpeed;
      if (scrollAmount >= container.scrollWidth - container.clientWidth) {
        scrollAmount = 0;
      }
      container.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
      });
      requestAnimationFrame(autoScroll);
    }
    
    // Start auto-scroll after 3 seconds
    setTimeout(autoScroll, 3000);
    
    // Pause on hover
    container.addEventListener('mouseenter', () => {
      scrollSpeed = 0;
    });
    
    container.addEventListener('mouseleave', () => {
      scrollSpeed = 1;
    });
  }
});


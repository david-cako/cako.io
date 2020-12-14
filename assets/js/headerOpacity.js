const updateHeaderOpacity = () => {
  document.getElementById('cako-header-text').style.opacity = 1 - (window.scrollY/50);
}

window.addEventListener('scroll', () => {
  updateHeaderOpacity();
});

document.addEventListener('DOMContentLoaded', updateHeaderOpacity);
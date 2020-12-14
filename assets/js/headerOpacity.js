const updateHeaderOpacity = () => {
  document.getElementById('cako-header-text').style.opacity = 1 - (window.scrollY/50);
}

window.addEventListener('scroll', () => {
  if (window.scrollY>100) {
    return;
  }
  updateHeaderOpacity();
});

updateHeaderOpacity();
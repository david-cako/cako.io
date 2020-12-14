const cakoHeader = document.getElementById('cako-header-text');
let lastOpacity = 1;

const updateHeaderOpacity = () => {
  if (window.scrollY > 50 && lastOpacity === 0) {
    return;
  }
  
  const newOpacity = 1 - (window.scrollY/50)
  cakoHeader.style.opacity = newOpacity;
  lastOpacity = newOpacity; 
}

window.addEventListener('scroll', () => {
  updateHeaderOpacity();
});

document.addEventListener('DOMContentLoaded', updateHeaderOpacity);
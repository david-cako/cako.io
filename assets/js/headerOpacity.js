(() => {
  const cakoHeader = document.getElementById('cako-header-text');
  const cakoHeaderMaxScroll = 50;

  let lastOpacity = 1;

  const updateHeaderOpacity = () => {
    if (window.scrollY > cakoHeaderMaxScroll && lastOpacity === 0) {
      return;
    }

    const newOpacity = window.scrollY > cakoHeaderMaxScroll
      ? 0
      : 1 - (window.scrollY / cakoHeaderMaxScroll);

    cakoHeader.style.opacity = newOpacity;
    lastOpacity = newOpacity;
  }

  window.addEventListener('scroll', () => {
    updateHeaderOpacity();
  });

  document.addEventListener('DOMContentLoaded', updateHeaderOpacity);
})();
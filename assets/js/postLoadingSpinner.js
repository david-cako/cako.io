import {Spinner} from './spin.js';

const spinnerOpts = {
  lines: 13, // The number of lines to draw
  length: 38, // The length of each line
  width: 20, // The line thickness
  radius: 50, // The radius of the inner circle
  scale: 0.07, // Scales overall size of the spinner
  corners: 1, // Corner roundness (0..1)
  speed: 1, // Rounds per second
  rotate: 0, // The rotation offset
  animation: 'spinner-line-fade-quick', // The CSS animation name for the lines
  direction: 1, // 1: clockwise, -1: counterclockwise
  color: '#ffffff', // CSS color or array of colors
  fadeColor: 'transparent', // CSS color or array of colors
  top: '12px', // Top position relative to parent
  left: '100%', // Left position relative to parent
  shadow: '0 0 1px transparent', // Box-shadow for the lines
  zIndex: 2000000000, // The z-index (defaults to 2e9)
  className: 'spinner', // The CSS class to assign to the spinner
  position: 'absolute', // Element positioning
};

function removeSpinners() {
  const elements = document.getElementsByClassName('spinner');

  for (const e of elements) {
    e.remove();
  }
}

function onPostClicked(e) {
  removeSpinners();

  const spinner = new Spinner(spinnerOpts).spin();
  e.currentTarget.querySelector('.cako-post-title').appendChild(spinner.el);
}

(() => {
  const elements = document.getElementsByClassName('cako-post-link');

  for (const e of elements) {
    e.addEventListener('click', onPostClicked);
  }

  setInterval(removeSpinners, 200);
})();
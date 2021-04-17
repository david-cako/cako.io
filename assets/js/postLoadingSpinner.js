import { Spinner } from './spin.js';

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
  color: '#02442e', // CSS color or array of colors
  fadeColor: 'transparent', // CSS color or array of colors
  top: '12px', // Top position relative to parent
  left: '100%', // Left position relative to parent
  shadow: '0 0 1px transparent', // Box-shadow for the lines
  zIndex: 2000000000, // The z-index (defaults to 2e9)
  className: 'spinner', // The CSS class to assign to the spinner
  position: 'absolute', // Element positioning
};

let SPIN_BEGIN;
let SPIN_CLEAR_INTERVAL;

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

  SPIN_BEGIN = Date.now();

  // set an interval here that will continue after browser-back
  // to remove the spinner
  SPIN_CLEAR_INTERVAL = setInterval(() => {
    if (Date.now() - SPIN_BEGIN > 1000) {
      removeSpinners();
      clearInterval(SPIN_CLEAR_INTERVAL);
    }
  }, 10);
}

(() => {
  const elements = document.getElementsByClassName('cako-post-link');

  for (const e of elements) {
    e.addEventListener('click', onPostClicked);
  }
})();
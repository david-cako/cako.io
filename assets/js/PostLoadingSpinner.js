
import { Spinner } from './spin.js';

const LIGHT_ACCENT = "#0070e6";
const DARK_ACCENT = "#27d7ff";
const BLUE_ACCENT = "#658CFF";
const YELLOW_ACCENT = "#eca80a";
const RED_ACCENT = "#f92f00";
const GREEN_ACCENT = "#07b059";
const PURPLE_ACCENT = "#d300ff";

/** Spinner animation manager for post elements. */
export default class PostLoadingSpinner {
    spinnerOpts = {
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
        fadeColor: 'transparent', // CSS color or array of colors
        top: '12px', // Top position relative to parent
        left: '100%', // Left position relative to parent
        shadow: '0 0 1px transparent', // Box-shadow for the lines
        zIndex: 2000000000, // The z-index (defaults to 2e9)
        className: 'spinner', // The CSS class to assign to the spinner
        position: 'absolute', // Element positioning
    };

    spinner = new Spinner(this.spinnerOpts);

    constructor() {
        this.addEventListenersForPosts();
        window.addEventListener("pageshow", this.stop);
        window.addEventListener("focus", this.stop);
    }

    addEventListenersForPosts() {
        const elements = document.getElementsByClassName('cako-post-link');

        for (const e of elements) {
            // don't show spinner on post-nav links
            if (e.classList.contains("post-nav-link")) {
                return;
            }

            e.addEventListener('click', this.onPostClicked);
        }
    }

    setSpinnerColor(postElem) {
        const lights = window.lightsStatus();
        const activeAccent = lights === "off" ? DARK_ACCENT : LIGHT_ACCENT;

        const isFeatured = postElem.parentElement.parentElement
            .classList.contains("cako-featured");

        if (postElem.classList.contains("blue") ||
            (lights === "on" && isFeatured)) {
            this.spinner.opts.color = BLUE_ACCENT;
        } else if (postElem.classList.contains("yellow") ||
            (lights === "off" && isFeatured)) {
            this.spinner.opts.color = YELLOW_ACCENT;
        } else if (postElem.classList.contains("red")) {
            this.spinner.opts.color = RED_ACCENT;
        } else if (postElem.classList.contains("green")) {
            this.spinner.opts.color = GREEN_ACCENT;
        } else if (postElem.classList.contains("purple")) {
            this.spinner.opts.color = PURPLE_ACCENT;
        } else {
            this.spinner.opts.color = activeAccent;
        }
    }

    shouldSpin = (postElem) => {
        const featureElem = postElem.closest(".cako-featured");
        if (!featureElem) {
            return true;
        }

        const postElemWidth = postElem.getBoundingClientRect().width;
        const featureElemWidth = featureElem.getBoundingClientRect().width;
        const spinnerClearance = 50;

        if (featureElemWidth - postElemWidth > spinnerClearance) {
            return true;
        } else {
            return false;
        }
    }

    spin = (postElem) => {
        this.spinner.spin();
        postElem.querySelector('.cako-post-title').appendChild(this.spinner.el);
    }

    stop = () => {
        this.spinner.stop();
    }

    onPostClicked = (e) => {
        this.stop();

        if (this.shouldSpin(e.currentTarget)) {
            this.setSpinnerColor(e.currentTarget);
            this.spin(e.currentTarget);

            setTimeout(this.stop, 5000);
        }
    }
}

(() => {
    window.PostLoadingSpinner = new PostLoadingSpinner();
})();
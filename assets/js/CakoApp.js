import Menu from "./Menu";
import InfiniteScroll from "./InfiniteScroll";
import "./PostLoadingSpinner";

export default class CakoApp {
    menu;
    search;
    infiniteScroll;

    constructor() {
        this.menu = new Menu();
        this.search = new Search(Menu);
        this.infiniteScroll = new InfiniteScroll();
    }
}

(() => {
    window.CakoApp = new CakoApp();
});
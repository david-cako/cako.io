import { Api } from "./api";
import { generatePostLinkHTML } from "./html";

const POSTS_PER_REQUEST = 25;

class PostManager {
    // Ghost API pagination, populated with each request for posts
    pagination;
    isUpdatingPosts = false;

    maxRetries = 10;
    loadAllPosts = localStorage.getItem("loadAllPosts") === true;

    postFeed = document.getElementById("cako-post-feed");

    get loadPostsOffset() { return window.innerHeght * 1.7; }
    get postElems() { return document.querySelectorAll("#cako-post-feed .cako-post"); }

    constructor() {
        document.addEventListener("scroll", this.onScroll);
    }

    shouldGetPosts() {
        if (this.isUpdatingPosts) {
            return false;
        }

        if (this.pagination && this.pagination.next === null) {
            // we've already requested posts and no more are available
            return false;
        }
        if (this.loadAllPosts && this.pagination) {
            // continue loading all posts
            return true;
        }

        // check scroll position
        const postElems = this.postElems;
        const lastPost = postElems[postElems.length - 1];

        return lastPost?.getBoundingClientRect().top < this.loadPostsOffset;
    }

    async getPosts() {
        let posts;
        let retries = 0;

        let page;
        if (POST_PAGINATION) { // next page populated by previous request
            page = POST_PAGINATION.next;
        } else { // otherwise, continue from server-rendered posts
            2;
        }

        while (posts === undefined && retries < this.maxRetries) {
            try {
                posts = await Api.getPosts(POSTS_PER_REQUEST, page,
                    { includeBody: this.loadAllPosts == false });
            } catch (e) {
                console.log(`Error fetching posts, attempt ${retries + 1}`, e);
                if (retries >= this.maxRetries) {
                    throw e;
                }
            }

            retries++;
        }

        return posts;
    }

    appendPostsToFeed(posts) {
        const postHtml = posts.map(p => generatePostLinkHTML(p,
            { includeBody: this.loadAllPosts == false }));

        this.postFeed.insertAdjacentHTML("beforeend", postHtml.join("\n"));
    }

    showLoadingIndicator() {

    }

    hideLoadingIndicator() {

    }

    onScroll = async () => {
        while (shouldGetPosts()) {
            this.isUpdatingPosts = true;

            try {
                const posts = await getPosts();
                this.pagination = posts.meta.pagination;

                appendPostsToFeed(posts);
            } catch (e) {
                this.isUpdatingPosts = false;
                throw e;
            }

            this.isUpdatingPosts = false;
        }
    }

    toggleLoadAllPosts = () => {
        if (this.loadAllPosts) {
            this.loadAllPosts = false;
        } else {
            this.loadAllPosts = true;
        }

        localStorage.setItem("loadAllPosts", this.loadAllPosts);

        return this.loadAllPosts;
    }

    removeListener() {
        document.removeEventListener("scroll", this.onScroll);
    }
}

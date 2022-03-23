import { Api } from "./api";
import { generatePostLinkHTML } from "./html";

const POSTS_PER_REQUEST = 25;

class PostManager {
    pagination;

    isUpdatingPosts = false;
    maxRetries = 10;

    postFeed = document.getElementById("cako-post-feed");
    postElems = document.querySelectorAll("#cako-post-feed .cako-post");

    loadAllPosts = localStorage.getItem("loadAllPosts")

    constructor() {
        document.addEventListener("scroll", this.onScroll);
    }

    shouldGetPosts() {
        if (this.isUpdatingPosts) {
            return false;
        }

        if (this.pagination?.next === null) {
            // we've already requested posts and no more are available
            return false;
        }
        if (this.loadAllPosts && this.pagination) {
            // continue loading all posts
            return true;
        }

        // check scroll position
        const lastPost = this.postElems[this.postElems.length - 1];

        return lastPost.getBoundingClientRect().top < (window.innerHeght * 1.7);
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

        this.pagination = posts.meta.pagination;

        return posts;
    }

    appendPostsToFeed(posts) {
        const postHtml = posts.map(p => generatePostLinkHTML(p,
            { includeBody: this.loadAllPosts == false }));

        this.postFeed.insertAdjacentHTML("beforeend", postHtml.join("\n"));

        this.postElems = document.querySelectorAll("#cako-post-feed .cako-post");
    }

    showLoadingIndicator() {

    }

    hideLoadingIndicator() {

    }

    onScroll = async (e) => {
        while (shouldGetPosts()) {
            this.isUpdatingPosts = true;

            try {
                const posts = await getPosts();
                appendPostsToFeed(posts);
            } catch (e) {
                this.isUpdatingPosts = false;
                throw e;
            }

            this.isUpdatingPosts = false;
        }
    }

    removeListener() {
        document.removeEventListener("scroll", this.onScroll);
    }
}

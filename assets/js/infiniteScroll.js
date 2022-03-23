import { generatePostLinkHTML } from "./html";

const POSTS_PER_REQUEST = 25;

class PostManager {
    pagination;

    isUpdatingPosts = false;
    maxRetries = 10;

    postFeed = document.getElementById("cako-post-feed");
    postElems = document.querySelectorAll("#cako-post-feed .cako-post");

    constructor() {
        document.addEventListener("scroll", this.onScroll);
    }

    shouldGetPosts() {
        if (this.isUpdatingPosts) {
            return false;
        }
        if (!pagination) {
            return true;
        }
        if (pagination.next === null) {
            // we've already requested posts and no more are available
            return false;
        }

        if (this.postElems.length < 1) {
            return false;
        }

        const lastPost = this.postElems[this.postElems.length - 1];

        return lastPost.getBoundingClientRect().top < (window.innerHeght * 1.7);
    }

    async getPosts(page, { includeHtml }) {
        let posts;
        let retries = 0;

        while (posts === undefined && retries < this.maxRetries) {
            try {
                posts = await GHOST_API.posts.browse({
                    page,
                    limit: POSTS_PER_REQUEST,
                    fields: "title,html,published_at,slug"
                });
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
        const postHtml = posts.map(p => generatePostLinkHTML(p, { includeBody: true }));

        this.postFeed.insertAdjacentHTML("beforeend", postHtml.join("\n"));

        this.postElems = document.querySelectorAll("#cako-post-feed .cako-post");
    }

    showLoadingIndicator() {

    }

    hideLoadingIndicator() {

    }

    onScroll(e) {
        if (shouldGetPosts()) {
            this.isUpdatingPosts = true;
            // first page is rendered server-side
            const page = POST_PAGINATION?.next || 2;

            try {
                const posts = getPosts(page, { includeHtml: true });
                appendPostsToFeed(posts);
            } catch (e) {
                this.isUpdatingPosts = false;
                throw e;
            }

            this.isUpdatingPosts = false;
        }
    }
}

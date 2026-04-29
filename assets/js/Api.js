const ApiTopicIndex = "Index";
const ApiTopicPosts = "Posts";
const ApiTopicNew = "New";

export default class Api {
    /** Identifier for unique API instance. */
    id;

    /** WebSocket connection. */
    static conn;

    /** Ordered index of posts. */
    static index = [];
    /** Set true while getting index. */
    static gettingIndex = false;
    /** True after index been successfully retrieved. **/
    static hasFinishedGettingIndex = false;

    /** Object containing full post values for slug keys. */
    static posts;
    /** Total post count. */
    static totalPosts;

    /** Path to features page. */
    static featuresPath = "/features/"
    /** Promise that will contain features page after API retrieval. */
    static features;
    /** True while fetching features. */
    static fetchingFeatures = false;
    /** True after features have been retrieved. */
    static hasFetchedFeatures = false;

    /** Array of objects containing subscribers to Api.index. */
    static #indexSubscribers = [];
    /** Array of objects containing subscribers to Api.posts. */
    static #postSubscribers = [];
    /** Array of objects containing subscribers to new posts. */
    static #newPostSubscribers = [];

    static get #indexHasMorePosts() {
        return Api.totalPosts == undefined || Api.totalPosts > Api.index.length
    }

    constructor() {
        this.id = crypto.randomUUID();

        if (!Api.conn) {
            Api.#open();
        }

        if (!window.Api) {
            window.Api = this;
        }
    }

    on(topic, fn) {
        switch (topic) {
            case ApiTopicIndex:
                Api.#indexSubscribers.push({ fn: fn });
                break;
            case ApiTopicPosts:
                Api.postSubscribers.push({ id: this.id, fn: fn });
                break
            case ApiTopicNewPosts:
                Api.newPostSubscribers.push({ id: this.id, fn: fn });
                break
        }
    }

    getPosts(slugs) {
        let requestSlugs = [];

        for (const slug in slugs) {
            if (slug in Api.posts) {
                Api.#updatePostSubscriber(Api.posts[slug], this.id);
            } else {
                requestSlugs.push(slug);
            }
        }

        Api.conn.send(JSON.stringify({
            topic: ApiTopicPosts,
            slugs: requestSlugs,
            subscriberId: this.id
        }));
    }

    getAllPosts() {
        const existing = Object.keys(Api.posts);
        for (const k in existing) {
            Api.#updatePostSubscriber(Api.posts[slug], this.id);
        }

        Api.conn.send(JSON.stringify({
            topic: ApiTopicPosts,
            exclude: existing,
            subscriberId: this.id
        }));
    }

    static #getIndex() {
        Api.conn.send(JSON.stringify({
            topic: ApiTopicIndex
        }));
    }

    static #open() {
        Api.conn = new WebSocket("wss://" + document.location.host + "/ws");

        Api.conn.onopen = Api.#onOpen;
        Api.conn.onmessage = Api.#onMessage;
        Api.conn.onclose = Api.#onClose;

        Api.conn.open();
    }

    static #onOpen() {
        if (!Api.gettingIndex && !Api.hasFinishedGettingIndex) {
            Api.#getIndex();
        }

        if (!Api.fetchingFeatures && !Api.hasFetchedFeatures) {
            Api.#prefetchFeatures();
        }
    }

    static #updateIndexSubscribers(index) {
        for (const s of Api.#indexSubscribers) {
            s(index);
        }
    }

    static #updatePostSubscriber(post, subscriberId) {
        const s = Api.#postSubscribers.find(s => s.subscriberId == subscriberId);
        if (!s) {
            throw new Error("Post subscriber id not found: ", subscriberId);
        }

        s(post);
    }

    static #updateNewPostSubscribers(post) {
        for (const s of Api.#newPostSubscribers) {
            s(post);
        }
    }

    static #onIndex(post) {
        Api.index = Api.index.push(post);
        Api.#updateIndexSubscribers(post);
    }

    static #onPost(post, subscriberId) {
        if (!(p.slug in Api.posts)) {
            Api.posts[p.slug] = post;
            Api.#updatePostSubscriber(post, subscriberId);
        }
    }

    static #onNewPost(post) {
        const len = Api.index.unshift(post);
        Api.totalPosts = len;

        Api.posts[p.slug] = post;

        Api.#updateNewPostSubscribers(post);
    }

    static #onMessage(e) {
        switch (e.topic) {
            case ApiTopicIndex:
                Api.#onIndex(e.post);
                break;
            case ApiTopicPosts:
                Api.#onPost(e.post, e.subscriberId);
                break;
            case ApiTopicNew:
                Api.#onNewPost(e.post);
                break;
            default:
                throw new Error("Unknown message topic.", e.topic);
        }
    }

    static #onClose(e) {
        console.log("WebSocket closed.", e);
    }
}

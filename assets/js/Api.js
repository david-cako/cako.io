import AsyncGenerator from "./AsyncGenerator";

const ApiTopicIndex = "Index";
const ApiTopicPosts = "Posts";
const ApiTopicNew = "New";

export default class Api {
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

    static #stream;

    /** Array of objects containing generators for Api.index. */
    static #indexGenerators = [];
    /** Array of objects containing generators for Api.posts. */
    static #postGenerators = [];
    /** Array of objects containing generators for new posts. */
    static #newPostGenerators = [];

    static get #indexHasMorePosts() {
        return Api.totalPosts == undefined || Api.totalPosts > Api.index.length
    }

    constructor() {
        if (!Api.conn) {
            Api.#open();
        }

        if (!window.Api) {
            window.Api = this;
        }
    }

    static getIndex() {
        const g = new AsyncGenerator([...Api.index]);

        Api.#indexStreams.push({ generator: g });

        return s;
    }

    static getPosts(slugs) {
        const id = crypto.randomUUID();

        let existing = [];
        let requestSlugs = [];

        for (const slug in slugs) {
            if (slug in Api.posts) {
                existing.push(Api.posts[slug]);
            } else {
                requestSlugs.push(slug);
            }
        }

        const g = new AsyncGenerator(existing);

        Api.conn.send(JSON.stringify({
            topic: ApiTopicPosts,
            slugs: requestSlugs,
            topicId: id
        }));

        Api.#postGenerators.push({ generator: g, topicId: id });

        return s;
    }

    static getAllPosts() {
        const id = crypto.randomUUID();

        let existing = [];

        const existingKeys = Object.keys(Api.posts);
        for (const k in existingKeys) {
            existing.push(Api.posts[slug]);
        }

        const g = new AsyncGenerator(existing);

        Api.conn.send(JSON.stringify({
            topic: ApiTopicPosts,
            exclude: existing,
            topicId: id
        }));

        Api.#postGenerators.push({ generator: g, topicId: id });

        return s;
    }

    static getNewPosts() {
        const id = crypto.randomUUID();

        const s = new AsyncGenerator();

        Api.#newPostGenerators.push({ generator: g, topicId: id });

        return s;
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

    static #onIndex(e) {
        if (e.post) {
            Api.index = Api.index.push(e.post);
        }

        for (const s of Api.#indexStreams) {
            if (e.post) {
                s.generator.resolve(e.post);
            } else {
                s.generator.resolve(null);
            }
        }
    }

    static #onPost(e) {
        const s = Api.#postGenerators.find(s => s.subscriberId == e.subscriberId);
        if (!s) {
            throw new Error("Post subscriber id not found: ", e.subscriberId);
        }

        if (!e.post) {
            s.generator.resolve(null);

            const idx = Api.#postGenerators.indexOf(s);
            Api.#postGenerators.splice(idx, 1);
        } else if (!(e.post.slug in Api.posts)) {
            Api.posts[p.slug] = e.post;
            s.generator.resolve(post);
        }
    }

    static #onNewPost(post) {
        const len = Api.index.unshift(post);
        Api.totalPosts = len;

        Api.posts[p.slug] = post;

        for (const s of Api.#newPostGenerators) {
            s.generator.resolve(post);
        }
    }

    static #onMessage(e) {
        switch (e.topic) {
            case ApiTopicIndex:
                Api.#onIndex(e);
                break;
            case ApiTopicPosts:
                Api.#onPost(e);
                break;
            case ApiTopicNew:
                Api.#onNewPost(e);
                break;
            default:
                throw new Error("Unknown message topic.", e.topic);
        }
    }

    static #onClose(e) {
        console.log("WebSocket closed.", e);
    }
}

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

    /** Array of objects containing streams for Api.index. */
    static #indexStreams = [];
    /** Array of objects containing streams for Api.posts. */
    static #postStreams = [];
    /** Array of objects containing streams for new posts. */
    static #newPostStreams = [];

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
        const s = new TransformStream({
            start(controller) {
                for (const p of Api.index) {
                    controller.enqueue(p);
                }
            }
        });

        Api.#indexStreams.push({ stream: s });

        return s;
    }

    static getPosts(slugs) {
        const id = crypto.randomUUID();
        const s = new TransformStream({
            start(controller) {
                let requestSlugs = [];

                for (const slug in slugs) {
                    if (slug in Api.posts) {
                        controller.enqueue(Api.posts[slug]);
                    } else {
                        requestSlugs.push(slug);
                    }
                }

                Api.conn.send(JSON.stringify({
                    topic: ApiTopicPosts,
                    slugs: requestSlugs,
                    streamId: id
                }));
            }
        });

        Api.#postStreams.push({ stream: s, streamId: id });

        return s;
    }

    static getAllPosts() {
        const id = crypto.randomUUID();

        const s = new TransformStream({
            start(controller) {
                const existing = Object.keys(Api.posts);
                for (const k in existing) {
                    controller.enqueue(Api.posts[slug], id);
                }

                Api.conn.send(JSON.stringify({
                    topic: ApiTopicPosts,
                    exclude: existing,
                    subscriberId: id
                }));
            }
        });

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
        Api.index = Api.index.push(e.post);

        for (const s of Api.#indexStreams) {
            const w = s.writable.getWriter();
            w.write(index);
            w.close();
        }
    }

    static #onPost(e) {
        if (!(e.post.slug in Api.posts)) {
            Api.posts[p.slug] = e.post;

            const s = Api.#postStreams.find(s => s.subscriberId == subscriberId);
            if (!s) {
                throw new Error("Post subscriber id not found: ", subscriberId);
            }

            const w = s.writable.getWriter();
            w.write(post);
            w.close();
        }
    }

    static #onNewPost(post) {
        const len = Api.index.unshift(post);
        Api.totalPosts = len;

        Api.posts[p.slug] = post;

        for (const s of Api.#newPostStreams) {
            const w = s.writable.getWriter();
            w.write(post);
            w.close();
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

import { generateFeatureHTML } from "./html";

const GHOST_API = new GhostContentAPI({
    url: "https://cako.io",
    key: "723c108685f2d6fba50c68a511",
    version: "v3"
});

async function getAllFeatures() {
    const [tags, posts] = await Promise.all([
        GHOST_API.tags.browse(),
        GHOST_API.posts.browse({
            filter: `tag:feature`,
            limit: "all",
            fields: "title,html,published_at,slug"
        })
    ]);

    const featureTags = tags.filter(t => t.slug.indexOf("feature-") === 0);

    let features = featureTags.map(f => ({
        tag: f,
        posts: posts.filter(p => (p.tags.find(t => t.slug === f.slug) !== undefined))
    }));

    return features;
}

function getFeature(name) {
    const [tag, posts] = await Promise.all([
        GHOST_API.tags.read({ slug: name }),
        GHOST_API.posts.browse({
            filter: `tag:${name}`,
            limit: "all",
            fields: "title,html,published_at,slug"
        })
    ]);

    return {
        tag,
        posts
    };
}

function getFeatureForCurrentPost() {
    const postSlug = window.location.pathname.replaceAll("/", "");
    const features = getAllFeatures();

    for (const f of features) {
        if (f.posts.filter(p => p.slug === postSlug)) {
            return f;
        }
    }
}

function isIndex() {
    return window.location.pathname === "/";
}

function isFeatureIndex() {
    return window.location.pathname === "/features/";
}

function toggleFeature(element) {
    const closedIdx = element.classList.indexOf("closed");

    if (closedIdx === -1) {
        element.classList.push("closed");
    } else {
        element.classList.splice(closedIdx, 1);
    }
}

function setupToggleHandler() {
    if (isIndex() || !isFeatureIndex()) {
        const featureElem = document.getElementsByClassName("cako-featured")[0];

        featureElem.addEventListener("click", toggleFeature);
    }
}

(async () => {
    const menu = document.getElementById("cako-menu");

    if (isFeatureIndex()) { // Populate index of features
        const content = document.getElementsByClassName("post-full-content")[0];

        if (content) {
            const features = getAllFeatures();
            const featuresHtml = features.map(f => generateFeatureHTML(f, { includeDescription: true }));

            content.insertAdjacentHTML("beforeend", featuresHtml);
        }
    } else if (isIndex() && CURRENT_FEATURE) { // Populate current feature on home page
        const feature = getFeature(CURRENT_FEATURE);
        const featureElem = document.getElementsByClassName("cako-featured")[0];

        if (feature && featureElem) {
            featureElem.outerHTML = generateFeatureHTML(feature,
                { includeDescription: true, closed: true });
        }
    } else if (menu) { // Populate any feature related to currently viewed post
        const feature = getFeatureForCurrentPost();
        const featureHtml = generateFeatureHTML(feature,
            { includeDescription: true, closed: true });

        menu.insertAdjacentElement("beforeend", featureHtml);
    }

    setupToggleHandler();
})();
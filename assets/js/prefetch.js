function insertPrefetchLink(url) {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = url;

    document.head.append(link);
}

function insertArticlePrefetchLinks(count = 10) {
    const articles = document.getElementsByClassName("cako-post-link");

    [...articles].slice(0, count).map(article => {
        insertPrefetchLink(article.href)
    });
}

function insertFeaturesPrefetchLink() {
    insertPrefetchLink("/features/");
}

function insertPostNavPrefetchLinks() {
    document.querySelectorAll(".post-nav-link").forEach(l => {
        insertPrefetchLink(l.href)
    });
}


function insertPrefetchLinksForFeature(feature) {
    const articles = feature.querySelectorAll(".cako-post-link");
    articles.forEach(a => insertPrefetchLink(a.href));
}

/** Accepts article click event and adds pageshow handler to 
 * prefetch all sibling features after navigating back to "Features" 
 * from the destination article. */
function prefetchFeatureArticlesOnPageShow(e) {
    function addPrefetchLinks() {
        const existing = [...document.head.querySelectorAll("link[rel='prefetch']")];
        const existingPaths = existing.map(link => link.href);

        const featureArticles = e.target.closest(".cako-featured")
            .querySelectorAll(".cako-post-link");

        const newLinks = [];

        for (const a of featureArticles) {
            if (!existingPaths.includes(a.href)) {
                newLinks.push(a.href);
            }
        }

        newLinks.forEach(insertPrefetchLink);

        window.removeEventListener("pageshow", addPrefetchLinks);
    };

    window.addEventListener("pageshow", addPrefetchLinks)
}

/** Add click handlers to post links to prefetch all sibling features,
 * and prefetch articles for the first feature. */
function initFeaturePrefetch() {
    const articles = document.getElementsByClassName("cako-post-link");

    for (const a of articles) {
        a.addEventListener("click", prefetchFeatureArticlesOnPageShow);
    }

    const firstFeature = document.querySelector(".cako-featured");
    if (firstFeature) {
        insertPrefetchLinksForFeature(firstFeature)
    }
}

(() => {
    if (window.location.pathname === "/") {
        insertArticlePrefetchLinks();
        insertFeaturesPrefetchLink();
    } else if (window.location.pathname === "/features/") {
        initFeaturePrefetch();
    } else {
        insertPostNavPrefetchLinks();
    }
})();
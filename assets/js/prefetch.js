function insertArticlePrefetchLinks(count = 10) {
    const articles = document.getElementsByClassName("cako-post-link");

    const prefetchLinks = [...articles].slice(0, count).map(article => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = article.href;

        return link;
    });

    document.head.append(...prefetchLinks);
}

function insertFeaturesPrefetchLink() {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = "/features/";

    document.head.append(link);    
}

/** Accepts article click event and adds pageshow handler to 
 * prefetch all sibling features after navigating back to "Features" 
 * from the destination article. */
function prefetchFeatureArticles(e) {
    const existing = [...document.head.querySelectorAll("link[rel='prefetch']")];
    const existingPaths = existing.map(link => link.href);

    const featureArticles = e.target.closest(".cako-featured")
        .querySelectorAll(".cako-post-link");
    
    const newLinks = [];

    for (const a of featureArticles) {
        if (!existingPaths.includes(a.href)) {
            const link = document.createElement("link");
            link.rel = "prefetch";
            link.href = a.href;

            newLinks.push(link);
        }
    }

    function addPrefetchLinks() {
        document.head.append(...newLinks);

        window.removeEventListener("pageshow", addPrefetchLinks);
    };

    window.addEventListener("pageshow", addPrefetchLinks)
}

/** Add click handlers to post links to prefetch all sibling features. */
function setupFeaturePrefetchHandlers() {
    const articles = document.getElementsByClassName("cako-post-link");

    for (const a of articles) {
        a.addEventListener("click", prefetchFeatureArticles);
    }
}

(() => {
    if (window.location.pathname === "/") {
        insertArticlePrefetchLinks();
        insertFeaturesPrefetchLink();
    } else if (window.location.pathname === "/features/") {
        setupFeaturePrefetchHandlers();
    }
})();
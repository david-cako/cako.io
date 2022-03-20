const GHOST_API = new GhostContentAPI({
    url: "https://cako.io",
    key: "723c108685f2d6fba50c68a511",
    version: "v3"
});

function generateFeatureHTML(feature, includeDescription, collapsed) {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    let postsHtml = ``

    for (const p of feature.posts) {
        const d = new Date(p.published_at);
        const year = d.getFullYear();
        const month = d.getMonth();
        const date = d.getDate();
        const monthName = monthNames[month];
        const monthStr = String(month + 1).padStart(2, "0");

        const datetime = `${year}-${monthStr}-${String(date).padStart(2, "0")}`;

        postsHtml += `<div class="cako-post">
        <a href="/${p.slug}/" class="cako-post-link">
            <div class="cako-post-title">${p.title}</div>
            <div class="cako-post-date-outer">
                <time class="cako-post-date" datetime="${datetime}">${date} ${monthName} ${year}</time>
            </div>
        </a>
    </div>`;
    }

    if (includeDescription) {
        const featureMetadata = JSON.parse(feature.tag.description);

        let featureDate;
        let featureMonth;
        let featureYear;

        if (featureMetadata?.date) {
            const d = new Date(featureMetadata?.date);
            featureDate = d.getDate();
            featureMonth = monthNames[d.getMonth()];
            featureYear = d.getFullYear();
        }

        return `<div class="cako-featured ${collapsed ? "collapsed" : ""}">
        <div class="cako-featured-header">${feature.tag.name}
            <div class="cako-featured-description">${featureMetadata.description}</div>
            <div class="cako-featured-date">${featureDate} ${featureMonth} ${featureYear}</div>
        </div>
        ${postsHtml}
        </div>`
    } else {
        return `<div class="cako-featured">
        <div class="cako-featured-header">${feature.tag.name}
        </div>
        ${postsHtml}
        </div>`
    }
}

async function getAllFeatures() {
    const [tags, posts] = await Promise.all([
        GHOST_API.tags.browse(),
        GHOST_API.posts.browse({
            filter: `tag:feature`,
            limit: "all",
            fields: "title,html,published_at,slug"
        })
    ]);

    const featureTags = tags.filter(t => t.slug.indexOf("feature") === 0);

    let features = featureTags.map(f => ({
        tag: f,
        posts: posts.filter(p => (p.tags.find(t => t.slug === f.slug) !== undefined))
    }));

    return features;
}

function getFeature(name) {
    const features = getAllFeatures();

    return features.find(f => f.tag.name === name);
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
    const collapsedIdx = element.classList.indexOf("collapsed");

    if (collapsedIdx !== -1) {
        element.classList.push("collapsed");
    } else {
        element.classList.splice(collapsedIdx, 1);
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

    if (isFeatureIndex()) {
        const content = document.getElementsByClassName("post-full-content")[0];

        if (content) {
            const features = getAllFeatures();
            const featuresHtml = features.map(f => generateFeatureHTML(f, true));

            content.insertAdjacentHTML("beforeend", featuresHtml);
        }
    } else if (isIndex() && CURRENT_FEATURE) {
        const feature = getFeature(CURRENT_FEATURE);
        const featureElem = document.getElementsByClassName("cako-featured")[0];

        if (feature && featureElem) {
            featureElem.outerHTML = generateFeatureHTML(feature, true, true);
        }
    } else if (menu) {
        const feature = getFeatureForCurrentPost();
        const featureHtml = generateFeatureHTML(feature, true, true);

        menu.insertAdjacentElement("beforeend", featureHtml);
    }

    setupToggleHandler();
})();
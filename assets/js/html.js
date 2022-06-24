const MonthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export function generatePostLinkHTML(post, { isCurrentPost, includeBody } = {}) {
    const d = new Date(post.published_at);
    const year = d.getFullYear();
    const month = d.getMonth();
    const date = d.getDate();
    const monthName = MonthNames[month];
    const monthStr = String(month + 1).padStart(2, "0");

    const datetime = `${year}-${monthStr}-${String(date).padStart(2, "0")}`;

    return `<div class="cako-post${isCurrentPost ? " current" : ""}">
    ${isCurrentPost ? '<div class="current-post-marker">◆</div>' : ""}
    <a href="/${post.slug}/" class="cako-post-link">
        <div class="cako-post-title">${post.title}</div>
        <div class="cako-post-date-outer">
            <time class="cako-post-date" datetime="${datetime}">${date} ${monthName} ${year}</time>
        </div>
    </a>
    ${includeBody ? `<section class="post-full-content">
        ${post.html}
    </section>` : ""}
</div>`;
}

export function generateFeatureHTML(feature, { includeDescription, closed } = {}) {
    let postsHtml = (feature.posts.map(p => {
        const isCurrentPost = p.slug === window.location.pathname.replaceAll("/", "");

        return generatePostLinkHTML(p, { isCurrentPost })
    })).join("");

    if (includeDescription) {
        const featureMetadata = JSON.parse(feature.tag.description);

        let featureDate;
        let featureMonth;
        let featureYear;

        if (featureMetadata?.date) {
            const d = new Date(featureMetadata?.date);
            featureDate = d.getDate();
            featureMonth = MonthNames[d.getMonth()];
            featureYear = d.getFullYear();
        }

        return `<div class="cako-featured${closed ? " closed" : ""}">
        <div class="arrow">▸</div>
        <div class="cako-featured-header">${feature.tag.name}
            ${featureMetadata.description
                ? `<div class="cako-featured-description">${featureMetadata.description}</div>`
                : ""
            }
            <div class="cako-featured-date">${featureDate} ${featureMonth} ${featureYear}</div>
        </div>
        <div class="posts">
            ${postsHtml}
        </div>
        </div>`
    } else {
        return `<div class="cako-featured">
        <div class="cako-featured-header">${feature.tag.name}
        </div>
        ${postsHtml}
        </div>`
    }
}
const MonthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default class Html {
    static postFeed = document.getElementById("cako-post-feed");

    static postTemplate = document.querySelector("#cako-post-template");
    static postLinkTemplate = document.querySelector("#cako-post-link-template");

    static generateSearchPreviewHTML(result) {
        if (result.strong === undefined || result.strong.in !== "html") {
            return ``
        }

        const words = result.strong.preview.split(" ");

        for (let i = 0; i < words.length; i++) {
            const w = words[i];

            for (let m of result.strong.matches) {
                let matchIdx = w.indexOf(m.word);

                if (matchIdx !== -1) {
                    let before, match, after;

                    const tokenIdx = m.word.toLowerCase().indexOf(m.token);

                    if (tokenIdx !== -1) {
                        before = w.slice(0, tokenIdx);
                        match = w.slice(tokenIdx, tokenIdx + m.token.length);
                        after = w.slice(tokenIdx + m.token.length);
                    } else {
                        before = "";
                        match = w;
                        after = "";
                    }

                    words[i] = `${before}<span class="match">${match}</span>${after}`;
                }
            }
        }

        return `<div class="cako-post-preview">${words.join(" ")}</div>`;
    }

    static getPostDateObject(post) {
        const d = new Date(post.published_at);
        return {
            d: d,
            year: d.getFullYear(),
            month: d.getMonth(),
            date: d.toLocaleString(undefined, {
                date: "2-digit"
            }),
            monthName: MonthNames[month],
            monthStr: d.toLocaleString(undefined, {
                month: "2-digit"
            }),
            datetime: `${year}-${monthStr}-${date}`,
            time: d.toLocaleTimeString(undefined, {
                hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
            })
        }
    }

    static generatePostLinkHtml(post, { searchResult } = {}) {
        const {
            d,
            year,
            month,
            date,
            monthName,
            monthStr,
            datetime,
            time
        } = Html.getPostDateObject(post);

        if (searchResult !== undefined) {
            if (searchResult.strong !== undefined &&
                searchResult.strong.in === "html") {
                body = generateSearchPreviewHTML(searchResult);
            }
        }

        const postLinkElem = document.importNode(Html.postLinkTemplate.content, true);
        postLinkElem.dataset.postId = post.slug;

        let aElem = postLinkElem.querySelector("a");
        aElem.href = `/${post.slug}/`

        let titleElem = postLinkElem.querySelector(".cako-post-title");
        titleElem.innerText = post.title;

        let dateElem = postLinkElem.querySelector(".cako-post-date");
        dateElem.setAttribute("datetime", datetime);
        dateElem.innerText = `${date} ${monthName} ${year}`;

        return postLinkElem;
    }

    static generatePostHtml(post) {
        const {
            d,
            year,
            month,
            date,
            monthName,
            monthStr,
            datetime,
            time
        } = Html.getPostDateObject(post);

        const postElem = document.importNode(Html.postTemplate.content, true);
        postElem.dataset.postId = post.slug;

        let titleElem = postElem.querySelector(".post-full-title");
        titleElem.innerText = post.title;

        let dateElem = postElem.querySelector(".post-full-meta-date");
        dateElem.setAttribute("datetime", datetime);
        dateElem.innerText = `${date} ${monthName} ${year}`;

        let contentElem = postElem.querySelector(".post-full-content");
        contentElem.innerHTML = post.html;

        return postElem;
    }

    static appendPostsToFeed(posts, atEnd = true) {
        const postHtml = posts.map(p => Html.generatePostLinkHtml(p));

        Html.postFeed.insertAdjacentHTML("beforeend", postHtml.join("\n"));
    }

    static appendPostsToBeginningOfFeed(posts) {
        const postHtml = posts.map(p => Html.generatePostLinkHtml(p));

        Html.postFeed.insertAdjacentHTML("afterbegin", postHtml.join("\n"));
    }

    static postsFeedContains(post) {
        return Html.postFeed.querySelector(`[href="/${p.slug}/"]`) !== null;
    }
}
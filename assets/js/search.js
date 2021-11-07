const GHOST_API = new GhostContentAPI({
    url: "https://cako.io",
    key: "723c108685f2d6fba50c68a511",
    version: "v3"
});

const GHOST_POSTS = GHOST_API.posts.browse({ limit: "all", fields: "title,html,published_at,slug" });

function tokenizeQuery(query) {
    const q = query.toLowerCase();

    // replace special characters with spaces
    const newQuery = q.replace(/[`&()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, ' ');

    // split newQuery into words and add to tokens
    const tokens = newQuery.split(" ").filter(t => t.length > 0);

    return tokens;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function getStrongMatch(matches, post) {
    const previewLength = 20;

    const htmlMatches = matches.filter(m => m.in == "html");

    const titleWords = post.title.toLowerCase().split(" ");

    let titleMatches = [];

    for (const word of titleWords) {
        for (const m of matches) {
            if (m.token !== undefined
                && word.indexOf(m.token) !== -1
                && titleMatches.indexOf(word) === -1
            ) {
                titleMatches.push(word);
                break;
            }
        }
    }

    if (titleMatches.length / titleWords.length >= 0.7) {
        return { in: "title", preview: post.title };
    }

    if (htmlMatches.length > 0) {
        const htmlWords = post.html.replace(/<(.|\n)*?>/g, " ").split(" ");

        let htmlMatchIdxs = [];

        for (let i = 0; i < htmlWords.length; i++) {
            const word = htmlWords[i].toLowerCase();
            for (const m of matches) {
                if (m.token !== undefined
                    && word.indexOf(m.token) !== -1
                    && htmlMatchIdxs.indexOf(i) === -1
                ) {
                    htmlMatchIdxs.push(i);
                }
            }
        }

        if (htmlMatchIdxs.length < 1) {
            return;
        }

        htmlMatchIdxs.sort((a, b) => a - b);

        let maxSequential = [];
        let sequential = [];
        let prev;

        for (const idx of htmlMatchIdxs) {
            if (prev === undefined || idx - 1 === prev) {
                sequential.push(idx);
            } else {
                if (sequential.length >= maxSequential.length) {
                    maxSequential = sequential;
                }
                sequential = [idx];
            }

            prev = idx;
        }

        if (sequential.length >= maxSequential.length) {
            maxSequential = sequential;
        }

        // get surrounding text before returning sequential html match
        if (maxSequential.length / matches.length >= 0.7) {
            const matchMin = Math.min(...maxSequential);
            const matchMax = Math.max(...maxSequential);

            let min = matchMin;
            let max = matchMax;

            while (max - min < previewLength) {
                if (min !== 0) {
                    min--;
                }

                if (max - min < previewLength && max < htmlWords.length) {
                    max++;
                }

                if (min === 0 && max === htmlWords.length) {
                    break;
                }
            }

            const preview = htmlWords.slice(min, max + 1).join(" ");

            return { in: "html", preview: preview };
        }
    }
}

/** Match for title, content, and date on posts */
async function cakoSearch(query) {
    const posts = await getOrFetchPosts();

    const tokens = tokenizeQuery(query);

    const results = [];

    for (const p of posts) {
        const publishDate = new Date(p.published_at);
        const publishDateStr = p.published_at.split("T")[0];

        let matches = [];

        for (const t of tokens) {
            const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase().indexOf(t) !== -1);
            const monthStr = String(monthIdx + 1).padStart(2, "0");

            if (p.title.toLowerCase().indexOf(t) !== -1) {
                matches.push({ in: "title", token: t });
            } else if (publishDate.getFullYear() === parseInt(t)) {
                // check for hard date ranges before using month string matches
                matches.push({ in: "date" });
            } else if (monthIdx !== -1 && publishDateStr.indexOf(`-${monthStr}-`) !== -1) {
                // if the string matches a month, check the publish date
                // with the formatted string for the month number
                matches.push({ in: "date" });
            } else if (publishDate.getDate() === parseInt(t)) {
                matches.push({ in: "date" });
            } else if (isNaN(t) && p.html.toLowerCase().indexOf(t) !== -1) {
                // exclude numbers from html content matches
                // this makes it easier to search for numbers in dates/titles
                matches.push({ in: "html", token: t });
            }
        }

        if (matches.length == tokens.length ||
            matches.length > 2 && matches.length / tokens.length >= .7) {
            const strong = getStrongMatch(matches, p);
            results.push({ post: p, strong: strong });
        }
    }

    const sorted = results.sort((a, b) => {
        const aVal = a.strong !== undefined
            ? a.strong.in === "title"
                ? 99
                : a.strong.preview.split(" ").length
            : 0;
        const bVal = b.strong !== undefined
            ? b.strong.in === "title"
                ? 99
                : b.strong.preview.split(" ").length
            : 0;

        return bVal - aVal;
    });

    return sorted;
}

function formatPreview(result, query) {
    if (result.strong === undefined || result.strong.in !== "html") {
        return ``
    }

    const tokens = tokenizeQuery(query);
    const words = result.strong.preview.split(" ");

    for (let i = 0; i < words.length; i++) {
        let w = words[i];

        for (const t of tokens) {
            const tokenIdx = w.toLowerCase().indexOf(t);
            if (tokenIdx !== -1) {
                const before = w.slice(0, tokenIdx);
                const match = w.slice(tokenIdx, tokenIdx + t.length);
                const after = w.slice(tokenIdx + t.length);

                words[i] = `${before}<span class="match">${match}</span>${after}`;
            }
        }
    }

    return `<div class="cako-post-preview">${words.join(" ")}</div>`;
}

function showResults(results, query) {
    const searchResults = document.getElementById("cako-search-results");
    searchResults.innerHTML = "";

    const searchFeed = document.getElementById("cako-search-feed");
    searchFeed.style.display = "block";

    const postFeed = document.getElementById("cako-post-feed-outer");
    if (postFeed) {
        postFeed.style.display = "none";
    }

    const postFull = document.querySelector(".post-full");
    if (postFull) {
        postFull.style.display = "none";
    }

    for (const result of results) {
        const r = result.post;
        const d = new Date(r.published_at);

        const date = d.getDate();
        const month = d.getMonth();
        const monthName = MONTH_NAMES[month];
        const year = d.getFullYear();

        let preview = ``;

        if (result.strong !== undefined && result.strong.in === "html") {
            preview = formatPreview(result, query);
        }

        searchResults.insertAdjacentHTML("beforeend",
            `<div class="cako-post">
                <a class="cako-post-link" href="/${r.slug}/" onclick="onPostClicked(event)">
                    <div class="cako-post-title">${r.title}</div>
                    <div class="cako-post-date-outer">
                        <time class="cako-post-date">${date} ${monthName} ${year}</time>
                    </div>
                    </a>
                    ${preview}
            </div>`
        )
    }
}

function hideResults() {
    const searchFeed = document.getElementById("cako-search-feed");
    searchFeed.style.display = "none";

    const postFeed = document.getElementById("cako-post-feed-outer");
    if (postFeed) {
        postFeed.style.display = 'block';
    }

    const postFull = document.querySelector(".post-full");
    if (postFull) {
        postFull.style.display = "block";
    }
}

async function onSearchChange(value) {
    const clearIcon = document.getElementById("cako-search-clear");

    if (value.length < 1) {
        hideResults();
        clearIcon.style.display = "none";
        return;
    }

    clearIcon.style.display = "block";

    const results = await cakoSearch(value);

    showResults(results, value);
}

function clearSearch() {
    const searchElement = document.getElementById("cako-search");
    searchElement.value = "";

    hideResults();

    const clearIcon = document.getElementById("cako-search-clear");
    clearIcon.style.display = "none";

    focusSearch();
}

window.focusSearch = () => {
    const searchElement = document.getElementById("cako-search");

    searchElement.focus();
}

function getOrFetchPosts() {
    // remove ls from previous version
    localStorage.removeItem("posts");
    localStorage.removeItem("postsDate");

    return GHOST_POSTS;
}

function onKeyDown(e) {
    const searchResults = document.getElementById("cako-search-results");
    const firstResult = searchResults.querySelector(".cako-post-link");
    const searchFeed = document.getElementById("cako-search-feed");

    // if search shown and up or down pressed, prevent scrolling
    if (searchFeed.style.display === "block" &&
        (e.key == "ArrowUp" || e.key == "ArrowDown")) {
        e.preventDefault();
    }

    // if enter, attempt to navigate to first result
    if (e.key == "Enter") {
        if (firstResult) {
            firstResult.click();
            return;
        }
    }

    // ctrl + cmd + f to open search
    if (e.key.toLowerCase() == "f" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();

        if (toggleMenu) {
            toggleMenu();
        }

        focusSearch();

        return;
    }

    // escape closes menu
    if (e.key == "Escape") {
        if (closeMenu) {
            closeMenu();
        }

        return;
    }

    if (document.activeElement &&
        document.activeElement.classList.contains("cako-post-link")) {
        // already focused on a result
        const current = document.activeElement;

        if (e.key == "ArrowUp") {
            if (current && current.parentElement
                && current.parentElement.previousElementSibling) {
                const prev = current.parentElement.previousElementSibling;

                if (prev.children[0]) {
                    prev.children[0].focus();
                }
            } else {
                // currently at the top, focus back to search
                focusSearch();
            }
        } else if (e.key == "ArrowDown") {
            if (current && current.parentElement &&
                current.parentElement.nextElementSibling) {
                const next = current.parentElement.nextElementSibling;

                if (next.children[0]) {
                    next.children[0].focus();
                }
            }
        }
    } else if (e.key == "ArrowDown") {
        // down pressed, no result focused yet
        if (firstResult) {
            firstResult.focus();
        }
    }
}

(async () => {
    const searchElement = document.getElementById("cako-search");

    searchElement.addEventListener("focus", async () => {
        let prev = "";

        searchElement.addEventListener("input", (e) => {
            if (e.target.value !== prev) {
                prev = e.target.value;
                onSearchChange(e.target.value);
            }
        });
    });

    searchElement.addEventListener("keydown", (e) => {
        // prevents arrow left/right post navigation while
        // search is focused
        e.stopPropagation();
        onKeyDown(e);
    });
    document.addEventListener("keydown", onKeyDown);

    const searchClear = document.getElementById("cako-search-clear");
    searchClear.addEventListener("click", clearSearch);
})();
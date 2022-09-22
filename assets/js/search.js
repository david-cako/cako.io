const GHOST_API = new GhostContentAPI({
    url: "https://cako.io",
    key: "723c108685f2d6fba50c68a511",
    version: "v3"
});

let GHOST_POSTS;

window.clearSearch = () => {
    const searchElement = document.getElementById("cako-search");
    searchElement.value = "";

    clearResults();

    const clearIcon = document.getElementById("cako-search-clear");
    clearIcon.style.display = "none";
}

window.focusSearch = () => {
    const searchElement = document.getElementById("cako-search");

    searchElement.focus();
}

function normalizeString(s, lower) {
    if (lower) {
        s = s.toLowerCase();
    }

    return s.replace(/[&_|+\-\{\}\[\]\\\/]/gi, ' ')
        .replace(/[`()=?;:'"<>]/gi, '');
}

function tokenizeString(s, lower) {
    // replace special characters with spaces
    const normalized = normalizeString(s, lower);

    // split newQuery into words and add to tokens
    const tokens = normalized.split(" ").filter(t => t.length > 0);

    return tokens;
}

function stripHtmlTags(s) {
    return s.replace(/(<([^>]+)>)/gi, " ");
}

function containsNumber(myString) {
    return /\d/.test(myString);
}

function getTitleMatch(token, post) {
    const normalizedTitle = normalizeString(post.title, true);

    if (normalizedTitle.indexOf(token) !== -1) {
        return true
    } else if (isNumericMatch(token, normalizedTitle)) {
        return true;
    }

    return false;
}

function normalizeNumber(string) {
    return Number(string.replace(/[$%]/gi, "")).toLocaleString("en-US");
}

function removePunctuation(string) {
    return string.replace(/[$%,]/gi, "")
}

function isNumericMatch(token, string) {
    // check for number without punctuation
    const normalizedToken = removePunctuation(token)
    const normalizedString = removePunctuation(string);

    if (normalizedString.indexOf(normalizedToken) !== -1) {
        return true;
    }

    return false;
}

function getHtmlMatch(token, post) {
    const normalizedHtml = post.html ? normalizeString(post.html, true) : "";

    if (normalizedHtml.toLowerCase().indexOf(token) !== -1) {
        return true;
    } else if (isNumericMatch(token, normalizedHtml)) {
        return true;
    }

    return false;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function getDateMatch(token, post) {
    const publishDate = new Date(post.published_at);
    const publishDateStr = post.published_at.split("T")[0];

    const t = token.replace(/,/g, "");

    if (!isNaN(t)) {
        const tokenInt = parseInt(t);

        if (publishDate.getFullYear() === tokenInt) {
            return true;
        }

        if (publishDate.getDate() === tokenInt) {
            return true;
        }
    }

    const monthMatches = [];

    for (let i = 0; i < MONTH_NAMES.length; i++) {
        if (MONTH_NAMES[i].toLowerCase().indexOf(token.toLowerCase()) !== -1) {
            monthMatches.push({ month: MONTH_NAMES[i], numeric: String(i + 1).padStart(2, "0") });
        }
    }

    for (const m of monthMatches) {
        if (publishDateStr.indexOf(`-${m.numeric}-`) !== -1) {
            return true;
        }
    }

    return false;
}

// gets strong matches for sequential words in title/content
function getStrongTextMatch(matches, post, query) {
    const previewLength = 20;

    const htmlMatches = matches.filter(m => m.in == "html");
    const titleWords = post.title.toLowerCase().split(" ");
    const tokens = tokenizeString(query, true);

    let titleMatches = [];

    for (let i = 0; i < titleWords.length; i++) {
        const word = titleWords[i];

        for (const m of matches) {
            if (m.token !== undefined
                && m.token.length > 1
                && word.indexOf(m.token) !== -1
                && titleMatches.indexOf(word) === -1
            ) {
                titleMatches.push({ idx: i, word: word, token: m.token });
                break;
            }
        }
    }

    const tokensMatched = new Set(titleMatches.map(m => m.token)).size
    const charsMatched = titleMatches.reduce((prev, cur) => prev + cur.token.length, 0)
    const charsInSeq = titleMatches.reduce((prev, cur) => prev + cur.word.length, 0)

    if (tokensMatched / tokens.length > 0.7) {
        return {
            in: "title", preview: post.title,
            rank: 1.4 * ((tokensMatched / tokens.length) + (charsMatched / charsInSeq) + (charsMatched/post.title.length))
        };
    }

    if (htmlMatches.length > 0 && post.html) {
        const strippedHtml = stripHtmlTags(post.html);

        const htmlWords = strippedHtml.split(" ");

        let htmlMatchIdxs = [];

        for (let i = 0; i < htmlWords.length; i++) {
            const word = htmlWords[i];
            for (const m of matches) {
                if (m.token !== undefined
                    && m.token.length > 1
                    && (word.toLowerCase().indexOf(m.token) !== -1 || isNumericMatch(m.token, word) ||
                        normalizeString(word, true).indexOf(m.token) !== -1)
                    && htmlMatchIdxs.findIndex(m => m.idx == i) === -1
                ) {
                    htmlMatchIdxs.push({ idx: i, word: word, token: m.token });
                }
            }
        }

        if (htmlMatchIdxs.length < 1) {
            return;
        }

        htmlMatchIdxs.sort((a, b) => a.idx - b.idx);

        let sequential = [];
        let maxSequential = sequential;
        let prev;

        for (const m of htmlMatchIdxs) {
            if (prev === undefined || m.idx - 1 === prev.idx || m.idx === prev.idx) {
                sequential.push(m);
            } else {
                if (sequential.length >= maxSequential.length) {
                    maxSequential = sequential;
                }
                sequential = [m];
            }

            prev = m;
        }

        if (sequential.length >= maxSequential.length) {
            maxSequential = sequential;
        }

        // get surrounding text before returning sequential html match
        const matchIdxs = maxSequential.map(m => m.idx);
        const matchMin = Math.min(...matchIdxs);
        const matchMax = Math.max(...matchIdxs);

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

        const charsMatched = maxSequential.reduce((prev, cur) => prev + cur.token.length, 0)
        const charsInSeq = maxSequential.reduce((prev, cur) => prev + cur.word.length, 0)

        const tokensMatched = new Set(maxSequential.map(m => m.token)).size

        if (tokensMatched / tokens.length > 0.7) {
            return {
                in: "html", preview: preview,
                rank: (tokensMatched / tokens.length) + (charsMatched / charsInSeq),
                matches: htmlMatchIdxs
            };
        }
    }
}

let PREVIOUS_QUERY;
let PREVIOUS_RESULTS;

/** Match for title, content, and date on posts */
async function cakoSearch(query) {
    let posts;

    // if query contains previous query, search from previous results,
    // unless it contains a number.  date results are not idempotent due
    // to exact integer matching, and require a new full search.
    if (PREVIOUS_QUERY
        && normalizeString(query, true).indexOf(PREVIOUS_QUERY) !== -1
        && !containsNumber(query)) {
        posts = PREVIOUS_RESULTS;
    } else {
        posts = await getOrFetchPosts();
    }

    const tokens = tokenizeString(query, true);

    const results = [];

    for (const p of posts) {
        let matches = [];

        for (const t of tokens) {
            if (getTitleMatch(t, p)) {
                matches.push({ in: "title", token: t });
            } else if (getDateMatch(t, p)) {
                matches.push({ in: "date" });
            } else if (getHtmlMatch(t, p)) {
                matches.push({ in: "html", token: t });
            }
        }

        if (matches.filter(m => m.in === "date").length >= tokens.length) {
            results.push({
                post: p,
                strong: {
                    in: "date",
                    rank: 3
                }
            });
        } else if (matches.length == tokens.length ||
            matches.length > 2 && matches.length / tokens.length >= .7) {
            const strong = getStrongTextMatch(matches, p, query);
            results.push({ post: p, strong: strong });
        }
    }

    PREVIOUS_RESULTS = results.map(r => r.post);
    PREVIOUS_QUERY = normalizeString(query, true);

    const sorted = results.sort((a, b) => {
        const aVal = a.strong !== undefined
            ? a.strong.rank
            : 0;
        const bVal = b.strong !== undefined
            ? b.strong.rank
            : 0;

        return bVal - aVal;
    });

    return sorted;
}

function formatPreview(result, query) {
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

function clearResults() {
    const searchFeed = document.getElementById("cako-search-feed");
    searchFeed.style.display = "none";

    const searchResults = document.getElementById("cako-search-results");
    searchResults.innerHTML = "";

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
        clearResults();
        clearIcon.style.display = "none";
        return;
    }

    clearIcon.style.display = "block";

    const results = await cakoSearch(value);

    showResults(results, value);
}

function getOrFetchPosts() {
    if (!GHOST_POSTS) {
        GHOST_POSTS = GHOST_API.posts.browse({
            limit: "all",
            fields: "title,html,published_at,slug",
            include: "tags"
        });
    }

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

    // cmd/ctrl + shift + f to open search
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
        getOrFetchPosts();
    });

    let prev = "";

    let inputTimeout;

    searchElement.addEventListener("input", (e) => {
        if (e.target.value !== prev) {
            prev = e.target.value;

            if (inputTimeout) {
                clearTimeout(inputTimeout);
            }

            inputTimeout = setTimeout(() => {
                inputTimeout = undefined;
                onSearchChange(e.target.value);
            }, 200);
        }
    });

    searchElement.addEventListener("keydown", (e) => {
        // prevents arrow left/right post navigation while
        // search is focused
        e.stopPropagation();
        onKeyDown(e);
    });
    document.addEventListener("keydown", onKeyDown);

    const searchClear = document.getElementById("cako-search-clear");
    searchClear.addEventListener("click", () => {
        clearSearch();
        focusSearch();
    });
})();
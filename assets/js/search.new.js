import { Api } from "./api.js";

const GHOST_API = new GhostContentAPI({
    url: "https://cako.io",
    key: "723c108685f2d6fba50c68a511",
    version: "v3"
});

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

class CakoSearch {
    /** Populated on input focus with all posts from Ghost API. */
    posts;

    /** Updates from this.search() after successful query. */
    previousQuery = "";
    previousResults;

    /** Position in document from when search is hidden. */
    contentScrollPosition;

    inputThrottleTimeout;
    inputThrottleTime = 100;

    searchIsShown = false;

    searchElement = document.getElementById("cako-search");
    clearIcon = document.getElementById("cako-search-clear");
    searchClear = document.getElementById("cako-search-clear");
    searchResults = document.getElementById("cako-search-results");
    searchFeed = document.getElementById("cako-search-feed");
    postFeed = document.getElementById("cako-post-feed-outer");
    postContent = document.querySelector(".post-full");

    get focusedResult() {
        if (document.activeElement &&
            document.activeElement.classList.contains("cako-post-link")) {
            return document.activeElement;
        }
    }

    constructor() {
        searchElement.addEventListener("focus", () => {
            this.getOrFetchPosts();
        });

        searchElement.addEventListener("input", this.onInput);

        searchElement.addEventListener("keydown", (e) => {
            // prevents arrow left/right post navigation while
            // search is focused
            e.stopPropagation();
            this.onKeyDown(e);
        });
        document.addEventListener("keydown", this.onKeyDown);

        searchClear.addEventListener("click", () => {
            this.clearSearch();
            this.focusSearch();
        });

        document.addEventListener("scroll", this.onScroll);
    }

    /** Match for title, content, and date on posts */
    async search(query) {
        let posts;

        /** If query contains previous query, search from previous results,
         * unless it contains a number.
         * 
         * Date results are not idempotent due to exact integer matching, 
         * and require a new full search. */
        if (this.previousQuery
            && normalizeString(query, true).indexOf(this.previousQuery) !== -1
            && !containsNumber(query)) {
            posts = this.previousResults;
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
            } else if (matches.length > 0 && matches.length / tokens.length >= .6) {
                const strong = getStrongTextMatch(matches, p, query);
                results.push({ post: p, strong: strong });
            }
        }

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

    /** Resolves all posts from Ghost API. */
    async getOrFetchPosts() {
        if (!this.posts) {
            this.posts = await Api.getPosts("all", 1, { includeBody: true });
        }

        return this.posts;
    }

    /** Gets match in HTML content for token and post. */
    getHtmlMatch(token, post) {
        const normalizedHtml = post.html ? normalizeString(post.html, true) : "";

        if (normalizedHtml.toLowerCase().indexOf(token) !== -1) {
            return true;
        } else if (isNumericMatch(token, normalizedHtml)) {
            return true;
        }

        return false;
    }

    /** Gets match in title for token and post. */
    getTitleMatch(token, post) {
        const normalizedTitle = normalizeString(post.title, true);

        if (normalizedTitle.indexOf(token) !== -1) {
            return true
        } else if (isNumericMatch(token, normalizedTitle)) {
            return true;
        }

        return false;
    }

    /** Gets match in date for token and post. */
    getDateMatch(token, post) {
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

    /** Checks for match with numeric separators removed. */
    isNumericMatch(token, string) {
        // check for number without punctuation
        const normalizedToken = removePunctuation(token)
        const normalizedString = removePunctuation(string);

        if (normalizedString.indexOf(normalizedToken) !== -1) {
            return true;
        }

        return false;
    }

    /** Gets strong matches for sequential words in title/content. */
    getStrongTextMatch(matches, post, query) {
        const previewLength = 42;

        const htmlMatches = matches.filter(m => m.in == "html");
        const titleWords = post.title.toLowerCase().split(" ");
        const tokens = tokenizeString(query, true);

        let titleMatches = [];

        for (let i = 0; i < titleWords.length; i++) {
            const word = titleWords[i];

            for (const m of matches) {
                if (m.token !== undefined
                    && m.token.length > 1
                    && (word.indexOf(m.token) !== -1 ||
                        normalizeString(word, true).indexOf(m.token) !== -1)
                    && titleMatches.indexOf(word) === -1
                ) {
                    titleMatches.push({ idx: i, word: word, token: m.token });
                    break;
                }
            }
        }

        const tokensMatched = new Set(titleMatches.map(m => m.token)).size
        const charsMatched = titleMatches.reduce((prev, cur) => prev + cur.token.length, 0)

        if (tokensMatched / tokens.length > 0.7 || charsMatched / post.title.length > 0.7) {
            return {
                in: "title", preview: post.title,
                rank: 1.4 * ((tokensMatched / tokens.length) + (charsMatched / post.title.length))
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

            return {
                in: "html", preview: preview,
                rank: (tokensMatched / tokens.length) + (charsMatched / charsInSeq),
                matches: htmlMatchIdxs
            };
        }
    }

    showResults(results) {
        this.searchIsShown = true;

        this.searchResults.innerHTML = "";
        this.searchFeed.style.display = "block";

        if (this.postFeed) {
            this.postFeed.style.display = "none";
        }

        if (this.postContent) {
            this.postContent.style.display = "none";
        }

        for (const result of results) {
            const resultHtml = generateResultHTML(result);

            this.searchResults.insertAdjacentHTML("beforeend", resultHtml);
        }
    }

    clearResults() {
        this.previousResults = undefined;

        searchFeed.style.display = "none";
        searchResults.innerHTML = "";

        if (postFeed) {
            postFeed.style.display = 'block';
        }

        if (this.postContent) {
            this.postContent.style.display = "block";
        }

        window.scrollTo({ top: CONTENT_SCROLL_POSITION });

        this.searchIsShown = false;
    }

    focusSearch() {
        this.searchElement.focus();
    }

    clearSearch() {
        this.searchElement.value = "";
        this.previousQuery = "";
        this.clearResults();
        this.clearIcon.style.display = "none";
    }

    onScroll = () => {
        if (!this.searchIsShown) {
            this.contentScrollPosition = window.scrollY;
        }
    }

    onInput = (e) => {
        if (this.inputThrottleTimeout) {
            clearTimeout(this.inputThrottleTimeout);
        }

        this.inputThrottleTimeout = setTimeout(() => {
            this.inputThrottleTimeout = undefined;
            onSearchChange(e.target.value);
        }, this.inputThrottleTime);
    }

    onSearchChange = async (value) => {
        if (value.length < 1) {
            this.previousQuery = "";
            this.clearResults();
            this.clearIcon.style.display = "none";

            return;
        }

        clearIcon.style.display = "block";

        const searchWasShown = this.searchIsShown;

        const results = await this.search(value);
        this.showResults(results);

        // Scroll to top on initial transition to search results.
        if (!searchWasShown) {
            window.scrollTo({ top: 0 });
        }

        this.previousResults = results.map(r => r.post);
        this.previousQuery = normalizeString(value, true);
    }

    onKeyDown = (e) => {
        const firstResult = searchResults.querySelector(".cako-post-link");

        // if search shown and up or down pressed, prevent scrolling
        if (this.searchFeed.style.display === "block" &&
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

            this.focusSearch();

            return;
        }

        // escape closes menu
        if (e.key == "Escape") {
            if (closeMenu) {
                closeMenu();
            }

            return;
        }

        if (this.focusedResult) {
            const current = this.focusedResult;

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
}

function normalizeString(s, lower) {
    if (lower) {
        s = s.toLowerCase();
    }

    return s.replace(/[&_|+\-\{\}\[\]\\\/]/gi, ' ')
        .replace(/[`()=?;:'"<>]/gi, '');
}

/** Returns array of normalized tokens for string. */
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


function normalizeNumber(string) {
    return Number(string.replace(/[$%]/gi, "")).toLocaleString("en-US");
}

function removePunctuation(string) {
    return string.replace(/[$%,]/gi, "")
}

function generatePreviewHTML(result) {
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

function generateResultHTML(result) {
    const r = result.post;
    const d = new Date(r.published_at);

    const date = d.getDate();
    const month = d.getMonth();
    const monthName = MONTH_NAMES[month];
    const year = d.getFullYear();

    let preview = ``;

    if (result.strong !== undefined && result.strong.in === "html") {
        preview = generatePreviewHTML(result);
    }

    return `<div class="cako-post">
        <a class="cako-post-link" href="/${r.slug}/" onclick="onPostClicked(event)">
            <div class="cako-post-title">${r.title}</div>
            <div class="cako-post-date-outer">
                <time class="cako-post-date">${date} ${monthName} ${year}</time>
            </div>
            </a>
            ${preview}
    </div>`
}


(async () => {
    window.CakoSearch = new CakoSearch();
})();
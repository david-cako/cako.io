import Api from "Api";
import Html from "Html";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default class Search {
    api;
    /** Dynamically populated with posts from API. */
    posts = [];
    /**  Promise resolving when all posts are loaded from API. */
    postsLoadingComplete;
    /** Array of functions subscribed to API post results.  */
    postCallbacks = [];
    /** Retry count for posts request. */
    maxRetries = 10;
    /** Updates from this.search() after successful query. */
    previousQuery = "";
    previousResults;
    currentQuery = "";
    /** Position in document from when search is hidden. */
    contentScrollPosition;
    inputThrottleTimeout;
    inputThrottleTime = 100;

    /** Array of callbacks to be called when search is shown. */
    searchShownCallbacks = [];

    static shown = false;

    static searchElement = document.getElementById("cako-search");
    static clearIcon = document.getElementById("cako-search-clear");
    static searchHeader = document.getElementById("cako-search-header");
    static searchResults = document.getElementById("cako-search-results");
    static searchInner = document.getElementById("search-inner");
    static searchStatusElem = document.getElementById("search-status");
    static postFeed = document.getElementById("cako-post-feed-outer");
    static postContent = document.querySelector(".post-full");

    get focusedResult() {
        if (document.activeElement &&
            document.activeElement.classList.contains("cako-post-link")) {
            return document.activeElement;
        }
    }

    constructor() {
        this.api = new Api();

        window.Search = Search;

        this.fetchPosts();

        Search.searchElement.addEventListener("input", this.onInput);

        document.addEventListener("keydown", this.onKeyDown);

        Search.clearIcon.addEventListener("click", () => {
            this.clear();
            Search.focus();
        });

        document.addEventListener("scroll", this.onScroll);
    }

    async fetchPosts() {
        this.postsLoadingComplete = (async () => {
            let more = true;

            while (more) {
                const posts = await this.api.getNextPage();

                if (posts) {
                    this.posts = this.posts.concat(posts);
                    this.callPostCallbacks(posts);
                } else {
                    more = false;
                }
            }
        })();
    }

    /** Match for title, content, and date on posts */
    async search(query) {
        let posts;

        /** If query contains previous query, search from previous results,
         * unless it contains a number.
         * 
         * Date results are not idempotent due to exact integer matching, 
         * and require a new full search. */
        if (this.previousQuery && this.previousResults
            && normalizeString(query, true).indexOf(this.previousQuery) !== -1
            && !containsNumber(query)) {
            posts = this.previousResults;
        } else {
            posts = this.posts.slice();
        }

        let results = [];

        const callback = (posts) => {
            if (this.currentQuery !== query) {
                return;
            }

            const r = Search.search(posts, query);

            results = results.concat(r);
            results = Search.sortResults(results);

            this.showResults(results);
            Search.updateStatus({ searching: true })
        }

        callback(posts);

        this.onPosts(callback);
        await this.postsLoadingComplete;
        this.offPosts(callback);

        if (this.currentQuery !== query) {
            return;
        }

        this.previousResults = results.map(r => r.post);

        return results;
    }


    showSearch() {
        Search.shown = true;

        this.callSearchShownCallbacks();
    }

    /* Clears search input, results, and hides search feed. */
    hideSearch() {
        this.clear();

        Search.shown = false;
    }


    showResults(results) {
        Search.searchResults.innerHTML = "";

        for (const result of results) {
            const resultElem = Html.generatePostLink(result.post, {
                searchResult: result
            });

            Search.searchResults.append(resultElem);
        }
    }

    /** Clears search input and results. */
    clear() {
        Search.searchElement.value = "";
        this.previousQuery = "";
        this.previousResults = undefined;
        Search.searchResults.innerHTML = "";
        Search.clearIcon.style.display = "none";
    }


    onScroll = () => {
        if (!Search.shown) {
            this.contentScrollPosition = window.scrollY;
        }
    }

    onInput = (e) => {
        if (this.inputThrottleTimeout) {
            clearTimeout(this.inputThrottleTimeout);
        }

        this.inputThrottleTimeout = setTimeout(() => {
            this.inputThrottleTimeout = undefined;
            this.onSearchChange(e.target.value);
        }, this.inputThrottleTime);
    }

    onSearchChange = async (value) => {
        if (value.length < 1) {
            this.clear();

            return;
        }

        this.currentQuery = value;

        Search.clearIcon.style.display = "block";

        if (!Search.shown) {
            this.showSearch();
        }

        Search.searchResults.innerHTML = "";

        let results;

        try {
            results = await this.search(value);
        } catch (e) {
            Search.updateStatus({ error: e });
            console.log(e);
            throw e;
        }

        // Search returned without results because currentQuery has changed
        if (results === undefined) {
            return;
        }

        if (Search.shown) {
            Search.updateStatus({ results: results });

            window.scrollTo({ top: 0 });

            this.previousQuery = normalizeString(value, true);
        }
    }

    onKeyDown = (e) => {
        const firstResult = Search.searchResults.querySelector(".cako-post-link");

        const hasModifier = e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;

        // if search shown and up or down pressed, prevent scrolling
        if (Search.shown && !hasModifier &&
            (e.key == "ArrowUp" || e.key == "ArrowDown")) {
            e.preventDefault();
        }

        // if enter, attempt to navigate to first result
        if (e.key == "Enter") {
            if (this.focusedResult) {
                this.focusedResult.click();
            } else if (firstResult) {
                firstResult.click();
            }
        }

        if (this.focusedResult) {
            const current = this.focusedResult;

            if (e.key == "ArrowUp" && !hasModifier) {
                if (current && current.parentElement
                    && current.parentElement.previousElementSibling) {
                    const prev = current.parentElement.previousElementSibling;

                    if (prev.children[0]) {
                        prev.children[0].focus();
                    }
                } else {
                    // currently at the top, focus back to search
                    Search.focus();
                }
            } else if (e.key == "ArrowDown" && !hasModifier) {
                if (current && current.parentElement &&
                    current.parentElement.nextElementSibling) {
                    const next = current.parentElement.nextElementSibling;

                    if (next.children[0]) {
                        next.children[0].focus();
                    }
                }
            }
        } else if (e.key == "ArrowDown" && !hasModifier) {
            // down pressed, no result focused yet
            if (firstResult) {
                firstResult.focus();
            }
        }
    }

    /** Add callback for new posts received from API. */
    onPosts(fn) {
        this.postCallbacks.push(fn);
    }

    /** Remove callback for new posts received from API. */
    offPosts(fn) {
        this.postCallbacks = this.postCallbacks.filter(c => c != fn);
    }

    callPostCallbacks(posts) {
        for (const fn of this.postCallbacks) {
            fn(posts);
        }
    }

    onSearchShown(fn) {
        this.searchShownCallbacks.push(fn);
    }

    offSearchShown(fn) {
        this.searchShownCallbacks = this.searchShownCallbacks.filter(c => c != fn);
    }

    callSearchShownCallbacks() {
        for (const fn of this.searchShownCallbacks) {
            fn();
        }
    }

    static search(posts, query) {
        const results = [];

        const tokens = tokenizeString(query, true);

        for (const p of posts) {
            let matches = [];

            for (const t of tokens) {
                if (Search.getTitleMatch(t, p)) {
                    matches.push({ in: "title", token: t });
                } else if (Search.getDateMatch(t, p)) {
                    matches.push({ in: "date" });
                } else if (Search.getHtmlMatch(t, p)) {
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
                const strong = Search.getStrongTextMatch(matches, p, query);
                results.push({ post: p, strong: strong });
            }
        }

        return results;
    }

    static focus() {
        Search.searchElement.focus();
    }

    static updateStatus({ searching, results, error } = {}) {
        if (error) {
            Search.searchHeader.innerText = "Search";
            Search.searchStatusElem.innerText = `Could not load results.`
            Search.searchStatusElem.className = "error";
            Search.searchStatusElem.style.display = "block";
        } else if (results) {
            Search.searchHeader.innerText = "Search";

            if (results.length === 0) {
                Search.searchStatusElem.innerText = "No results found.";
                Search.searchStatusElem.style.display = "block";
            } else {
                Search.searchStatusElem.innerText = "";
                Search.searchStatusElem.style.display = "none";
            }
        } else if (searching) {
            Search.searchHeader.innerText = "Searching...";

            Search.searchStatusElem.innerText = "";
            Search.searchStatusElem.style.display = "none";
        } else {
            Search.searchHeader.innerText = "Search";

            Search.searchStatusElem.innerText = "";
            Search.searchStatusElem.style.display = "none";
        }
    }

    static sortResults(results) {
        return results.sort((a, b) => {
            const aVal = a.strong !== undefined
                ? a.strong.rank
                : 0;
            const bVal = b.strong !== undefined
                ? b.strong.rank
                : 0;

            return bVal - aVal;
        });
    }

    /** Gets match in HTML content for token and post. */
    static getHtmlMatch(token, post) {
        const normalizedHtml = post.html ? normalizeString(post.html, true) : "";

        if (normalizedHtml.toLowerCase().indexOf(token) !== -1) {
            return true;
        } else if (Search.isNumericMatch(token, normalizedHtml)) {
            return true;
        }

        return false;
    }

    /** Gets match in title for token and post. */
    static getTitleMatch(token, post) {
        const normalizedTitle = normalizeString(post.title, true);

        if (normalizedTitle.indexOf(token) !== -1) {
            return true
        } else if (Search.isNumericMatch(token, normalizedTitle)) {
            return true;
        }

        return false;
    }

    /** Gets match in date for token and post. */
    static getDateMatch(token, post) {
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
    static isNumericMatch(token, string) {
        // check for number without punctuation
        const normalizedToken = removePunctuation(token)
        const normalizedString = removePunctuation(string);

        if (normalizedString.indexOf(normalizedToken) !== -1) {
            return true;
        }

        return false;
    }

    /** Gets strong matches for sequential words in title/content. */
    static getStrongTextMatch(matches, post, query) {
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
                        && (word.toLowerCase().indexOf(m.token) !== -1 ||
                            Search.isNumericMatch(m.token, word) ||
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
(function() {
    "use strict";

    let _data = null;
    let _currentPath = null;
    const DATA_URL = "/data/data.json";
    const REFRESH_INTERVAL = 30 * 60 * 1000;
    const CARD_SLUGS = ["cry-meter", "villain", "tragic-hero", "tribunal"];

    function formatNumber(n) {
        return n.toLocaleString("en-US");
    }

    function formatDate(isoString) {
        const d = new Date(isoString);
        return d.toLocaleDateString("en-US", {
            timeZone: "America/New_York",
            month: "long", day: "numeric", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        }) + " ET";
    }

    function animateCounter(element, target, duration = 1000) {
        const start = performance.now();
        const startVal = 0;
        function step(timestamp) {
            const progress = Math.min((timestamp - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            element.textContent = Math.round(startVal + (target - startVal) * eased);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function typeWriter(element, text, delayMs = 20) {
        element.textContent = "";
        let i = 0;
        return new Promise(function(resolve) {
            function type() {
                if (i < text.length) {
                    element.textContent += text[i];
                    i++;
                    setTimeout(type, delayMs);
                } else {
                    resolve();
                }
            }
            type();
        });
    }

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            const el = document.createElement("textarea");
            el.value = text;
            el.style.position = "fixed";
            el.style.opacity = "0";
            document.body.appendChild(el);
            el.select();
            const success = document.execCommand("copy");
            document.body.removeChild(el);
            return success;
        }
    }

    function getVoteLStorageKey() {
        if (!_data) return "tribunal_votes_fallback";
        return "tribunal_votes_" + (_data.meta.lastUpdated || "").substring(0, 10);
    }

    function getStoredVote() {
        try {
            const raw = localStorage.getItem(getVoteLStorageKey());
            if (!raw) return { voted: false, choice: null };
            return JSON.parse(raw);
        } catch { return { voted: false, choice: null }; }
    }

    function storeVote(choice) {
        try {
            localStorage.setItem(getVoteLStorageKey(), JSON.stringify({ voted: true, choice: choice }));
        } catch(e) { console.warn("localStorage unavailable", e); }
    }

    async function fetchData(attempt = 1) {
        try {
            const res = await fetch(DATA_URL + "?v=" + Date.now(), { cache: "no-store" });
            if (!res.ok) throw new Error("HTTP " + res.status);
            _data = await res.json();
            return _data;
        } catch (err) {
            if (attempt < 3) {
                await new Promise(function(r) { setTimeout(r, attempt * 2000); });
                return fetchData(attempt + 1);
            }
            throw err;
        }
    }

    async function refreshData() {
        try {
            await fetchData();
            router();
        } catch(e) {
            console.warn("Auto-refresh failed:", e);
        }
    }

    function updateMeta(title, description, ogImagePath) {
        document.title = title + " | Mundial Drama Pulse";
        const descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) descMeta.setAttribute("content", description);
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute("content", title);
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute("content", description);
        const ogImg = document.querySelector('meta[property="og:image"]');
        if (ogImg) ogImg.setAttribute("content", ogImagePath);
    }

    function renderSkeleton() {
        const app = document.getElementById("app");
        app.innerHTML = `
            <div class="skeleton-grid">
                ${"".padEnd(4).split("").map(function() {
                    return `
                        <div class="skeleton-card">
                            <div class="skeleton-block skeleton-title"></div>
                            <div class="skeleton-block skeleton-text"></div>
                            <div class="skeleton-block skeleton-text short"></div>
                            <div class="skeleton-block skeleton-bar"></div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    function renderError(message) {
        const app = document.getElementById("app");
        app.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h2>Drama Feed Offline</h2>
                <p>${message}</p>
                <button onclick="window.location.reload()" class="btn btn-primary">
                    Retry
                </button>
            </div>
        `;
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function renderHome(data) {
        updateMeta("Mundial Drama Pulse",
            "Track the hottest World Cup 2026 drama, villains, and controversies as seen from the US & Canada.",
            "/og-images/cry-meter.png");

        const storedVote = getStoredVote();
        const t = data.tribunal;
        const totalVotes = t.totalMockVotes;
        const pctA = storedVote.voted && storedVote.choice === "A"
            ? ((t.sideA.mockVotes + 1) / (totalVotes + 1) * 100).toFixed(1)
            : t.sideA.percentage;
        const pctB = storedVote.voted && storedVote.choice === "B"
            ? ((t.sideB.mockVotes + 1) / (totalVotes + 1) * 100).toFixed(1)
            : t.sideB.percentage;

        const app = document.getElementById("app");
        app.innerHTML = `
            <header class="site-header">
                <div class="header-eyebrow">🌍 WORLD CUP 2026 · US & CANADA EDITION</div>
                <h1 class="site-title">MUNDIAL <span class="accent">DRAMA</span> PULSE</h1>
                <p class="site-subtitle">Tracking the chaos · Updated every 6 hours</p>
                <p class="last-updated">Last update: ${formatDate(data.meta.lastUpdated)}</p>
            </header>

            <div class="cards-grid">

                <article class="drama-card card-cry" onclick="navigate('/card/cry-meter')" role="button" tabindex="0">
                    <div class="card-label">😭 THE CRY-METER</div>
                    <div class="card-score-display">
                        <span class="score-number" id="home-cry-score">0</span>
                        <span class="score-unit">/100</span>
                    </div>
                    <p class="card-headline">${escapeHtml(data.cryMeter.headline)}</p>
                    <div class="trending-pills">
                        ${data.cryMeter.trending.slice(0,3).map(function(t) {
                            return `<span class="pill pill-cyan">${escapeHtml(t)}</span>`;
                        }).join("")}
                    </div>
                    <div class="card-cta">View Full Drama →</div>
                </article>

                <article class="drama-card card-villain" onclick="navigate('/card/villain')" role="button" tabindex="0">
                    <div class="card-label">👿 VILLAIN OF THE DAY</div>
                    <h2 class="villain-name">${escapeHtml(data.villain.name)}</h2>
                    <div class="role-badge">${data.villain.role.toUpperCase()}</div>
                    <div class="heat-section">
                        <span class="heat-label">🔥 HEAT</span>
                        <div class="progress-track">
                            <div class="progress-fill fill-red" style="width: ${data.villain.heatScore}%"></div>
                        </div>
                        <span class="heat-value">${data.villain.heatScore}</span>
                    </div>
                    <p class="card-reason">${escapeHtml(data.villain.reason.substring(0, 100))}...</p>
                    <div class="card-cta">See the Carnage →</div>
                </article>

                <article class="drama-card card-hero" onclick="navigate('/card/tragic-hero')" role="button" tabindex="0">
                    <div class="card-label">💔 THE TRAGIC HERO</div>
                    <h2 class="hero-name">${escapeHtml(data.tragicHero.name)}</h2>
                    <div class="team-name">${escapeHtml(data.tragicHero.team)}</div>
                    <div class="hearts-row">
                        ${Array.from({length:10}, function(_,i) {
                            return `<span class="heart ${i < Math.round(data.tragicHero.sympathyScore/10) ? 'heart-filled' : 'heart-empty'}">♥</span>`;
                        }).join("")}
                    </div>
                    <p class="sympathy-score">Sympathy: ${data.tragicHero.sympathyScore}/100</p>
                    <div class="card-cta">Feel the Pain →</div>
                </article>

                <article class="drama-card card-tribunal" id="home-tribunal">
                    <div class="card-label">⚖️ THE DAILY TRIBUNAL</div>
                    <p class="tribunal-question">${escapeHtml(t.question)}</p>
                    <div class="vote-section">
                        <div class="vote-side side-a">
                            <div class="vote-label">${escapeHtml(t.sideA.label)}</div>
                            <div class="vote-bar-wrap">
                                <div class="vote-bar bar-a" id="home-bar-a" style="width: ${pctA}%"></div>
                            </div>
                            <div class="vote-pct" id="home-pct-a">${pctA}%</div>
                            ${!storedVote.voted ? `<button class="vote-btn btn-a" data-choice="A" data-scope="home">VOTE</button>` :
                              storedVote.choice === "A" ? `<div class="voted-badge">✓ YOUR VOTE</div>` : ""}
                        </div>
                        <div class="vote-vs">VS</div>
                        <div class="vote-side side-b">
                            <div class="vote-label">${escapeHtml(t.sideB.label)}</div>
                            <div class="vote-bar-wrap">
                                <div class="vote-bar bar-b" id="home-bar-b" style="width: ${pctB}%"></div>
                            </div>
                            <div class="vote-pct" id="home-pct-b">${pctB}%</div>
                            ${!storedVote.voted ? `<button class="vote-btn btn-b" data-choice="B" data-scope="home">VOTE</button>` :
                              storedVote.choice === "B" ? `<div class="voted-badge">✓ YOUR VOTE</div>` : ""}
                        </div>
                    </div>
                    <p class="total-votes">Community Votes: ${formatNumber(totalVotes)}</p>
                    <a href="/card/tribunal" class="card-cta" onclick="event.stopPropagation(); navigate('/card/tribunal'); return false;">
                        Full Tribunal →
                    </a>
                </article>

            </div>
            <footer class="site-footer">
                <p>Mundial Drama Pulse · Data refreshes every 6 hours · Targeting US & Canada fans</p>
            </footer>
        `;

        const scoreEl = document.getElementById("home-cry-score");
        if (scoreEl) animateCounter(scoreEl, data.cryMeter.overallWhineScore, 1200);
    }

    function renderCryMeter(data) {
        updateMeta("The Cry-Meter", data.cryMeter.headline, "/og-images/cry-meter.png");
        const app = document.getElementById("app");
        app.innerHTML = `
            <div class="detail-view">
                <button class="back-btn" onclick="navigate('/')">← Back to Pulse</button>
                <div class="detail-header">
                    <div class="detail-label">😭 THE CRY-METER</div>
                    <h1 class="detail-title">${escapeHtml(data.cryMeter.headline)}</h1>
                    <p class="detail-meta">Updated: ${formatDate(data.meta.lastUpdated)}</p>
                </div>

                <div class="score-hero">
                    <div class="score-huge" id="detail-cry-score">0</div>
                    <div class="score-label">OVERALL WHINE SCORE<br><span class="score-sub">Out of 100 drama points</span></div>
                </div>

                <section class="detail-section">
                    <h2 class="section-title">Top Complainers This Cycle</h2>
                    <div class="cryers-list">
                        ${data.cryMeter.topCryers.map(function(cryer, idx) {
                            return `
                                <div class="cryer-item">
                                    <div class="cryer-rank">#${idx + 1}</div>
                                    <div class="cryer-info">
                                        <div class="cryer-name">${cryer.flag} ${escapeHtml(cryer.name)}</div>
                                        <div class="cryer-complaint">${escapeHtml(cryer.complaint)}</div>
                                        <div class="cryer-bar-wrap">
                                            <div class="cryer-bar" style="width: 0%" data-target="${cryer.score}"></div>
                                        </div>
                                    </div>
                                    <div class="cryer-score cyan-text">${cryer.score}</div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </section>

                <section class="detail-section">
                    <h2 class="section-title">Trending Gripes</h2>
                    <div class="pills-container">
                        ${data.cryMeter.trending.map(function(t) {
                            return `<span class="pill pill-cyan pill-lg">${escapeHtml(t)}</span>`;
                        }).join("")}
                    </div>
                </section>

                <div class="og-preview">
                    <h3>Share This Card</h3>
                    <img src="/og-images/cry-meter.png" alt="Cry Meter OG" class="og-image-preview" loading="lazy">
                    <button class="btn btn-secondary" onclick="copyToClipboard(window.location.href).then(function() { this.textContent = 'Copied! ✓'; }.bind(this))">
                        Copy Link
                    </button>
                </div>
            </div>
        `;

        animateCounter(document.getElementById("detail-cry-score"), data.cryMeter.overallWhineScore, 1200);

        setTimeout(function() {
            document.querySelectorAll(".cryer-bar").forEach(function(bar) {
                const target = bar.getAttribute("data-target");
                bar.style.transition = "width 1s ease-out";
                bar.style.width = target + "%";
            });
        }, 100);
    }

    function renderVillain(data) {
        updateMeta("👿 " + data.villain.name + " — Villain of the Day", data.villain.reason, "/og-images/villain.png");
        const app = document.getElementById("app");
        app.innerHTML = `
            <div class="detail-view villain-view">
                <button class="back-btn" onclick="navigate('/')">← Back to Pulse</button>
                <div class="detail-header">
                    <div class="detail-label">👿 VILLAIN OF THE DAY</div>
                    <h1 class="detail-title villain-title">${escapeHtml(data.villain.name)}</h1>
                    <span class="role-badge role-badge-lg">${data.villain.role.toUpperCase()}</span>
                </div>

                <div class="heat-hero">
                    <div class="heat-hero-label">🔥 HEAT SCORE</div>
                    <div class="heat-bar-large-wrap">
                        <div class="heat-bar-large" id="villain-heat-bar" style="width: 0%"></div>
                    </div>
                    <div class="heat-score-display">
                        <span id="villain-heat-val">0</span><span class="heat-max">/100</span>
                    </div>
                </div>

                <section class="detail-section">
                    <h2 class="section-title">Why The Hate?</h2>
                    <p class="villain-reason">${escapeHtml(data.villain.reason)}</p>
                    <div class="source-count">
                        📊 Mentioned in <strong>${formatNumber(data.villain.sourceCount)}</strong> posts across Reddit
                    </div>
                </section>

                <section class="detail-section">
                    <h2 class="section-title">Most Viral Take</h2>
                    <blockquote class="slander-quote">
                        <span class="quote-mark">"</span>${escapeHtml(data.villain.topSlander)}<<span class="quote-mark">"</span>
                    </blockquote>
                </section>

                <div class="action-buttons">
                    <button class="btn btn-danger" onclick="copyToClipboard('${escapeHtml(data.villain.name)} is today\\'s World Cup Villain! ' + window.location.href).then(function() { this.textContent = 'Shared! 😈'; }.bind(this))">
                        📢 SHARE THE SHAME
                    </button>
                </div>

                <div class="og-preview">
                    <img src="/og-images/villain.png" alt="Villain OG" class="og-image-preview" loading="lazy">
                </div>
            </div>
        `;

        setTimeout(function() {
            const bar = document.getElementById("villain-heat-bar");
            if (bar) { bar.style.transition = "width 1.2s ease-out"; bar.style.width = data.villain.heatScore + "%"; }
            animateCounter(document.getElementById("villain-heat-val"), data.villain.heatScore, 1200);
        }, 150);
    }

    function renderTragicHero(data) {
        updateMeta("💔 " + data.tragicHero.name + " — The Tragic Hero", data.tragicHero.story.substring(0,160), "/og-images/tragic-hero.png");
        const filled = Math.round(data.tragicHero.sympathyScore / 10);
        const app = document.getElementById("app");
        app.innerHTML = `
            <div class="detail-view hero-view">
                <button class="back-btn" onclick="navigate('/')">← Back to Pulse</button>
                <div class="detail-header">
                    <div class="detail-label">💔 THE TRAGIC HERO</div>
                    <h1 class="detail-title hero-title">${escapeHtml(data.tragicHero.name)}</h1>
                    <div class="hero-team">${escapeHtml(data.tragicHero.team)}</div>
                </div>

                <div class="sympathy-hero">
                    <div class="hearts-large">
                        ${Array.from({length:10}, function(_,i) {
                            return `<span class="heart-lg ${i < filled ? 'heart-gold' : 'heart-dim'}">♥</span>`;
                        }).join("")}
                    </div>
                    <div class="sympathy-label">SYMPATHY SCORE: <strong>${data.tragicHero.sympathyScore}/100</strong></div>
                </div>

                <section class="detail-section">
                    <h2 class="section-title">The Story</h2>
                    <p class="hero-story" id="hero-story-text"></p>
                </section>

                <section class="detail-section">
                    <blockquote class="hero-quote">
                        <div class="quote-border-left"></div>
                        <p id="hero-quote-text"></p>
                    </blockquote>
                </section>

                <div class="action-buttons">
                    <button class="btn btn-gold" onclick="copyToClipboard('💔 ${escapeHtml(data.tragicHero.name)} — ${escapeHtml(data.tragicHero.story.substring(0,100))}... ' + window.location.href).then(function() { this.textContent = 'Shared 💔'; }.bind(this))">
                        💔 SHARE THE TRAGEDY
                    </button>
                </div>

                <div class="og-preview">
                    <img src="/og-images/tragic-hero.png" alt="Tragic Hero OG" class="og-image-preview" loading="lazy">
                </div>
            </div>
        `;

        const storyEl = document.getElementById("hero-story-text");
        const quoteEl = document.getElementById("hero-quote-text");
        if (storyEl) {
            typeWriter(storyEl, data.tragicHero.story, 18).then(function() {
                if (quoteEl) typeWriter(quoteEl, data.tragicHero.quote, 22);
            });
        }
    }

    function renderTribunal(data) {
        updateMeta("⚖️ The Daily Tribunal", data.tribunal.question, "/og-images/tribunal.png");
        const storedVote = getStoredVote();
        const t = data.tribunal;

        function computeDisplayPcts(voted, choice) {
            if (!voted) return [t.sideA.percentage, t.sideB.percentage];
            const totalWithMine = t.totalMockVotes + 1;
            const aVotes = t.sideA.mockVotes + (choice === "A" ? 1 : 0);
            const bVotes = t.sideB.mockVotes + (choice === "B" ? 1 : 0);
            return [
                parseFloat((aVotes / totalWithMine * 100).toFixed(1)),
                parseFloat((bVotes / totalWithMine * 100).toFixed(1))
            ];
        }

        const [pctA, pctB] = computeDisplayPcts(storedVote.voted, storedVote.choice);

        const app = document.getElementById("app");
        app.innerHTML = `
            <div class="detail-view tribunal-view">
                <button class="back-btn" onclick="navigate('/')">← Back to Pulse</button>
                <div class="detail-header">
                    <div class="detail-label">⚖️ THE DAILY TRIBUNAL</div>
                    <h1 class="detail-title tribunal-title">${escapeHtml(t.question)}</h1>
                </div>

                <div class="tribunal-arena">
                    <div class="tribunal-side side-a-detail ${storedVote.voted && storedVote.choice === 'A' ? 'voted-side' : ''}">
                        <div class="side-label orange-text">${escapeHtml(t.sideA.label)}</div>
                        <p class="side-desc">${escapeHtml(t.sideA.description)}</p>
                        <div class="side-pct" id="pct-a">${pctA}%</div>
                        <div class="side-bar-wrap">
                            <div class="side-bar bar-a-detail" id="bar-a-detail" style="width: 0%"></div>
                        </div>
                        ${!storedVote.voted
                            ? `<button class="vote-btn-lg btn-a-lg" id="vote-a-btn" data-choice="A">
                                   👊 SIDE WITH THIS
                               </button>`
                            : storedVote.choice === "A"
                                ? `<div class="my-vote-badge">✓ YOU VOTED THIS</div>`
                                : ""}
                    </div>

                    <div class="tribunal-divider">
                        <div class="vs-circle">VS</div>
                    </div>

                    <div class="tribunal-side side-b-detail ${storedVote.voted && storedVote.choice === 'B' ? 'voted-side' : ''}">
                        <div class="side-label red-text">${escapeHtml(t.sideB.label)}</div>
                        <p class="side-desc">${escapeHtml(t.sideB.description)}</p>
                        <div class="side-pct" id="pct-b">${pctB}%</div>
                        <div class="side-bar-wrap">
                            <div class="side-bar bar-b-detail" id="bar-b-detail" style="width: 0%"></div>
                        </div>
                        ${!storedVote.voted
                            ? `<button class="vote-btn-lg btn-b-lg" id="vote-b-btn" data-choice="B">
                                   👊 SIDE WITH THIS
                               </button>`
                            : storedVote.choice === "B"
                                ? `<div class="my-vote-badge">✓ YOU VOTED THIS</div>`
                                : ""}
                    </div>
                </div>

                <div class="tribunal-footer">
                    <div class="total-votes-display">
                        <span class="total-votes-num">${formatNumber(t.totalMockVotes + (storedVote.voted ? 1 : 0))}</span>
                        <span class="total-votes-label"> community votes</span>
                    </div>
                    <button class="btn btn-secondary" onclick="copyToClipboard('⚖️ ${escapeHtml(t.question)} | Side A: ${pctA}% vs Side B: ${pctB}% | ' + window.location.href).then(function() { this.textContent = 'Copied! ✓'; }.bind(this))">
                        Share This Debate
                    </button>
                </div>

                <div class="og-preview">
                    <img src="/og-images/tribunal.png" alt="Tribunal OG" class="og-image-preview" loading="lazy">
                </div>
            </div>
        `;

        setTimeout(function() {
            const barA = document.getElementById("bar-a-detail");
            const barB = document.getElementById("bar-b-detail");
            if (barA) { barA.style.transition = "width 1s ease-out"; barA.style.width = pctA + "%"; }
            if (barB) { barB.style.transition = "width 1s ease-out"; barB.style.width = pctB + "%"; }
        }, 150);

        ["A", "B"].forEach(function(choice) {
            const btn = document.getElementById("vote-" + choice.toLowerCase() + "-btn");
            if (btn) {
                btn.addEventListener("click", function() {
                    storeVote(choice);
                    renderTribunal(data);
                });
            }
        });
    }

    function router() {
        const path = window.location.pathname;
        _currentPath = path;

        if (!_data) { renderError("Could not load drama data."); return; }

        if (path === "/" || path === "/index.html") {
            renderHome(_data);
        } else if (path === "/card/cry-meter") {
            renderCryMeter(_data);
        } else if (path === "/card/villain") {
            renderVillain(_data);
        } else if (path === "/card/tragic-hero") {
            renderTragicHero(_data);
        } else if (path === "/card/tribunal") {
            renderTribunal(_data);
        } else {
            navigate("/");
        }
    }

    function navigate(path) {
        if (path === window.location.pathname) return;
        window.history.pushState({}, "", path);
        router();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function handleNavClick(event) {
        const anchor = event.target.closest("a[href]");
        if (!anchor) return;
        const href = anchor.getAttribute("href");
        if (href && href.startsWith("/") && !href.startsWith("//")) {
            event.preventDefault();
            navigate(href);
        }
    }

    function handleVoteClick(event) {
        const btn = event.target.closest("[data-choice]");
        if (!btn) return;
        const choice = btn.getAttribute("data-choice");
        const scope = btn.getAttribute("data-scope");
        if (choice && scope === "home" && !getStoredVote().voted) {
            storeVote(choice);
            renderHome(_data);
        }
    }

    document.addEventListener("DOMContentLoaded", async function() {
        renderSkeleton();
        try {
            await fetchData();
        } catch(err) {
            renderError("The drama feed is temporarily unavailable. " + err.message);
            return;
        }
        router();
        setInterval(refreshData, REFRESH_INTERVAL);
    });

    window.addEventListener("popstate", function() { router(); });
    document.addEventListener("click", handleNavClick);
    document.addEventListener("click", handleVoteClick);

    window.navigate = navigate;
})();
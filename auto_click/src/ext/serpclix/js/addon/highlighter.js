window.highlighter_injected ||
  ((window.highlighter = {
    highlights: {},
    serp_alls: new Set(),
    serp_best: null,
    disabled: !1,
    high_tm: null,
    message_extras: {},
    xyz: {},
    highlight_delayed: function (e) {
      clearTimeout(this.high_tm),
        (this.high_tm = setTimeout(() => {
          this.highlight();
        }, e || 1e3));
    },
    highlight: function () {
      let e = 0,
        t = !1,
        i = window.location.href.toString();
      if (this.disabled || !this.highlights) {
        return;
      }
      let l = this.highlights.type,
        s = i.includes("google.") && i.includes("/maps/"),
        o = i.includes("google.") && i.includes("tbm=isch"),
        h =
          i.includes("google.") &&
          (i.includes("tbm=nws") || i.includes("news.google.")),
        n =
          i.includes("google.") &&
          (i.includes("tbm=vid") || i.includes("video.google.")),
        r = i.includes("google.") && i.includes("/search"),
        a = i.includes("duckduckgo.") && i.includes("q="),
        g = i.includes("bing.") && i.includes("/search"),
        d = i.includes("youtube.") && i.includes("/results");
      const c = /android/i.test(navigator.userAgent);
      if (
        ("googlemaps" == l &&
          s &&
          (this.hide_googleads(), (e += this.highlight_googlemaps()), (t = !0)),
        "googleimages" == l &&
          (o
            ? ((e += this.highlight_googleimages("a", "div[data-ved]")),
              0 === e && (e += this.highlight_anyatt("div")))
            : r && (e += this.highlight_googleimages_topline()),
          (t = !0)),
        "googlenews" == l &&
          h &&
          (this.hide_googleads(),
          (e += this.highlight_anyatt("main article a", "main article")),
          0 === e && (e += this.highlight_links(".g a", "div.g")),
          0 === e && (e += this.highlight_links()),
          (t = !0)),
        "google" == l && r)
      ) {
        let t, i;
        this.hide_googleads(),
          c
            ? ((i = "a[href][rel='noopener']"),
              (t = {
                parent: "div[data-hveid] div.mnr-c",
                self: "a[href*='/url?'][href*='ved='][rel='noopener']"
              }))
            : ((i = ".g a"),
              (t = {
                parent: "div.g",
                self: "a[ping*='/url?'][ping*='url='][rel='noopener'][data-ved]"
              })),
          (e += this.highlight_links(i, t)),
          0 === e && (e += this.highlight_links("a"));
      }
      "googlevideo" == l &&
        n &&
        (this.hide_googleads(),
        (e += this.highlight_links("a", "div#search div.g"))),
        "bing" == l &&
          g &&
          ((e += this.highlight_links("#b_content li.b_algo a", "li.b_algo")),
          0 === e && (e += this.highlight_links()),
          0 === e && (e += this.highlight_content(".b_algo cite")),
          0 === e &&
            (e += this.highlight_anyatt(
              ".b_algo .b_title div[data-sc-metadata]"
            ))),
        "youtube" == l &&
          d &&
          (this.hide_utubeads(),
          (e += this.highlight_links("a[href*='/watch?']", {
            parent: "ytd-video-renderer",
            self: "ytd-video-renderer a[href*='/watch?']"
          })),
          (e += this.highlight_links("a[href*='/watch?']", {
            parent: "ytm-compact-video-renderer",
            self: "ytm-compact-video-renderer a[href*='/watch?']"
          })),
          (t = !0)),
        "duckduckgo" == l &&
          a &&
          ((e += this.highlight_links(
            ".results article a",
            ".results article"
          )),
          0 === e && (e += this.highlight_links())),
        (0 === e || t) && this.highlight_delayed(e > 0 ? 3500 : 1500);
    },
    highlight_links: function (e, t) {
      let i = 0,
        l = [];
      e = e || "a";
      let s = this.highlights.url_exact
          ? this.highlights.url_hash
          : this.highlights.url_host_hash,
        o = this.highlights.salt;
      l = document.querySelectorAll(e);
      for (let e = 0; e < l.length; e++) {
        let h = l[e],
          n = h.href || "";
        h.addEventListener("mouseover", e => {
          this.keep_xyz("h", e);
        }),
          h.addEventListener("mousedown", e => {
            this.keep_xyz("d", e),
              this.send_grabba_message({
                elhref: n,
                elcontent: e.target.textContent,
                elxyz: this.get_xyz(e)
              });
          }),
          this.highlights.url_exact
            ? (href0 = this.simplify_url(
                n.toLowerCase(),
                this.highlights.url_keep_qs
              ))
            : (href0 = this.simplify_url_domain(n.toLowerCase())),
          s != md5(o + href0) ||
            ((i += 1),
            this.send_grabba_message({
              highhref: n,
              highcontent: h.textContent
            }),
            this.colorize_element(h),
            t && this.save_serp_position(h, t),
            h.click()); // custom code
      }
      return i;
    },
    highlight_content: function (e, t) {
      let i = 0,
        l = [];
      e = e || "a";
      let s = this.highlights.url_exact
          ? this.highlights.url_hash
          : this.highlights.url_host_hash,
        o = this.highlights.salt;
      l = document.querySelectorAll(e);
      for (let e = 0; e < l.length; e++) {
        let h = l[e],
          n = h.textContent || "";
        this.highlights.url_exact
          ? (href0 = this.simplify_url(
              n.toLowerCase(),
              this.highlights.url_keep_qs
            ))
          : (href0 = this.simplify_url_domain(n.toLowerCase())),
          n &&
            (h.addEventListener("mousedown", e => {
              this.keep_xyz("d", e),
                this.send_grabba_message({
                  elhref: n,
                  elcontent: e.target.textContent,
                  elxyz: this.get_xyz(e)
                });
            }),
            s == md5(o + href0) &&
              (h.addEventListener("mouseover", e => {
                this.keep_xyz("h", e);
              }),
              (i += 1),
              this.send_grabba_message({
                highhref: n,
                highcontent: h.textContent
              }),
              this.colorize_element(h),
              t && this.save_serp_position(h, t),
              h.click())); // custom code
      }
      return i;
    },
    _az: function (e) {
      return (e || "").toLowerCase().replace(/[^a-zA-Z0-9]/gi, "");
    },
    _uncolorize_element: function (e) {
      try {
        if (
          e.style &&
          e.style.length >= 1 &&
          (e.style.borderWidth || e.style.backgroundColor)
        ) {
          e.style = "";
          let t = e.closest("button") || e.closest("div") || e.parentElement;
          t &&
            t.style &&
            t.style.length >= 1 &&
            (t.style.borderWidth || t.style.backgroundColor) &&
            (t.style = "");
        }
      } catch (e) {}
    },
    gglmaps_search_input: function () {
      let e = document.querySelector("#searchboxinput");
      return e ? e.value : null;
    },
    highlight_googlemaps: function (e, t) {
      let i = 0,
        l = [],
        s = this._az(this.highlights.hint),
        o = this.highlights.hint2 || "";
      o && o.indexOf(",") > 0 && (o = o.substring(0, o.indexOf(","))),
        (o = this._az(o));
      let h = this.highlights.url_hash,
        n = this.highlights.url_host_hash,
        r = this.highlights.salt;
      l = s
        ? document.querySelectorAll(
            "a[aria-label][jsan][href*='/maps/'], div.fontHeadlineSmall span, div[role='main'][aria-label] h1"
          )
        : [];
      for (let e = 0; e < l.length; e++) {
        this._uncolorize_element(l[e]);
      }
      for (let e = 0; e < l.length; e++) {
        let t = l[e],
          h = t.textContent || "no-content",
          n = this._az(h);
        if (n.length > 10 * s.length) {
          continue;
        }
        let r = this._az(t.getAttribute("aria-label") || "no-label");
        if (s && (n.indexOf(s) >= 0 || r.indexOf(s) >= 0)) {
          if (o) {
            let e = t.parentNode || t;
            if (this._az(e.textContent || "no-content").indexOf(o) < 0) {
              continue;
            }
          }
          t.addEventListener("mousedown", e => {
            this.keep_xyz("d", e),
              this.send_grabba_message({
                clickhint: [n, r],
                hcxyz: this.get_xyz(e)
              });
          }),
            this.send_grabba_message({
              highhint: [n, r],
              highhintcontent: h,
              searchboxinput: this.gglmaps_search_input()
            }),
            this.colorize_element_google_maps(t),
            (i += 1);
        }
      }
      (t = "a"), (l = document.querySelectorAll(t));
      for (let e = 0; e < l.length; e++) {
        let t = l[e],
          s = t.href || "",
          o = null;
        (o = this.highlights.url_exact
          ? this.simplify_url(s.toLowerCase(), this.highlights.url_keep_qs)
          : this.simplify_url_domain(s.toLowerCase())),
          o &&
            ((h != md5(r + o) && n != md5(r + o)) ||
              (t.addEventListener("mousedown", e => {
                this.keep_xyz("d", e),
                  this.send_grabba_message({
                    elhref: o,
                    elcontent: e.target.textContent,
                    elxyz: this.get_xyz(e),
                    searchboxinput: this.gglmaps_search_input()
                  });
              }),
              this.send_grabba_message({
                highhref: o,
                highcontent: t.textContent,
                searchboxinput: this.gglmaps_search_input()
              }),
              this.colorize_element_google_maps(t),
              (i += 1)));
      }
      (t = "div.fontBodyMedium"), (l = document.querySelectorAll(t));
      for (let e = 0; e < l.length; e++) {
        let t = l[e],
          s = t.textContent,
          o = null;
        (o = this.highlights.url_exact
          ? this.simplify_url(s.toLowerCase(), this.highlights.url_keep_qs)
          : this.simplify_url_domain(s.toLowerCase())),
          o &&
            ((h != md5(r + o) && n != md5(r + o)) ||
              (t.addEventListener("mousedown", e => {
                this.keep_xyz("d", e),
                  this.send_grabba_message({
                    elhref: o,
                    elcontent: e.target.textContent,
                    elxyz: this.get_xyz(e)
                  });
              }),
              this.send_grabba_message({
                highhref: o,
                highcontent: t.textContent,
                searchboxinput: this.gglmaps_search_input()
              }),
              this.colorize_element_google_maps(t),
              (i += 1)));
      }
      return i;
    },
    highlight_googleimages_topline: function () {
      let e = 0;
      if (
        ((e += this.highlight_anyatt("g-section-with-header div", null, {
          parent: "g-section-with-header",
          child: "img"
        })),
        0 == e)
      ) {
        document.querySelectorAll("#top_nav a[href*='tbm=isch']").forEach(e => {
          this.colorize_element_default(e);
        }),
          document
            .querySelectorAll("g-more-link a[href*='tbm=isch']")
            .forEach(e => {
              this.colorize_element_default(e);
            }),
          document
            .querySelectorAll("a[href*='tbm=isch'][href*='/search?q=']")
            .forEach(e => {
              this.colorize_element_default(e);
            });
      } else {
        let e = document.querySelector("g-scrolling-carousel g-right-button");
        e && this.colorize_element_default(e),
          document
            .querySelectorAll("g-scrolling-carousel g-img img")
            .forEach(e => {
              e.style.filter ||
                (e.style.filter =
                  "grayscale(1) brightness(2) opacity(0.33) blur(3px)");
            });
      }
    },
    highlight_googleimages: function (e) {
      let t = 0,
        i = [];
      e = e || "a";
      let l = this.highlights.url_exact
          ? this.highlights.url_hash
          : this.highlights.url_host_hash,
        s = this.highlights.salt;
      i = document.querySelectorAll(e);
      for (let e = 0; e < i.length; e++) {
        let o = i[e],
          h = o.href || "",
          n = h;
        o.addEventListener("mouseover", e => {
          this.keep_xyz("h", e);
        }),
          o.addEventListener("mousedown", e => {
            this.keep_xyz("d", e),
              this.send_grabba_message({
                elhref: h,
                elcontent: e.target.textContent,
                elxyz: this.get_xyz(e)
              });
          });
        let r = new RegExp("imgrefurl=([^&#]+)", "ig"),
          a = h.match(r);
        a &&
          a[1] &&
          ((h = decodeURIComponent(a[1].replace(/\+/g, " "))),
          (n = this.simplify_url(hrefref.toLowerCase()))),
          (n = this.highlights.url_exact
            ? this.simplify_url(h.toLowerCase(), this.highlights.url_keep_qs)
            : this.simplify_url_domain(h.toLowerCase())),
          l == md5(s + n) &&
            (this.send_grabba_message({
              highhref: n,
              highcontent: o.textContent
            }),
            this.colorize_element_google_images(o),
            this.save_serp_position(o, {
              parent: "div[data-ved][class~='isv-r']",
              self: "a[href*='imgrefurl']"
            }),
            (t += 1));
      }
      return t;
    },
    highlight_anyatt: function (e, t, i) {
      let l = 0,
        s = [];
      e = e || "a";
      let o = this.highlights.url_exact
          ? this.highlights.url_hash
          : this.highlights.url_host_hash,
        h = this.highlights.salt,
        n = new RegExp("(https?://.*?)($|[; \"'])", "i");
      s = document.querySelectorAll(e);
      for (let e = 0; e < s.length; e++) {
        let r = s[e];
        for (let e = 0; e < r.attributes.length; e++) {
          let s = (r.attributes[e].value || "").match(n);
          if (s && s[1]) {
            let e = decodeURIComponent(String(s[1]).replace(/\+/g, " ")),
              n = e;
            (n = this.highlights.url_exact
              ? this.simplify_url(e.toLowerCase(), this.highlights.url_keep_qs)
              : this.simplify_url_domain(e.toLowerCase())),
              o == md5(h + n) &&
                (this.send_grabba_message({
                  highhref: n,
                  highcontent: r.textContent
                }),
                this.colorize_element(r, i),
                t && this.save_serp_position(r, t),
                (l += 1));
          }
        }
      }
      return l;
    },
    hide_googleads: function (e) {
      (e = e || [
        ["li.ads-ad", "ol"],
        ["li.ads-fr", "ol"],
        ["li[class*='ads-']", "ol"],
        ["div[aria-label='Ads']", null],
        ["div#tvcap", null],
        ["div#tads", null],
        ["div#topads", null],
        ["div#bottomads", null],
        ["div.ad_cclk", null],
        ["a[href*='googleadservices']", "div"],
        ["w-visurl", "a"],
        ["a[onmousedown*='google.arwt']", "div"],
        [
          "a[onmousedown*='window[this.getAttribute(\\'data-mousedown\\')](this)']",
          "div"
        ],
        ["a[href*='/aclk?'][data-al]", "div"],
        ["a[data-tu*='/aclk?']", "div"],
        ["div[data-result-ad-type]", "div"],
        ["a[data-rw*='/aclk?']", "div"],
        [".commercial-unit-desktop-rhs", null],
        [".commercial-unit-desktop-top", null],
        [".commercial-unit-mobile-top", null],
        [".commercial-unit-mobile-bottom", null]
      ]),
        this.hide_ads(e);
      let t = document.querySelectorAll("a");
      for (let e = 0; e < t.length; e++) {
        let i = t[e];
        for (let e = 0; e < i.attributes.length; e++) {
          let t = i.attributes[e];
          /^data-|^href/i.test(t.nodeName) &&
            /googleadservices\.com|\/aclk\?sa=/i.test(t.nodeValue) &&
            (this.hide_ad_el(i),
            !i ||
              ("A" != i.tagName && "a" != i.tagName) ||
              i.setAttribute("href", "https://google.com/?dbltap"));
        }
      }
    },
    hide_utubeads: function (e) {
      (e = e || [
        [".masthead-ad-control", null],
        ["#masthead-ad", null],
        ["#promotion-shelf", null],
        [".ad-div", null],
        [".ytp-ad-module", null],
        [".ytd-carousel-ad-renderer", null],
        ["ytd-promoted-sparkles-web-renderer", ".ytd-item-section-renderer"],
        ["ytm-promoted-sparkles-web-renderer", ".ytd-item-section-renderer"]
      ]),
        this.hide_ads(e);
    },
    hide_ads: function (e) {
      for (let t = 0; t < e.length; t++) {
        let i = document.querySelectorAll(e[t][0]),
          l = e[t][1];
        for (let e = 0; e < i.length; e++) {
          let t = i[e],
            s = l ? t.closest(l) : t;
          s && this.hide_ad_el(s);
        }
      }
    },
    hide_ad_el: function (e) {
      try {
        (e.style.display = "none"),
          (e.style.visibility = "hidden"),
          (e.style.opacity = "0.1"),
          (e.style.backgroundColor = "green"),
          (e.style.height = "3px"),
          (e.style.overflow = "hidden"),
          (e.disabled = !0);
      } catch (e) {}
    },
    colorize_element: function (e, t) {
      try {
        t
          ? this.colorize_element_default(e, t)
          : window.location.href.toString().includes("google.")
          ? this.colorize_element_google(e, "div.g")
          : window.location.href.toString().includes("youtube.")
          ? this.colorize_element_google(e, "ytd-video-renderer")
          : window.location.href.toString().includes("bing.")
          ? this.colorize_element_bing(e)
          : window.location.href.toString().includes("duckduckgo.")
          ? this.colorize_element_google(e, "article")
          : this.colorize_element_default(e);
      } catch (e) {}
    },
    colorize_element_google: function (e, t) {
      let i = e.closest(t || "div");
      if (!i) {
        return void this.colorize_element_default(e);
      }
      (e.style.color = "maroon"),
        (e.style.fontWeight = "bold"),
        (e.style.backgroundColor = "#eaff00"),
        (e.style.boxShadow = "0 0 4px lightyellow"),
        i &&
          ((i.style.backgroundColor = "#ffa0a0"),
          (i.style.boxShadow = "0 0 4px coral"),
          (i.style.border = "1px solid #fddd9b"));
      let l = i.closest("div[data-initq] div[data-q]");
      l &&
        ((l.style.backgroundColor = "#ffa0a0"),
        (l.style.boxShadow = "0 0 4px lightyellow"),
        (l.style.border = "1px solid magenta"));
      let s = e.closest("div.g g-inner-card");
      s &&
        ((s.style.backgroundColor = "#e67171"),
        (s.style.boxShadow = "0 0 4px lightyellow"),
        (s.style.border = "1px solid magenta"));
    },
    colorize_element_google_maps: function (e) {
      (e.style.backgroundColor = "#b1ff87"),
        (e.style.color = "#004400"),
        (e.style.fontWeight = "bold"),
        (e.style.border = "2px solid crimson"),
        (e.style.padding = "2px 6px"),
        (e.style.boxShadow = "0 0 20px coral");
      let t = e.closest("button") || e.closest("div") || e.parentElement;
      t &&
        ((t.style.backgroundColor = "#ff8787"),
        (t.style.border = "1px solid crimson"));
    },
    colorize_element_google_images: function (e) {
      (e.style.border = "5px solid coral"),
        (e.style.boxShadow = "0 0 20px yellow"),
        (e.style.backgroundColor = "#b1ff87");
      let t = e.parentNode.childNodes;
      for (let i = 0; i < t.length; i++) {
        t[i] != e &&
          ((t[i].style.backgroundColor = "gold"), (t[i].style.color = "black"));
      }
    },
    colorize_element_bing: function (e) {
      let t = e.closest("li.b_algo") || e.parentNode;
      (t.style.backgroundColor = "#ff8787"),
        (t.style.boxShadow = "0 0 3px coral"),
        (e.style.color = "maroon"),
        (e.style.fontWeight = "bold");
    },
    colorize_element_default: function (e, t) {
      let i = (t && t.parent) || null,
        l = (t && t.child) || null;
      (e.style.backgroundColor = "#fddd9b"),
        (e.style.color = "#ffff7f"),
        (e.style.fontWeight = "bold"),
        (e.style.boxShadow = "3px 3px 10px #fddd9b, 0 0 5px #fddd9b inset"),
        (e.style.border = "4px solid #ff8787");
      let s = (i && e.closest(i)) || e.parentNode;
      if (
        (s &&
          ((s.style.backgroundColor = "#ffd7d7"),
          (s.style.boxShadow = "0 0 3px yellow inset, 0 0 3px #ffd7d7"),
          (s.style.border = "2px solid #ffd7d7")),
        l)
      ) {
        let t = e.querySelector(l);
        t &&
          ((t.style.backgroundColor = "lightyellow"),
          (t.style.boxShadow = "3px 3px 8px salmon, 0 0 5px salmon inset"),
          (t.style.border = "3px solid red"),
          "img" == l &&
            (t.style.filter =
              "saturate(2.00) contrast(1.33) drop-shadow(0 0 10px crimson)"));
      }
    },
    save_serp_position: function (e, t) {
      let i = (t && t.parent) || t || "div",
        l = (t && t.self) || null,
        s = (i && e.closest(i)) || e.parentNode,
        o = (b = 0),
        h = null,
        n = null;
      if (i) {
        let e = document.querySelectorAll(i);
        n = e && e.length;
        let t = 0;
        for (t = 0; t < e.length; t++) {
          if (e[t].isSameNode(s)) {
            h = t;
            break;
          }
        }
      }
      let r = null,
        a = 0;
      if (l) {
        let t = document.querySelectorAll(l);
        a = t && t.length;
        let i = 0;
        for (i = 0; i < t.length; i++) {
          if (t[i].isSameNode(e)) {
            r = i;
            break;
          }
        }
      }
      let g = new URLSearchParams(window.location.search),
        d = Number(g.get("start")) || Number(g.get("first")) || 0,
        c = {};
      if (null === h && null === r) {
        return;
      }
      let u = [o, b, h, d, n, r, a];
      if (
        (this.serp_alls.size < 10 && this.serp_alls.add(JSON.stringify(u)),
        (c.serp_positions = Array.from(this.serp_alls)),
        !this.serp_best ||
          null === this.serp_best[2] ||
          (Number(this.serp_best[2]) || 0) > u[2])
      ) {
        this.serp_best = u;
        let e = String(s.textContent)
            .replace(/[\n\r\s]{2,}/gi, " ")
            .trim(),
          t = s.className;
        (c.serp_position = this.serp_best),
          (c.serp_box = e.substring(0, 100)),
          (c.serp_box_class = t);
      }
      this.send_grabba_message(c);
    },
    simplify_url: function (e, t) {
      if (!e || String(e).match(/^(about|chrome|javascript|file):/gi)) {
        return null;
      }
      e.indexOf("://") < 0 && (e = "https://" + e);
      let i = null;
      try {
        i = new URL(e);
      } catch (e) {
        return null;
      }
      let l = this.simplify_www(i.hostname),
        s = String(i.pathname).replace(/\/$/gi, ""),
        o = Array.from(i.searchParams),
        h = "";
      if (t) {
        let e = o.filter(e => e[0] && t.indexOf(e[0]) >= 0);
        if (e.length > 0 && t.length > 0) {
          e.sort(function cmp(e, t) {
            return e[0] > t[0] ? 1 : e[0] < t[0] ? -1 : 0;
          });
          for (let t = 0; t < e.length; t++) {
            h += (0 == t ? "?" : "&") + e[t][0] + "=" + e[t][1];
          }
        }
      }
      return `${l}${s}${h}`;
    },
    simplify_url_domain: function (e) {
      if (!e || String(e).match(/^(about|chrome|javascript|file):/gi)) {
        return null;
      }
      e.indexOf("://") < 0 && (e = "https://" + e);
      try {
        let t = new URL(e);
        return this.simplify_www(t.hostname);
      } catch (e) {
        return null;
      }
    },
    simplify_www: function (e) {
      return String(e)
        .replace(/^www\./gi, "")
        .replace(/\.m\./gi, ".")
        .replace(/^m\./gi, "")
        .toLowerCase();
    },
    unpack_ggl_url: function (e) {
      if (e && e.includes("google.") && e.includes("/url?q=http")) {
        let t = new RegExp("/url\\?q=(http[^&]+)", "ig").exec(e);
        if (t && t[1]) {
          return decodeURIComponent(t[1].replace(/\+/g, " "));
        }
      }
      return e;
    },
    send_grabba_message: function (e) {
      let t = document.getElementById("search");
      (t && t.innerText) || (t = document.body);
      let i = String(t.innerText)
          .replace(/[\n\r\s]{2,}/gi, " ")
          .trim(),
        l = {
          serppa: new Date(Date.now()).toISOString() || !0,
          pglocation: window.location.href.toString(),
          pgreferrer: document.referrer,
          pgcontent: i.substring(0, 2048),
          pgtitle: document.title
        };
      (e || this.message_extras) &&
        (Object.assign(this.message_extras, e),
        Object.assign(l, this.message_extras)),
        browser.runtime.sendMessage(l);
    },
    get_xyz: function (e) {
      return this.xyz;
    },
    keep_xyz: function (e, t) {
      (this.xyz[e] = [
        t.pageX,
        t.pageY,
        t.offsetX,
        t.offsetY,
        new Date().getTime()
      ]),
        Number(this.xyz[e + "_c"])
          ? this.xyz[e + "_c"]++
          : (this.xyz[e + "_c"] = 1);
    }
  }),
  (window.highlighter_injected = !0),
  "complete" == document.readyState
    ? window.highlighter.highlight_delayed(333)
    : window.addEventListener("load", () => {
        window.highlighter.highlight_delayed(333);
      }),
  window.addEventListener("mousedown", e => {
    window.highlighter.highlight_delayed(1250),
      window.highlighter.keep_xyz("d", e);
  }),
  window.addEventListener("mouseup", e => {
    window.highlighter.keep_xyz("u", e);
  }),
  document.addEventListener("mousemove", e => {
    window.highlighter.keep_xyz("mm", e);
  }),
  window.addEventListener("touchstart", e => {
    window.highlighter.keep_xyz("t", e);
  }),
  browser.runtime.onMessage.addListener(e => {
    e &&
      e.highlights &&
      ((window.highlighter.highlights = e.highlights || []),
      ("complete" != document.readyState &&
        "interactive" != document.readyState) ||
        window.highlighter.highlight_delayed(500)),
      e && e.grabba && window.highlighter.send_grabba_message(),
      e && e.highdisable && (window.highlighter.disabled = !0);
  }));

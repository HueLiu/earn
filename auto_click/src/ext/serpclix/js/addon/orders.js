const serpclix_orders_list_vueapp = new Vue({
    el: "#serpclix_orders_list_app",
    render: orders_vueapp_compiled_template_render,
    staticRenderFns: orders_vueapp_compiled_template_static_render_funcs,
    data: {
      orders: null,
      ipinfo: {},
      username: null,
      loading: !1,
      loading_counter: 0,
      tab_countdown: 0,
      tab_countdown_total: 0,
      cooldown_countdown: 0,
      orderslist_refresh_countdown: 0,
      message_text: "",
      message_class: "",
      addon_version: null,
      pepper: null,
      notifications_enabled: null,
      theme_enabled: null,
      state: {}
    },
    created: function () {
      (this.state = { step: null }),
        (this.addon_version = browser.runtime.getManifest().version),
        (this._document_title = document.title),
        (this._favicon = document.getElementById("favicon")),
        (this.xyz = {});
    },
    updated: function () { // custom code
      const clickEvent = new Event("click", {
        bubbles: true,
        cancelable: false
      });
      let element = document.querySelector('ul[id="orders"] li');
      if (element && element.classList.contains("idle")) {
        element.dispatchEvent(clickEvent);
      }
    },
    mounted: function () {
      browser.tabs.onUpdated.addListener(this.tab_updated_handler.bind(this)),
        browser.tabs.onRemoved.addListener(this.tab_removed_handler.bind(this)),
        browser.tabs.onCreated.addListener(this.tab_created_handler.bind(this)),
        browser.runtime.onMessage.addListener(
          this.tab_message_handler.bind(this)
        ),
        browser.storage.local
          .get([
            "username",
            "auth_token",
            "cid",
            "notifications_enabled",
            "theme_enabled"
          ])
          .then(t => {
            if (t.auth_token || t.username) {
              (this.auth_token = t.auth_token),
                (this.username = t.username),
                (this.pepper = t.cid || "sugar"),
                (this.notifications_enabled = !1 !== t.notifications_enabled);
              let e =
                window.matchMedia &&
                window.matchMedia("(prefers-color-scheme: dark)").matches;
              (this.theme_enabled =
                void 0 === t.theme_enabled ? e : Boolean(t.theme_enabled)),
                this.set_theme(),
                this.get_orders();
            } else {
              this.show_message(CX_MESSAGES.logout, "error"),
                browser.runtime.sendMessage({ logged_out: !0 });
            }
          })
          .catch(t => {});
    },
    watch: {
      notifications_enabled: function (t, e) {
        browser.storage.local.set({ notifications_enabled: Boolean(t) }),
          this.notifications_enabled ||
            browser.runtime
              .sendMessage({ clear: !0 })
              .then(() => {})
              .catch(() => {});
      },
      theme_enabled: function (t, e) {
        browser.storage.local.set({ theme_enabled: Boolean(t) }),
          this.set_theme();
      }
    },
    methods: {
      get_orders: function () {
        if (
          this.loading ||
          "search" == this.state.step ||
          "target" == this.state.step
        ) {
          return;
        }
        (this.loading = !0), (this.loading_counter += 1), (this.orders = null);
        const t =
            SERPCLIX_URLS.orders +
            `?pepper=${this.pepper}&c=${this.loading_counter}`,
          e = {
            method: "GET",
            cache: "no-cache",
            headers: {
              Authorization: "Token " + this.auth_token,
              Accept: "application/json",
              "Content-Type": "application/json"
            }
          };
        fetch(t, e)
          .then(t => {
            t.json()
              .then(e => {
                t.ok
                  ? this.parse_orders(e)
                  : this.handle_bad_fetch_orders(t, e);
              })
              .catch(e => {
                this.handle_bad_fetch_orders(t);
              });
          })
          .catch(t => {
            this.hcf(CX_MESSAGES.error + t, !0);
          })
          .finally(() => {
            this.loading = !1;
          });
      },
      clear_orders: function () {
        this.orders = null;
      },
      handle_bad_fetch_orders: function (t, e) {
        let s = (e = e || {}).error_message || e.detail || CX_MESSAGES.error;
        t.ok ||
          (401 == t.status || 403 == t.status
            ? (s = CX_MESSAGES.logout)
            : 429 == t.status && (s = CX_MESSAGES[429])),
          this.hcf(s, !0);
      },
      parse_orders: function (t) {
        t.orders && t.orders.length
          ? (this.orders = t.orders)
          : (this.orders = []),
          this.parse_ipinfo(t),
          this.orderslist_refresh_handler(),
          this.notify_orders_updated();
      },
      parse_ipinfo: function (t) {
        this.ipinfo = {
          country_name: t.country_name || null,
          risk_score: t.risk_score || null
        };
        let e = Number(this.ipinfo.risk_score);
        this.ipinfo.ip_quality = isNaN(e)
          ? "unknown"
          : e < 3
          ? "excellent"
          : e < 10
          ? "good"
          : "bad";
      },
      order_clicked: function (t, e) {
        if (
          !(!t || this.cooldown_countdown > 0 || this.tab_countdown_total > 0)
        ) {
          if (this.state && this.state.tab_open) {
            if (this.state.order && this.state.order.id == t.id) {
              try {
                browser.tabs.update(this.state.tab_id, { active: !0 });
              } catch (t) {}
              return;
            }
            this.close_all_child_tabs();
          }
          this.show_order_alert(t),
            (this.state = {
              order: t,
              searched_keyword: null,
              serp_urlclick: null,
              serp_urlhigh: null,
              serp_urlclick_ts: null,
              tab_serp_id: 0,
              step: null,
              tabs: [],
              tab_id: null,
              tab_open: !1,
              visited_urls: [],
              click_meta: {}
            }),
            this.keep_xyz("c", e),
            (this.state.click_meta.xyz = this.get_xyz()),
            (this.state.click_meta.webdriver = String(
              window.navigator.webdriver
            )),
            this.show_message(null),
            this.copy_to_clipboard(t.keyword),
            browser.storage.local.set({ // custom code
              search_keyword: t.keyword
            }),
            this.open_order(t);
        }
      },
      show_order_alert: function (t) {
        t.search_type &&
          "video" == t.search_type[1] &&
          console.log( // custom code
            "This is a VIDEO order.\nPlease do the keyword search as you normally would, then click on the highlighted result. When the video begins you may skip the ads but you must leave the video playing until the timer finishes the countdown.\nDo not pause or stop the video."
          );
      },
      build_request: function (t) {
        return {
          method: "POST",
          cache: "no-cache",
          headers: {
            Authorization: "Token " + this.auth_token,
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(t)
        };
      },
      open_order: function (t) {
        const e = { status: 0, orderid: t.id },
          s = this.build_request(e);
        fetch(SERPCLIX_URLS.click_open, s)
          .then(e => {
            e.ok
              ? e.json().then(e => {
                  this.open_search_tab(t);
                })
              : this.hcf(CX_MESSAGES.noorder);
          })
          .catch(t => {
            this.hcf(CX_MESSAGES.error + t, !0);
          })
          .finally(() => {});
      },
      block_order: function (t, e) {
        if (
          confirm(
            "Do you want to remove this order from your list?\nIf you click OK the order will be removed and will never be shown to you again."
          )
        ) {
          (this.loading = !0), this.close_all_child_tabs();
          const e = { order_id: t.id },
            s = this.build_request(e);
          fetch(SERPCLIX_URLS.order_block, s)
            .then(t => {})
            .catch(t => {})
            .finally(() => {
              (this.state.order = null),
                (this.state.step = null),
                (this.loading = !1),
                this.get_orders();
            });
        }
      },
      open_search_tab: function (t) {
        let e =
          t.url_start ||
          t.search_engine_url ||
          "https://www.google.com/?newwindow=0";
        browser.tabs
          .create({ url: e })
          .then(t => {
            (this.state.tab_id = t.id),
              (this.state.tab_serp_id = t.id),
              (this.state.step = "search"),
              (this.state.tab_open = !0),
              (this.state.tabs = [t.id]);
          })
          .catch(() => {});
      },
      tab_message_handler: function (t) {
        return (
          ((t.serppa && "search" == this.state.step) ||
            (t.grabba && "target" == this.state.step)) &&
            (Object.assign(this.state.click_meta, t),
            (this.state.click_meta.visited_urls = this.state.visited_urls)),
          "search" == this.state.step &&
            (t.searchboxinput &&
              !this.state.searched_keyword &&
              (this.state.searched_keyword = t.searchboxinput),
            this.state.click_meta &&
              this.state.click_meta.highhref &&
              (this.state.serp_urlhigh = this.unpack_ggl_url(
                this.state.click_meta.highhref
              )),
            this.state.click_meta.elhref &&
              (this.state.serp_urlclick = this.unpack_ggl_url(
                this.state.click_meta.elhref
              )),
            this.state.serp_urlhigh &&
              this.state.serp_urlclick &&
              !this.state.serp_urlclick_ts &&
              (this.state.serp_urlclick_ts = new Date()),
            this.state.searched_keyword && this.update_search_badge_label(),
            "googlemaps" == this.state.order.search_type[0] &&
              this.state.searched_keyword &&
              null === this.state.order.url_hashed &&
              this.state.click_meta.pglocation.indexOf("/place/") >= 0 &&
              browser.tabs
                .get(this.state.tab_id)
                .then(t => {
                  this.process_search_tab(t);
                })
                .catch(t => {})),
          !0
        );
      },
      tab_removed_handler: function (t) {
        let e = this.state.tabs ? this.state.tabs.indexOf(t) : -2;
        e >= 0 &&
          (this.state.tabs.splice(e, 1),
          t === this.state.tab_id &&
            ((this.state.tab_open = !1),
            "done" != this.state.step && (this.state.step = "closed")));
      },
      tab_created_handler: function (t) {
        t &&
          t.openerTabId &&
          this.state.tabs &&
          this.state.tabs.indexOf(t.openerTabId) >= 0 &&
          this.state.tabs.indexOf(t.id) < 0 &&
          this.state.tabs.push(t.id),
          t &&
            void 0 === t.openerTabId &&
            "search" == this.state.step &&
            this.state.tabs.push(t.id);
      },
      tab_updated_handler: function (t, e) {
        !this.state.order ||
          (t !== this.state.tab_id && this.state.tabs.indexOf(t) < 0) ||
          !e.url ||
          ("loading" !== e.status && "complete" !== e.status) ||
          (this.log_visited_url(e.url),
          "search" == this.state.step &&
            browser.tabs
              .get(t)
              .then(t => {
                this.process_search_tab(t);
              })
              .catch(t => {}));
      },
      process_search_tab: function (t, e) {
        if ("search" != this.state.step) {
          return !1;
        }
        let s = this.state.order,
          i = this.get_keywords_from_url(t.url, s);
        if ((i && this.update_search_badge_label(), i || !s.keyword)) {
          const [e, i] = this.check_target_url(t, s);
          if (e) {
            return this.process_target_hit(t, i), !0;
          }
        }
        e || this.inject_highlights(s, t);
      },
      inject_highlights: function (t, e) {
        let s = {
          url_hash: t.url_hashed,
          url_keep_qs: t.url_keep_qs,
          url_host_hash: t.url_hostname_hashed,
          url_exact: t.url_exact || !1,
          hint: t.url_hint,
          hint2: t.url_hint2,
          salt: this.pepper,
          type: t.search_type && t.search_type[0]
        };
        browser.tabs.executeScript(e.id, {
          file: "/js/vendor/browser-polyfill.min.js",
          allFrames: !0
        }),
          browser.tabs.executeScript(e.id, {
            file: "/js/vendor/md5.min.js",
            allFrames: !0
          }),
          browser.tabs.executeScript(e.id, { // custom code
            file: "/js/addon/autosearch.js",
            allFrames: !0
          }),
          browser.tabs
            .executeScript(e.id, {
              file: "/js/addon/highlighter.js",
              allFrames: !0
            })
            .then(() => {
              browser.tabs
                .sendMessage(e.id, { highlights: s })
                .then(() => {})
                .catch(t => {});
            })
            .catch(t => {});
      },
      update_search_badge_label: function () {
        let t = this.state.order;
        this.check_keywords(t)
          ? this.state.click_meta && this.state.click_meta.highhref
            ? (this.set_badge("Go!", "orange", "black"),
              (document.title = "{Go!} — " + this._document_title))
            : this.set_badge("ok", "green", "white")
          : (this.set_badge(
              "BAD",
              "red",
              "yellow",
              "search phrase is not correct!"
            ),
            (document.title = "{BAD SEARCH PHRASE} — " + this._document_title));
      },
      process_target_hit: function (t, e) {
        (this.state.step = "target"),
          (this.state.order.url_init = e),
          (this.state.order.url_init_real = t.url),
          browser.tabs
            .sendMessage(this.state.tab_serp_id || t.id, { highdisable: !0 })
            .then(() => {})
            .catch(() => {}),
          this.state.tab_id != t.id && (this.state.tab_id = t.id),
          this.init_click();
      },
      init_click: function () {
        const t = {
            status: 1,
            searched_keyword: this.state.searched_keyword,
            url: this.state.order.url_init,
            url0: this.state.order.url_init_real,
            orderid: this.state.order.id,
            extra: this.state.click_meta
          },
          e = this.build_request(t);
        fetch(SERPCLIX_URLS.click_init, e)
          .then(t =>
            t.json().then(e => {
              t.ok
                ? this.click_inited(e)
                : this.hcf(
                    "Click was rejected!\n" +
                      (e.error_message || e.detail || "")
                  );
            })
          )
          .catch(t => {
            this.hcf();
          })
          .finally(() => {});
      },
      click_inited: function (t) {
        (this.tab_countdown_base = t.countdown || 59),
          (this.state.clickid = t.clickid || 0),
          (this.state.order.url_extra = t.url_extra || []),
          (this.state.click_meta = {}),
          (this.tab_countdown = this.tab_countdown_base),
          (this.tab_countdown_since = Math.floor(Date.now() / 1e3)),
          clearInterval(this.tab_countdown_tm),
          (this.tab_countdown_tm = setInterval(
            this.tab_countdown_handler.bind(this),
            1010
          )),
          (this.tab_countdown_total = this.tab_countdown),
          this.state.order.has_url_extra &&
            this.state.order.url_extra.length > 0 &&
            (this.tab_countdown_total +=
              this.tab_countdown_base * this.state.order.url_extra.length),
          clearInterval(this.orderslist_refresh_tm),
          this.clear_orders(),
          scrollTo(0, 0);
      },
      tab_countdown_handler: function () {
        if (!this.state.tab_open) {
          return void this.hcf(CX_MESSAGES.tabclosed);
        }
        let t = Date.now() / 1e3;
        if (this.tab_countdown > 10) {
          let e = t - this.tab_countdown_since,
            s = Math.min(5, Math.floor(e));
          (this.tab_countdown -= s),
            (this.tab_countdown_total -= s),
            (this.tab_countdown_since += s);
        } else {
          (this.tab_countdown -= 1),
            (this.tab_countdown_total -= 1),
            (this.tab_countdown_since = t);
        }
        let e = this.tab_countdown_total.toString() || "!";
        this.set_badge(e, "crimson", "white", "WAIT: " + e),
          (document.title = "{Wait " + e + "!} — " + this._document_title),
          browser.tabs
            .get(this.state.tab_id)
            .then(t => {
              this.process_countdown_tab(t),
                this.tab_countdown_total <= 0 &&
                  ((this.state.step = "ready"),
                  clearInterval(this.tab_countdown_tm),
                  (this.tab_countdown_tm = null),
                  this.accept_click(this.state.order.url_accept));
            })
            .catch(() => {
              this.state.tab_open = !1;
            });
      },
      process_countdown_tab: function (t) {
        try {
          browser.tabs.update(t.id, { active: !0 });
        } catch (t) {}
        let e = this.simplify_url_domain(t.url),
          s = this.simplify_url_domain(this.state.order.url_init),
          i = this.simplify_url_domain(this.state.order.url_init_real);
        if (
          ("target" == this.state.step &&
            ((this.state.order.url_accept = t.url),
            e !== s &&
              e !== i &&
              (this.set_badge("URL?", "red", "yellow"),
              (document.title = "{BAD URL} — " + this._document_title))),
          3 == this.tab_countdown && "target" == this.state.step)
        ) {
          return (
            browser.tabs.executeScript(t.id, {
              file: "/js/vendor/browser-polyfill.min.js",
              allFrames: !1
            }),
            void browser.tabs
              .executeScript(t.id, {
                file: "/js/addon/grabba.js",
                allFrames: !1
              })
              .then(() => {
                browser.tabs.sendMessage(t.id, { grabba: !0 });
              })
              .catch(t => {
                this.state.click_meta.grabba_error = String(t);
              })
          );
        }
        if (
          "target" == this.state.step &&
          this.tab_countdown <= 1 &&
          !this.state.click_meta.grabba &&
          !this.state.click_meta.regrabba
        ) {
          let t = 30 + Math.floor(10 * Math.random());
          return (
            (this.tab_countdown += t),
            (this.tab_countdown_total += t),
            void (this.state.click_meta.regrabba =
              new Date(Date.now()).toISOString() || !0)
          );
        }
        if (
          "target" == this.state.step &&
          this.tab_countdown <= 1 &&
          this.state.click_meta.grabba &&
          "youtube" == this.state.order.search_type[0] &&
          this.state.click_meta.ytp_time
        ) {
          let t = String(this.state.click_meta.ytp_time).match(
            /([0-9:]+)\s*\/\s*([0-9:]+)/
          );
          if (t && t.length >= 2) {
            let e = Number(t[2].replace(/:/g, "")) || 0,
              s = Number(t[1].replace(/:/g, "")) || 0;
            if (e > 3 * YTP_TIME_MIN && s < YTP_TIME_MIN) {
              let t = Math.floor(0.5 * YTP_TIME_MIN + 10 * Math.random());
              return (
                (this.tab_countdown += t),
                (this.tab_countdown_total += t),
                void (this.state.click_meta.ytp_time_extra =
                  new Date(Date.now()).toISOString() || !0)
              );
            }
          }
        }
        if (
          ("target" == this.state.step || "target_extra" == this.state.step) &&
          1 == this.tab_countdown &&
          this.state.order.has_url_extra &&
          this.state.order.url_extra &&
          this.state.order.url_extra.length > 0
        ) {
          let e = this.state.order.url_extra.shift();
          e &&
            ((this.state.step = "target_extra"),
            (this.tab_countdown = this.tab_countdown_base),
            browser.tabs.executeScript(t.id, {
              file: "/js/vendor/browser-polyfill.min.js",
              allFrames: !1
            }),
            browser.tabs
              .executeScript(t.id, {
                file: "/js/addon/grabba.js",
                allFrames: !1
              })
              .then(() => {
                browser.tabs.sendMessage(t.id, { go: e });
              })
              .catch(t => {
                this.state.click_meta.url_extra_error = String(t);
              }));
        } else {
        }
      },
      accept_click: function (t) {
        const e = {
            status: 2,
            searched_keyword: this.state.searched_keyword,
            url: this.state.order.url_accept,
            url0: this.state.order.url_init,
            clickid: this.state.clickid,
            orderid: this.state.order.id,
            extra: this.state.click_meta
          },
          s = this.build_request(e);
        fetch(SERPCLIX_URLS.click_accept, s)
          .then(t =>
            t
              .json()
              .then(e => {
                t.ok && "accepted" == e.status
                  ? this.click_accepted(e)
                  : this.hcf(
                      CX_MESSAGES.rejected +
                        (e.error_message ||
                          e.detail ||
                          "Please try another order.")
                    );
              })
              .catch(t => {})
          )
          .catch(t => {
            this.hcf(CX_MESSAGES.error + String(t));
          });
      },
      click_accepted: function (t) {
        (this.state.step = "done"),
          this.close_all_child_tabs(),
          (this.state.order = null),
          this.cooldown_handler(t.cooldown || 30),
          this.show_message(CX_MESSAGES.accepted, "success", !0),
          scrollTo(0, 0);
      },
      orderslist_refresh_handler: function () {
        clearInterval(this.orderslist_refresh_tm),
          (this.orderslist_refresh_countdown = 100),
          (this.orderslist_refresh_tm = setInterval(() => {
            this.orderslist_refresh_countdown--,
              this.orderslist_refresh_countdown <= 0 &&
                (clearInterval(this.orderslist_refresh_tm),
                (this.orderslist_refresh_countdown = 0),
                this.get_orders());
          }, 900));
      },
      cooldown_handler: function (t) {
        clearInterval(this.orderslist_refresh_tm),
          clearInterval(this.cooldown_tm),
          (this.cooldown_countdown = t || 30),
          (this.tab_countdown = 0),
          (this.tab_countdown_total = 0),
          (this.cooldown_tm = setInterval(() => {
            if ((this.cooldown_countdown--, this.cooldown_countdown <= 0)) {
              clearInterval(this.cooldown_tm),
                (this.cooldown_countdown = 0),
                this.show_message(null),
                this.get_orders();
            } else {
              let t = this.cooldown_countdown.toString();
              this.set_badge(t, "navy", "white", "wait: " + t),
                (document.title =
                  "{Wait " + t + "!} — " + this._document_title);
            }
          }, 1e3));
      },
      log_visited_url: function (t) {
        if (t && this.state.visited_urls) {
          let e = String(this.simplify_url(t)).replace(/@.*$/, "", "ig");
          this.state.visited_urls.includes(e) ||
            this.state.visited_urls.push(e);
        }
      },
      show_message: function (t, e) {
        (this.message_text = t || ""),
          (this.message_class = e || ""),
          (document.title = this._document_title);
      },
      set_badge: function (t, e, s, i) {
        try {
          browser.browserAction.setBadgeText &&
            browser.browserAction.setBadgeText({ text: t || "" }),
            browser.browserAction.setTitle &&
              browser.browserAction.setTitle({ title: i || t || "" }),
            e &&
              browser.browserAction.setBadgeBackgroundColor &&
              browser.browserAction.setBadgeBackgroundColor({ color: e }),
            s &&
              browser.browserAction.setBadgeTextColor &&
              browser.browserAction.setBadgeTextColor({ color: s });
        } catch (t) {}
      },
      hcf: function (t, e) {
        this.show_message(t || CX_MESSAGES.error, "error"),
          this.set_badge(null),
          this.close_all_child_tabs(),
          (this.state = {}),
          (this.orders = null),
          clearInterval(this.tab_countdown_tm),
          (this.tab_countdown_tm = null),
          (this.tab_countdown = 0),
          (this.tab_countdown_total = 0),
          clearInterval(this.cooldown_tm),
          (this.cooldown_tm = null),
          scrollTo(0, 0),
          e
            ? setTimeout(() => {
                this.log_me_out();
              }, 699)
            : setTimeout(() => {
                this.get_orders();
              }, 999);
      },
      close_all_child_tabs: function () {
        if (this.state && this.state.tabs) {
          for (let t = 0; t < this.state.tabs.length; t++) {
            try {
              browser.tabs.remove(this.state.tabs[t]);
            } catch (t) {}
          }
        }
      },
      log_me_out: function () {
        if (!this.auth_token) {
          return;
        }
        const t = {
          method: "POST",
          cache: "no-cache",
          headers: {
            Authorization: "Token " + this.auth_token,
            "Content-Type": "application/json"
          }
        };
        fetch(SERPCLIX_URLS.logout, t)
          .then(t => {
            this.hcf("You are logged out!", !0);
          })
          .catch(t => {
            this.hcf("Logout failed: " + t);
          })
          .finally(() => {
            browser.runtime.sendMessage({ logged_out: !0 }),
              (this.auth_token = null);
          });
      },
      get_keywords_from_url: function (t, e) {
        if (this.state && this.state._gkw_url && t == this.state._gkw_url) {
          return null !== this.state.searched_keyword;
        }
        this.state._gkw_url = t;
        let s = {
            google: [
              new RegExp("google\\.[a-z\\.]+/(advanced_)?search"),
              new RegExp(
                "([?&](?:q|hq|as_q|as_epq|as_oq|as_eq|as_lq|as_rq|as_sitesearch)=[^&#]+)",
                "ig"
              )
            ],
            googleimages: [
              new RegExp("google\\.[a-z\\.]+/(advanced_)?search.+"),
              new RegExp(
                "([?&](?:q|hq|as_q|as_epq|as_oq|as_eq|as_lq|as_rq|as_sitesearch)=[^&#]+)",
                "ig"
              )
            ],
            googlemaps: [
              new RegExp("google\\.[a-z\\.]+/maps/search/([^&#/@]+)/", "ig"),
              new RegExp("/maps/search/([^&#/@]+)/", "ig")
            ],
            googlenews: [
              new RegExp(
                "google\\.[a-z\\.]+/(advanced_)?search.+tbm=nws|news.google.com/search"
              ),
              new RegExp(
                "([?&](?:q|hq|as_q|as_epq|as_oq|as_eq|as_lq|as_rq|as_sitesearch)=[^&#]+)",
                "ig"
              )
            ],
            googlevideo: [
              new RegExp(
                "google\\.[a-z\\.]+/(advanced_)?search.+tbm=vid|video.google.com/search"
              ),
              new RegExp(
                "([?&](?:q|hq|as_q|as_epq|as_oq|as_eq|as_lq|as_rq|as_sitesearch)=[^&#]+)",
                "ig"
              )
            ],
            youtube: [
              new RegExp("youtube.[a-z\\.]+/results"),
              new RegExp("([?&]search_query=[^&#]+)", "ig")
            ],
            yandex: [
              new RegExp("yandex.[a-z]{2,3}/search/.*?[?&]text=([^&#]+)", "ig"),
              new RegExp("([?&]text=[^&#]+)", "ig")
            ],
            bing: [
              new RegExp("bing.[a-z]{2,3}/search.*?[?&]q=([^&#]+)", "ig"),
              new RegExp("([?&]q=[^&#]+)", "ig")
            ],
            duckduckgo: [
              new RegExp("duckduckgo.[a-z]{2,3}/.*?[?&]q=([^&#]+)", "ig"),
              new RegExp("([?&]q=[^&#]+)", "ig")
            ]
          }[e.search_type[0]],
          i = [];
        if (!s || !s[0].test(t)) {
          return null !== this.state.searched_keyword;
        }
        for (;;) {
          let e = s[1].exec(t);
          if (!e || !e[1]) {
            break;
          }
          let r = String(e[1]).replace(/^.*=/, "").replace(/\+/gi, " ").trim();
          i.push(decodeURIComponent(r));
        }
        return (
          i && i.length > 0 && (this.state.searched_keyword = i.join(" ")),
          null !== this.state.searched_keyword
        );
      },
      check_keywords: function (t) {
        let e = (this.state.searched_keyword || "")
            .replace(/\s/gi, "")
            .toLowerCase(),
          s = t.keyword.replace(/\s/gi, "").toLowerCase();
        return e && e === s;
      },
      get_ggl_place_from_url: function (t) {
        if (!t) {
          return null;
        }
        let e = new RegExp("/maps/place/([^&#/@]+)/", "ig").exec(t);
        return e && e[1]
          ? decodeURIComponent(String(e[1]).replace(/\+/gi, " ").trim())
          : null;
      },
      check_target_url: function (t, e) {
        if ("direct" == this.state.order.search_type[0]) {
          return [!0, this.state.order.url_start];
        }
        let s = this.simplify_url(t.url.toLowerCase(), e.url_keep_qs),
          i = this.simplify_url_domain(t.url.toLowerCase()),
          r = md5(this.pepper + s),
          a = md5(this.pepper + i);
        if (
          this.state.order.url_exact
            ? r === e.url_hashed
            : a === e.url_hostname_hashed
        ) {
          return [!0, t.url];
        }
        let o = this.state.serp_urlclick || this.state.serp_urlhigh || t.url,
          n = md5(
            this.pepper + this.simplify_url(o.toLowerCase(), e.url_keep_qs)
          );
        if (
          a === e.url_hostname_hashed &&
          n === e.url_hashed &&
          "youtube" !== e.search_type[0]
        ) {
          return [!0, o];
        }
        let h = md5(
            this.pepper +
              this.simplify_url(
                (this.state.serp_urlclick || "").toLowerCase(),
                e.url_keep_qs
              )
          ),
          l = md5(
            this.pepper +
              this.simplify_url(
                (this.state.serp_urlhigh || "").toLowerCase(),
                e.url_keep_qs
              )
          );
        if (
          h === e.url_hashed &&
          l === e.url_hashed &&
          this.state.serp_urlclick_ts &&
          (t.openerTabId == this.state.tab_serp_id ||
            t.id == this.state.tab_serp_id)
        ) {
          let t = new Date() - this.state.serp_urlclick_ts;
          if (t < 5e3 && t > 0) {
            return [!0, this.state.serp_urlclick];
          }
        }
        if (
          "googlemaps" == this.state.order.search_type[0] &&
          s.indexOf("/place/") >= 0 &&
          null === this.state.order.url_hashed &&
          null === this.state.order.url_hostname_hashed
        ) {
          let t = this.state.click_meta || {},
            e = t.clickhint || [];
          e.concat(t.highhint || []);
          let i = this.get_ggl_place_from_url(s);
          e.push(i);
          let r = !1;
          for (let t = 0; t < e.length; t++) {
            if (this._az(e[t]) == this._az(this.state.order.url_hint)) {
              r = !0;
              break;
            }
          }
          if (r) {
            return [!0, t.pglocation];
          }
        }
        return [!1, null];
      },
      copy_to_clipboard: function (t) {
        const e = document.createElement("input");
        (e.value = t),
          e.setAttribute("readonly", ""),
          (e.style.position = "absolute"),
          (e.style.top = "-999px"),
          document.body.appendChild(e),
          e.select(),
          document.execCommand("copy"),
          document.body.removeChild(e);
      },
      simplify_url: function (t, e) {
        if (!t || String(t).match(/^(about|chrome|javascript|file):/gi)) {
          return null;
        }
        t.indexOf("://") < 0 && (t = "https://" + t);
        let s = null;
        try {
          s = new URL(t);
        } catch (t) {
          return null;
        }
        let i = this.simplify_www(s.hostname),
          r = String(s.pathname).replace(/\/$/gi, ""),
          a = Array.from(s.searchParams),
          o = "";
        if (e) {
          let t = a.filter(t => t[0] && e.indexOf(t[0]) >= 0);
          if (t.length > 0 && e.length > 0) {
            t.sort(function cmp(t, e) {
              return t[0] > e[0] ? 1 : t[0] < e[0] ? -1 : 0;
            });
            for (let e = 0; e < t.length; e++) {
              o += (0 == e ? "?" : "&") + t[e][0] + "=" + t[e][1];
            }
          }
        }
        return `${i}${r}${o}`;
      },
      simplify_url_domain: function (t) {
        if (!t || String(t).match(/^(about|chrome|javascript|file):/gi)) {
          return null;
        }
        t.indexOf("://") < 0 && (t = "https://" + t);
        try {
          let e = new URL(t);
          return this.simplify_www(e.hostname);
        } catch (t) {
          return null;
        }
      },
      simplify_www: function (t) {
        return String(t)
          .replace(/^www\./gi, "")
          .replace(/\.m\./gi, ".")
          .replace(/^m\./gi, "")
          .toLowerCase();
      },
      unpack_ggl_url: function (t) {
        if (t && t.includes("google.") && t.includes("/url?q=http")) {
          let e = new RegExp("/url\\?q=(http[^&]+)", "ig").exec(t);
          if (e && e[1]) {
            return decodeURIComponent(e[1].replace(/\+/g, " "));
          }
        }
        return t;
      },
      get_xyz: function () {
        return this.xyz;
      },
      keep_xyz: function (t, e) {
        (this.xyz[t] = [
          e.pageX,
          e.pageY,
          e.offsetX,
          e.offsetY,
          new Date().getTime()
        ]),
          Number(this.xyz[t + "_c"])
            ? this.xyz[t + "_c"]++
            : (this.xyz[t + "_c"] = 1);
      },
      theme_toggle: function () {
        (this.theme_enabled = !this.theme_enabled),
          browser.storage.local.set({
            theme_enabled: Boolean(this.theme_enabled)
          }),
          this.set_theme();
      },
      set_theme: function () {
        this.theme_enabled
          ? document.body.classList.add("dark")
          : document.body.classList.remove("dark");
      },
      notifications_toggle: function () {
        (this.notifications_enabled = !this.notifications_enabled),
          browser.storage.local.set({
            notifications_enabled: Boolean(this.notifications_enabled)
          });
      },
      notify_orders_updated: function () {
        let t = this._orders_was || [],
          e = t.length,
          s = Array.from(this.orders || [], t => t.oso_id),
          i = s.length;
        if (i > 0) {
          document.title = "[" + i.toString() + "] " + this._document_title;
          let t = i.toString();
          this.set_badge(t, "green", "white", "orders: " + t),
            (this._favicon.href = FAVICONS[1]);
        } else {
          (document.title = this._document_title),
            this.set_badge("", "gray", "white", "no orders!"),
            (this._favicon.href = FAVICONS[0]);
        }
        if (
          this.notifications_enabled &&
          i > 0 &&
          (i > e ||
            this.loading_counter % 7 == 0 ||
            (i >= e && JSON.stringify(t) != JSON.stringify(s)))
        ) {
          let t = {
            notify: this.orders.length.toString() + " orders available!",
            clear: !0,
            bell: !0
          };
          browser.runtime
            .sendMessage(t)
            .then(() => {})
            .catch(() => {});
        }
        this._orders_was = s;
      },
      _az: function (t) {
        return (t || "").toLowerCase().replace(/[^a-zA-Z0-9]/gi, "");
      }
    }
  }),
  CX_MESSAGES = {
    error: "Something went wrong!\nPlease, try again later.\n",
    logout: "You have been logged out!\nPlease log in again.",
    accepted: "✔ Click was accepted!",
    tabclosed: "✘ Tab was closed too early! Click was rejected!",
    rejected: "✘ Click was rejected!\n",
    noorder: "Order is no longer available. Please try another.",
    429: "Too Many Requests. You have sent too many requests in a given amount of time. Please, don`t do that."
  },
  FAVICONS = ["/icons/serpclix-128.png", "/icons/serpclix-att-128.png"];

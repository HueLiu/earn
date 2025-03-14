const serpclix_login_vueapp = new Vue({
  el: "#serpclix_login_app",
  template: "",
  render: login_vueapp_compiled_template_render,
  staticRenderFns: login_vueapp_compiled_template_static_render_funcs,
  data: {
    message_text: "",
    message_class: "",
    username: "",
    password: "",
    logged_in: !1
  },
  created: function () {
    (this.loading = !1), (this.extra_xyz = {}), this.get_username();
  },
  methods: {
    get_username: function () {
      browser.storage.local
        .get(["last_username", "cid"])
        .then(e => {
          (this.username = e.last_username || username), // custom code
            (this.cid =
              e.cid || `${(~~(Math.random() * 10 ** 8)).toString(16)}`);
        })
        .catch(() => {});
    },
    submit: function () {
      if (!this.username || !this.password || this.loading) {
        return !1;
      }
      browser.storage.local.set({ last_username: this.username }),
        (this.loading = !0),
        (this.message_text = "Please wait ..."),
        (this.message_class = "info");
      const e = {
          method: "POST",
          cache: "no-cache",
          headers: {
            Authorization:
              "Basic " +
              btoa(
                unescape(encodeURIComponent(this.username)) +
                  ":" +
                  unescape(encodeURIComponent(this.password))
              ),
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username: this.username,
            addon_version: browser.runtime.getManifest().version,
            cid: this.cid,
            ua: navigator.userAgent,
            platform: navigator.platform,
            cpus: navigator.hardwareConcurrency,
            mem: navigator.deviceMemory,
            dpr: navigator.devicePixelRatio,
            toches: navigator.maxTouchPoints,
            hc: this.hc(),
            xyz: this.extra_xyz,
            langs: Object.values(navigator.languages)
          })
        },
        s = SERPCLIX_URLS.login + "?pepper=" + this.cid;
      return (
        fetch(s, e)
          .then(e =>
            e
              .json()
              .then(s => {
                this.read_response(e, s);
              })
              .catch(e => {})
          )
          .catch(e => {
            (this.message_text =
              "Error!\n" + (e.message || "Something went wrong!")),
              (this.message_class = "error preline");
          })
          .finally(() => {
            this.loading = !1;
          }),
        !1
      );
    },
    read_response: function (e, s) {
      if (!e.ok) {
        return (
          401 == e.status
            ? (this.message_text =
                "Username or Password incorrect.\nPlease try again.")
            : 403 == e.status
            ? (this.message_text = s.detail || "Access denied!")
            : (this.message_text =
                s.detail || "Server error.\nTry again later."),
          (this.message_class = "error preline"),
          (this.password = ""),
          !1
        );
      }
      if (!s.token) {
        return (
          (this.message_text = s.detail || "Login failed!"),
          (this.password = ""),
          (this.message_class = "error preline"),
          !1
        );
      }
      (this.message_text = "OK!"),
        (this.message_class = "success"),
        (this.logged_in = !0);
      let t = {
        risk_score: s.risk_score,
        auth_token: s.token,
        last_username: this.username,
        username: this.username,
        hidden_messages: [],
        cid: s.cid || this.cid
      };
      browser.storage.local
        .set(t)
        .then(() => {
          browser.runtime.sendMessage({
            logged_in: !0,
            username: this.username
          });
          try {
            // window.close(); // custom code
          } catch (e) {}
        })
        .catch(e => {});
    },
    hc: function () {
      return [
        Number(window.devicePixelRatio),
        Number(navigator.maxTouchPoints),
        Number(window.innerWidth),
        Number(window.innerHeight),
        Number(screen.width),
        Number(screen.height),
        String(window.navigator.webdriver),
        String(window.webdriver),
        String(document.webdriver),
        String("__webdriver_script_fn" in document),
        String(
          "_selenium" in window ||
            "_Selenium_IDE_Recorder" in window ||
            "callSelenium" in window
        ),
        String(window.callPhantom || window._phantom || window.phantom)
      ].join(":");
    },
    keep_xyz: function (e, s) {
      this.extra_xyz[e] = [
        s.pageX,
        s.pageY,
        s.offsetX,
        s.offsetY,
        new Date().getTime()
      ];
    }
  }
});

// custom code
function inputText(name, value) {
  const inputElement = document.getElementsByName(name)[0]; // 获取文本输入框元素
  inputElement.value = "";
  const inputString = value; // 要输入的字符串
  let index = 0; // 当前输入字符的索引
  function simulateInput() {
    if (index < inputString.length) {
      // 如果还有字符需要输入
      const char = inputString.charAt(index); // 获取当前要输入的字符
      const inputEvent = new InputEvent("input", {
        // 创建 input 事件
        inputType: "insertText",
        data: char,
        dataTransfer: null,
        isComposing: false
      });
      inputElement.value += char; // 将当前字符添加到文本输入框中
      inputElement.dispatchEvent(inputEvent); // 分派 input 事件
      index++; // 增加当前输入字符的索引
      setTimeout(simulateInput, 100); // 100 毫秒后模拟下一个字符的输入
    }
  }
  simulateInput(); // 开始模拟输入
  return true;
}

inputText("password", password);
setTimeout(() => {
  document.getElementsByClassName("btn")[0].click();
  console.log("clicked");
}, 5000);

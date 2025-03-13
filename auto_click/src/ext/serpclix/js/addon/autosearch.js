browser.storage.local.get("search_keyword", function (result) {
  const search_keyword = result.search_keyword;
  const searchElement = document.querySelector(
    'input[name="q"], textarea[name="q"], input[name="search_query"]'
  );
  const clickElement = document.querySelector(
    'input[name="btnK"], input[name="btnG"], input[name="search"], button[id="searchbox-searchbutton"], button[class="style-scope ytd-searchbox"], button[class="searchbox_searchButton"], label[class="search icon tooltip"]'
  );
  if (searchElement && !searchElement.value) {
    let url = window.location.href;
    if (url.includes("duckduckgo.")) {
      if (window.location.search) {
        window.location.href = url + "&q=" + search_keyword;
      } else {
        window.location.href = url + "?q=" + search_keyword;
      }
    } else {
      searchElement.value = search_keyword;
      clickElement.click();
    }
  } else if (searchElement && searchElement.value === search_keyword) {
    console.log("Searching successfully.");
  }
});

function continueSearch() {
  let i = window.location.href.toString();
  let is_map = i.includes("google.") && i.includes("/maps/"),
    is_img = i.includes("google.") && i.includes("tbm=isch"),
    is_new =
      i.includes("google.") &&
      (i.includes("tbm=nws") || i.includes("news.google.")),
    is_video =
      i.includes("google.") &&
      (i.includes("tbm=vid") || i.includes("video.google.")),
    is_google = i.includes("google.") && i.includes("/search"),
    is_duck = i.includes("duckduckgo.") && i.includes("q="),
    is_bing = i.includes("bing.") && i.includes("/search"),
    is_youtube = i.includes("youtube.") && i.includes("/results");

  if (is_map) {
    let endElements = document.querySelectorAll(
      'div[class="m6QErb tLjsW eKbjU "]'
    );
    let contentElement = document.querySelectorAll(
      'div[class="m6QErb DxyBCb kA9KIf dS8AEf ecceSd QjC7t"]'
    )[0];
    if (!endElements) {
      contentElement.scrollTo(0, contentElement.scrollHeight);
    } else {
    }
  } else if (is_img) {
  } else if (is_new) {
  } else if (is_video) {
  } else if (is_google) {
  } else if (is_duck) {
  } else if (is_bing) {
  } else if (is_youtube) {
  }
}

function getUrlParameter(name) {
  const reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
  const r = window.location.search.substring(1).match(reg);
  if (r != null) {
    return decodeURI(r[2]);
  }
  return null;
}

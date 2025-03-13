"use strict";

const manifest = browser.runtime.getManifest();
const pluginVersion = manifest.version;

let baseUrl = 'https://jobs.ClicksPaid.com';
let testUrl = '';

let testMode = false;
let debug = false;
if (debug) {
    log('DebugMode enabled');
}
if (testMode) {
    // baseUrl = testUrl;
    console.log('TestMode enabled');
}

let addResponceHeaders = true;
let activeTab = null;
let loggedIn = false;
let testAutoLogin = '';
let showAlertsInsteadOfNotifications = false;
let authToken = null;
let defaultOptions = {method: 'POST', cache: 'no-cache', headers: {'api-version': '1.1'}};
let formData = new FormData();
let taskObject = null;
let oldTaskID = 0;
let oldBotMode = null;
let taskAccepted = false;
let taskTab = null;
let indexTab = null;
let comebackTimer = 0;
let comebackTimerID = null;
let taskTimer = 0;
let taskTimerID = null;
let taskTimerTimeoutID = null;
let logTimer = 0;
let logTimerID = null;
let taskStayOnPageTimer = 0;
let taskStayOnPageTimerID = null;
let taskStayOnPageTimerTimeoutID = null;
let notification1TimeoutID = null;
let notification2TimeoutID = null;
let taskSearchEngine = '';
let hideAdwords = true;
let kewordsMatchInSearch = false;
let tempInstall = false;
let taskLogs = [];
let isAndroid = false;
let tabActivatingObject = {highlighted: true};
let firstSearchEngineVisit = true;
let isRuningStayOnPage = false;
let isClickOnFoundLink = false;

log('Started background script');

function log(message, data = null) {
    if (debug) {
        if (data) {
            console.log(message, data);
        } else {
            console.log(message);
        }
    }
}

function handleError(error) {
    if (typeof error !== 'undefined') {
        console.error(error);
    }
}

function handleActivated(activeInfo) {
    if (!!taskObject) {
        if (taskStayOnPageTimer !== parseInt(taskObject.stay_on_site_seconds)) {
            log('handleActivated', activeInfo);
            log(taskStayOnPageTimer);

            browser.tabs.update(taskTab.id, tabActivatingObject)
                .then(response => {
                    log('browser.tabs.update', response);
                }, handleError);
        }
    }
}

function handleIndexScriptResponse(message) {
    if (typeof message !== 'undefined') {
        log('handleIndexScriptResponse', message);
    }
}

function notifyIndexScript(message, data = {}) {
    let request = data;
    request.message = message;

    log('Message for the index script', request);

    const sending = browser.runtime.sendMessage(request);
    sending.then(handleIndexScriptResponse, handleError);
}

function notifyTabs(message, data = {}) {
    let request = data;
    request.message = message;

    browser.tabs.query({
        currentWindow: true,
        active: true
    }).then(tabs => {
        for (let tab of tabs) {
            browser.tabs.sendMessage(
                tab.id,
                request
            ).then(() => {
                log('Message from the content script', request);
            }).catch(handleError);
        }
    }).catch(handleError);
}

function clearTaskData() {
    log('clearTaskData()');
    taskTab = null;
    if (!!taskObject) {
        oldTaskID = taskObject.id;
        oldBotMode = taskObject.bot_mode;
    }
    taskObject = null;
    taskAccepted = false;
    firstSearchEngineVisit = true;
    isRuningStayOnPage = false;
    kewordsMatchInSearch = false;
    isClickOnFoundLink = false;

    browser.browserAction.setBadgeText({'text': ''})
        .then(() => {
            // log('clearTaskData() | setBadgeText: ""');
        }, handleError);

    browser.storage.local.set({'isComebackStatus': 0})
        .then(() => {
            log('clearTaskData() | set storage isComebackStatus: 0');
        }, handleError);

    log('clearTaskData() | cleared variables: taskTab, taskObject, taskAccepted');
    log('clearTaskData() | setting variables: oldTaskID, oldBotMode');
}

function checkNotify() {
    let permissionsToRequest = {
        "origins": [
            "https://*/*",
            "http://*/*"
        ],
        "permissions": [
            "activeTab",
            "alarms",
            "notifications",
            "clipboardRead",
            "clipboardWrite",
            "webRequest",
            "webRequestBlocking",
            "webNavigation",
            "privacy",
            "storage",
            "tabs",
        ]
    };

    browser.permissions.getAll()
        .then((permissions) => {
            let permissionsPassed = true;
            for (let origin of permissionsToRequest.origins) {
                if (typeof permissions.origins !== 'undefined' && !permissions.origins.includes(origin)) {
                    permissionsPassed = false;
                }
            }

            for (let permission of permissionsToRequest.permissions) {
                if (typeof permissions.permissions !== 'undefined' && !permissions.permissions.includes(permission)) {
                    permissionsPassed = false;
                }
            }

            if (!permissionsPassed) {
                browser.permissions.request(permissionsToRequest)
                    .then((response) => {
                        if (response) {
                            log('checkNotify() | Permission was granted');
                        } else {
                            showAlertsInsteadOfNotifications = true;
                            log('checkNotify() | Permission was refused');
                        }
                        return browser.permissions.getAll();
                    }, (error) => {
                        showAlertsInsteadOfNotifications = true;
                        handleError(error)
                    })
                    .then((currentPermissions) => {
                        log('checkNotify() | Current permissions', currentPermissions);
                    }, (error) => {
                        showAlertsInsteadOfNotifications = true;
                        handleError(error)
                    });
            }
        }, (error) => {
            showAlertsInsteadOfNotifications = true;
            handleError(error)
        });
}

function setTaskFailed(onClosedIndex = true) {
    log('setTaskFailed()');
    stopAllTimers();
    clearTaskData();

    if (onClosedIndex) {
        browser.storage.local.set({'isTaskFailed': 1})
            .then(() => {
                showMessage('Task failed', 'You failed current task. Try again later', 5);
                log('setTaskFailed() | set storage isTaskFailed: 1');
            }, handleError);
    } else {
        showMessage('Task failed', 'You failed current task. Try again', 5);
        notifyIndexScript('task_fail');
    }
}

function checkTaskFailed(onOpenedIndex = false) {
    log('checkTaskFailed()');
    browser.storage.local.get("isTaskFailed")
        .then((result) => {
            if (result.isTaskFailed && result.isTaskFailed === 1) {
                if (onOpenedIndex) {
                    showMessage('Previous task failed', 'Last task was failed, please try again later', 5);
                } else {
                    showMessage('Task failed', 'Last task was failed, please try again later', 5);
                }

                browser.storage.local.set({'isTaskFailed': 0})
                    .then(() => {
                        log('checkTaskFailed() | set storage isTaskFailed: 0');
                    }, handleError);
            }
        }, handleError);
}

function onCloseTab() {
    log('onCloseTab()');
    clearTaskData();
    stopAllTimers();
}

function checkAuth(shouldOpenIndexTab = false) {
    log('checkAuth() | with shouldOpenIndexTab = ' + shouldOpenIndexTab);
    browser.storage.local.get("authToken")
        .then((result) => {
            if (result.authToken) {
                log("Logged in");
                log('authToken is ' + result.authToken);
                loggedIn = true;
                authToken = result.authToken;
                defaultOptions.auth_key_hash = result.authToken;

                log('Set empty popup because');
                browser.browserAction.setPopup({popup: ""})
                    .then(() => {
                        log("Logged in");
                        if (shouldOpenIndexTab) {
                            log('If shouldOpenIndexTab');
                            openIndexTab();
                        }
                    }, handleError);
            } else {
                log('Set popup.html popup because');
                browser.browserAction.setPopup({popup: "popup.html"})
                    .then(() => {
                        log("NOT Logged in");
                        if (tempInstall) {
                            notifyIndexScript('set_username', {username: testAutoLogin});
                        }
                    }, handleError);
            }
        }, handleError);
}

function openIndexTab() {
    log('openIndexTab()');
    if (loggedIn) {
        log('openIndexTab() | we are logged in');
        browser.tabs.query({url: browser.runtime.getURL("index.html")})
            .then((tabs) => {
                log('openIndexTab() | get tabs which is index.html');
                if (tabs.length === 0) {
                    log('openIndexTab() | tab is not opened yet');
                    browser.tabs.create({"url": "index.html"})
                        .then((tab) => {
                            log("openIndexTab() | we are open index page now", tab);
                            indexTab = tab;
                        }, handleError);
                } else {
                    log('openIndexTab() | index tab already opened');
                    browser.tabs.update(indexTab.id, tabActivatingObject)
                        .then(response => {
                            log('openIndexTab() | browser.tabs.update', response);
                        }, handleError);
                }
            });
    }
}

function stopAllTimers() {
    log('stopAllTimers()');
    if (taskTimerID) {
        clearInterval(taskTimerID);
    }
    if (logTimerID) {
        clearInterval(logTimerID);
    }
    if (taskStayOnPageTimerID) {
        clearInterval(taskStayOnPageTimerID);
    }
    if (taskTimerTimeoutID) {
        clearTimeout(taskTimerTimeoutID);
    }
    if (taskStayOnPageTimerTimeoutID) {
        clearTimeout(taskStayOnPageTimerTimeoutID);
    }
    if (notification1TimeoutID) {
        clearTimeout(notification1TimeoutID);
    }
    if (notification2TimeoutID) {
        clearTimeout(notification2TimeoutID);
    }
}

function taskCompleted() {
    log('taskCompleted()');
    showMessage('Task completed', 'You can get a new task, when the Get New Task button is active', 6);
    notifyIndexScript('task_complete');
    clearTaskData();
    stopAllTimers();
}

function stayOnPage() {
    if (isRuningStayOnPage) {
        log('stayOnPage() | already run');
        return false;
    }

    log('stayOnPage()');
    clearInterval(taskStayOnPageTimerID);

    log('Show message to stay on site');
    if (isAndroid) {
        showMessage('Attention please!!!', 'Please stay on this site ' + taskObject.stay_on_site_seconds + ' seconds. When the time is out, you will be redirected', 6);
    } else {
        showMessage('Attention please!!!', 'Please wait until the timer on the plugin icon has finished', 6);
    }

    notification1TimeoutID = setTimeout(() => {
        showMessage('Notification', 'Please open a random page on this website', 6);
    }, 30 * 1000);

    notification2TimeoutID = setTimeout(() => {
        showMessage('Notification', 'You can now get a new task', 6);
    }, 60 * 1000);

    browser.browserAction.setBadgeText({"text": '' + taskStayOnPageTimer})
        .then(() => {
            // log('stayOnPage() | setBadgeText: ""');
        }, handleError);

    taskStayOnPageTimerTimeoutID = setTimeout(() => {
        clearInterval(taskStayOnPageTimerID);
        if (!!taskObject) {
            log('stayOnPage() | if task started');
            browser.tabs.update(indexTab.id, tabActivatingObject)
                .then(() => {
                    taskCompleted();
                    // if (isAndroid) {
                    //     showMessage('Thank you', 'Now you can take another task', 6);
                    // }
                }, handleError);
        }
    }, taskStayOnPageTimer * 1000);

    taskStayOnPageTimerID = setInterval(() => {
        taskStayOnPageTimer--;
        log(taskStayOnPageTimer);
        if (taskStayOnPageTimer >= 0) {
            browser.browserAction.setBadgeText({"text": '' + taskStayOnPageTimer})
                .then(response => {
                    // log('browser.browserAction.setBadgeText: ');
                    // log(response);
                }, handleError);
        }
    }, 1000);

    isRuningStayOnPage = true;
}

function startTaskTimer() {
    log('called function startTaskTimer');
    clearInterval(taskTimerID);
    taskTimerTimeoutID = setTimeout(() => {
        clearInterval(taskTimerID);
        showMessage('Task is timed out', 'please come back to get new task', 6);
        browser.browserAction.setBadgeText({"text": ''})
            .then(response => {
                // log('browser.browserAction.setBadgeText: ');
                // log(response);
            }, handleError);

        if (!!taskTab) {
            // browser.tabs.remove(taskTab.id)
            //     .then(()=>{
            //         log('Removed tab on timeout');
            //
            //     }, handleError)
            taskTab = null;
        }

        if (!!taskObject) {
            oldTaskID = taskObject.id;
            oldBotMode = taskObject.bot_mode;
            taskObject = null;
        }

        notifyIndexScript('task_timedout');
    }, taskTimer * 1000);

    taskTimerID = setInterval(() => {
        taskTimer--;
        if (taskTimer >= 0) {
            notifyIndexScript('ttl_second_update_text', {text: '' + taskTimer});
        }
    }, 1000);
}

function startLogTimer() {
    log('called function startLogTimer');
    clearInterval(logTimerID);
    setTimeout(() => {
        clearInterval(logTimerID);
    }, logTimer * 1000);
    logTimerID = setInterval(() => {
        logTimer--;
    }, 1000);
}

function startComebackTimer() {
    browser.storage.local.get('isComebackStatus')
        .then(response => {
            log('called function startComebackTimer');
            log(response);

            if (response.isComebackStatus) {
                return false;
            }
        }, handleError);

    clearInterval(comebackTimerID);
    setTimeout(() => {
        clearInterval(comebackTimerID);
        notifyIndexScript('task_get_button_update_text', {text: 'Get a new task'});
        notifyIndexScript('task_get_button_enable');
    }, comebackTimer * 1000);

    comebackTimerID = setInterval(() => {
        comebackTimer--;
        if (comebackTimer >= 0) {
            let minutes = Math.floor(comebackTimer / 60);
            let seconds = comebackTimer - minutes * 60;
            let text;
            if (minutes > 0) {
                text = minutes + ' min ' + seconds;
            } else {
                text = seconds;
            }

            notifyIndexScript('task_get_button_disable');
            notifyIndexScript('task_get_button_update_text', {text: 'After : ' + text + ' seconds'});
            browser.storage.local.set({'isComebackStatus': 1})
                .then(() => {
                    log('set storage: isComebackStatus = 1');
                }, handleError);
        } else {
            browser.storage.local.set({'isComebackStatus': 0})
                .then(() => {
                    log('set storage: isComebackStatus = 0');
                }, handleError);
        }
    }, 1000);
}

function copy(str) {
    log('called function copy');
    let sandbox = $('#sandbox').val(str).select();
    document.execCommand('copy');
    sandbox.val('');
}

// function showDoubleMessage(title, message, clearTime = 0) {
//     if (showAlertsInsteadOfNotifications) {
//         notifyTabs('show_alert', {
//             text: 'ClicksPaid tasks: ' + "\r\n" + title + "\r\n" + message
//         });
//     } else {
//         let opt = {
//             type: 'basic',
//             title: title,
//             message: message,
//             priority: 1,
//             iconUrl: 'icon.png'
//         };
//
//         browser.notifications.create('notify1', opt)
//             .then((id) => {
//                 if (clearTime > 0) {
//                     setTimeout(() => {
//                         browser.notifications.clear(id)
//                             .then(() => {
//                             }, handleError);
//                     }, clearTime * 1000);
//                 }
//             }, handleError);
//     }
// }

function showMessage(title, message, clearTime = 0, generateNewMessage = false) {
    log ('showMessage()', title);

    if (showAlertsInsteadOfNotifications) {
        notifyTabs('show_alert', {
            text: 'ClicksPaid tasks: ' + "\r\n" + title + "\r\n" + message
        });
    } else {
        let opt = {
            type: 'basic',
            title: title,
            message: message,
            priority: 1,
            iconUrl: 'icon.png'
        };
        let notifyMessageId = 'notify1';
        if (generateNewMessage) {
            notifyMessageId = '';
        }

        browser.notifications.create(notifyMessageId, opt)
            .then((id) => {
                if (clearTime > 0) {
                    setTimeout(() => {
                        browser.notifications.clear(id)
                            .then(() => {
                            }, handleError);
                    }, clearTime * 1000);
                }
            }, handleError);
    }
}

function matchUrl(target_url, testing_url) {
    let lastString = target_url.replace(/\./g, '\\.');
    let reg = lastString.replace(/\*/g, '\.');
    let re = new RegExp('^http://' + reg, 'i');
    let re0 = new RegExp('^https://' + reg, 'i');
    let re1 = new RegExp('^http://www.' + reg, 'i');
    let re2 = new RegExp('^https://www.' + reg, 'i');
    let reVideo = new RegExp(reg, 'i');

    if ((testing_url.indexOf('youtube.com') !== -1 || testing_url.indexOf('google.com') !== -1) &&
        testing_url.indexOf('watch?v=') !== -1)
    {
        log ('is Video search');
        return reVideo.test(testing_url);
    }

    return re.test(testing_url) || re0.test(testing_url) || re1.test(testing_url) || re2.test(testing_url);
}

browser.tabs.onActivated.addListener(handleActivated);

browser.tabs.onRemoved.addListener(function (tabid) {
    log('Fired tabs.onRemoved event');
    if (!!taskObject) {
        if (parseInt(tabid) === parseInt(indexTab.id)) {
            log('Closed tab is index, task is failed');
            if (!!taskTab && taskTab.id) {
                browser.tabs.remove(taskTab.id)
                    .then(() => {
                        log('removed opened task tab by closing parent index tab');
                    }, handleError);
            }
            setTaskFailed();
        }

        if (taskTab) {
            if (parseInt(tabid) === parseInt(taskTab.id)) {
                log('Closed tab ' + tabid + ' is taskTab, task is failed');
                setTaskFailed(false);
            }
        }
    }
})

browser.runtime.onInstalled.addListener(function (details) {
    log('Fired onInstalled event');
    if (details.temporary) {
        log('This is temporary installation');
        tempInstall = true;
    }
    checkAuth();
    checkNotify();
});

browser.webNavigation.onCompleted.addListener(function (info) {
    if (!!taskObject && taskAccepted) {
        log('browser.webNavigation.onCompleted: tabId ' + info.tabId);
        log('taskTab.id: ' + taskTab.id);
        if (parseInt(info.tabId) === parseInt(taskTab.id)) {
            let taskSearchEngineTmp = taskSearchEngine;
            let advandcedParam = '';

            if (taskSearchEngine.indexOf('google.com') !== -1) {
                taskSearchEngineTmp = 'https://www.google.com';

                if (taskSearchEngine.indexOf('tbm=vid') !== -1) {
                    advandcedParam = 'tbm=vid';
                } else if (taskSearchEngine.indexOf('tbm=isch') !== -1) {
                    advandcedParam = 'tbm=isch';
                } else if (taskSearchEngine.indexOf('tbm=nws') !== -1) {
                    advandcedParam = 'tbm=nws';
                }
            }

            if (info.url.substring(0, taskSearchEngineTmp.length) === taskSearchEngineTmp && (advandcedParam === '' || info.url.indexOf(advandcedParam) !== -1)) {
                log('loaded page is Search Engine and has url: ' + taskSearchEngine);
                browser.tabs.query({
                    currentWindow: true,
                    active: true
                }).then(() => {
                    log('Geting active tab: ');

                    if (hideAdwords) {
                        notifyTabs('hide_adwords');
                    }

                    notifyTabs('mark_website', {
                        searchEngine: taskSearchEngine,
                        target_url: taskObject.target_url,
                        preferred_url: (typeof taskObject.preferred_url !== 'undefined' ? taskObject.preferred_url : ''),
                        xads: hideAdwords,
                        isAndroid: isAndroid,
                        search: taskObject.key_phrase,
                        isRepeat: 0
                    });

                    if (firstSearchEngineVisit) {
                        if (showAlertsInsteadOfNotifications) {
                            showMessage('Press [Ctrl+V]', 'or type in search keywords: ' + "\r\n" + taskObject.key_phrase + "\r\n and looking for url matching: " + taskObject.target_url, 6);
                        } else {
                            showMessage('Looking for url matching:', "" + taskObject.target_url, 0, true);
                            showMessage('Press [Ctrl+V]', 'or type in search keywords: ' + "\r\n" + taskObject.key_phrase, 0, true);
                        }
                        firstSearchEngineVisit = false;
                    }
                }).catch(handleError);
            }

            if (matchUrl(taskObject.target_url, info.url)) {
                log('This is target_url');
                if (kewordsMatchInSearch && isClickOnFoundLink) {
                    stayOnPage(true);
                } else {
                    log('kewordsMatchInSearch: ' + kewordsMatchInSearch);
                }
            }
        }
    }
});

browser.webNavigation.onHistoryStateUpdated.addListener(function (info) {
    if (!!taskObject && taskAccepted) {
        log('browser.webNavigation.onHistoryStateUpdated: tabId ' + info.tabId);
        log('taskTab.id: ' + taskTab.id);
        if (parseInt(info.tabId) === parseInt(taskTab.id) && info.url.indexOf('https://www.youtube.com') !== -1) {
            if (matchUrl(taskObject.target_url, info.url)) {
                log('This is target_url');
                if (kewordsMatchInSearch && isClickOnFoundLink) {
                    stayOnPage(true);
                } else {
                    log('kewordsMatchInSearch: ' + kewordsMatchInSearch);
                }
            }
        }
    }
});

browser.webRequest.onBeforeRequest.addListener(
    function (info) {
        log('browser.webRequest.onBeforeRequest: tabId ' + info.tabId);

        if (!!taskObject && taskAccepted) {
            if (parseInt(info.tabId) === parseInt(taskTab.id)) {
                let taskSearchEngineTmp = taskSearchEngine;
                if (taskSearchEngine.indexOf('google.com') !== -1) {
                    taskSearchEngineTmp = 'www.google.com';
                }

                if (info.url.indexOf(taskSearchEngineTmp) === -1 && matchUrl(taskObject.target_url, info.url)) {
                    log('We find target_url');
                    // if bot mode assumed the just ping the google
                    if (taskObject.bot_mode === 1 || taskObject.bot_mode === 3) {
                        log('if PING MODE: ');
                        // when target url is about to load we finish job and close task
                        browser.tabs.remove(taskTab.id)
                            .then(() => {
                                log('removed opened tab');
                                onCloseTab();
                                taskCompleted();
                            }, handleError);
                        return {cancel: true};
                    } else {
                        // if (info.url.indexOf('https://www.youtube.com') !== -1) {
                            // stayOnPage();
                        // }
                    }
                }
            }
        }
        return {cancel: false};
    },
    {
        urls: [
            "https://*/*",
            "http://*/*"
        ]
    }, ["blocking"]);

browser.webRequest.onCompleted.addListener((info) => {
    // log('browser.webRequest.onBeforeRequest');

    if (!!taskObject && taskAccepted) {
        if (parseInt(info.tabId) === parseInt(taskTab.id)) {
            if (taskObject.bot_mode === 2 || taskObject.bot_mode === 3) {
                if (logTimer > 0) {
                    let requestObject = {
                        frameId: info.frameId,
                        statusCode: info.statusCode,
                        method: info.method,
                        url: info.url,
                        fromCache: info.fromCache,
                        initiator: info.initiator,
                        ip: info.ip,
                        parentFrameId: info.parentFrameId,
                        requestId: info.requestId,
                        statusLine: info.statusLine,
                        tabId: info.tabId,
                        timeStamp: info.timeStamp,
                        type: info.type,
                        responseHeaders: '',
                    };
                    if (addResponceHeaders) {
                        requestObject.responseHeaders = JSON.stringify(info.responseHeaders);
                    }
                    taskLogs.push(JSON.stringify(requestObject))
                }
            }
        }
    }
}, {urls: ["<all_urls>"]}, ["responseHeaders"]);

browser.browserAction.onClicked.addListener(function () {
    log('browser.browserAction.onClicked');
    log('Fired browserAction.onClicked event');
    // openIndexTab();
    checkAuth(true);
});

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    log('browser.runtime.onMessage', request);

    if (request.message === "index_opened") {
        checkTaskFailed(true);
        checkNotify();
    }

    if (request.message === "set_query_match") {
        kewordsMatchInSearch = request.isMatch;
        log('set_query_match | kewordsMatchInSearch = ' + kewordsMatchInSearch);
    }

    if (request.message === "set_click_on_found_link") {
        isClickOnFoundLink = request.isClickOnFoundLink;
        log('set_query_match | isClickOnFoundLink = ' + isClickOnFoundLink);
    }

    if (request.message === "set_email") {
        browser.storage.local.set({'userLogin': request.email})
            .then(() => {
                // notifyIndexScript('set_username', {username: request.email});
            }, handleError);
    }

    if (request.message === "request_username") {
        browser.storage.local.get('userLogin')
            .then((result) => {
                log('Readed saved user login');
                notifyIndexScript('set_username', {username: result.userLogin});
            }, handleError);
    }

    if (request.message === "try_auth") {
        log('Message is: try_auth');
        formData = new FormData();
        formData.append("email", request.email);
        formData.append("password", request.password);
        formData.append("bot_type_id", 1);
        defaultOptions.body = formData;

        let url = baseUrl + "/bot/register";
        fetch(url, defaultOptions)
            .then(response => response.json())
            .then((response) => {
                /**
                 * @param {Object} response
                 * @param {Object} response.data
                 * @param {string} response.bot_auth_key_hash
                 */

                log('response.data');
                log(response.data);

                if (response.success) {
                    log('response object is');
                    log(response);
                    browser.storage.local.set({'authToken': response.data.bot_auth_key_hash})
                        .then(() => {
                            log('AuthToken saved in storage');
                            checkAuth(true);
                        }, handleError);
                } else {
                    // let error = 'Please try again';
                    // if (parseInt(response.error.errorCode) === 1) {
                    // error = "Please check you credentials and try again."
                    // }
                    log('Authentication response error');
                    log(response);
                    notifyIndexScript('show_login_error', {error: response.error.message});
                    notifyIndexScript('set_username', {username: request.email});
                }
            })
            .catch(error => {
                log('Authentication request error');
                log(error);
                notifyIndexScript('show_login_error');
                notifyIndexScript('set_username', {username: request.email});
            });

        browser.tabs.query({active: true, currentWindow: true})
            .then((tabs) => {
                activeTab = tabs[0];
            }, handleError);
    }

    if (request.message === "get_task") {
        log('get_task');
        if (!!taskObject) {
            setTaskFailed(false);
        }
        formData = new FormData();
        formData.append("auth_key_hash", authToken);
        formData.append("plugin_version", pluginVersion);
        defaultOptions.body = formData;

        let url = testMode ? testUrl + '/get-task.php' : baseUrl + "/bot/task/get";
        fetch(url, defaultOptions)
            .then(response => response.json())
            .then((response) => {
                /**
                 * @param {Object} response
                 * @param {boolean} response.success
                 * @param {Object} response.data
                 * @param {string} response.comeback_delay_seconds
                 * @param {Object} response.task
                 * @param {string} response.taskid
                 * @param {string} response.task.target_url
                 * @param {string} response.task.preferred_url
                 * @param {string} response.task.key_phrase
                 * @param {string} response.task.ttl_second
                 * @param {string} response.task.stay_on_site_seconds
                 * @param {number} response.task.bot_mode
                 * @param {string} response.task.gtld
                 * @param {boolean} response.task.xads
                 * @param {number} response.log_actions_seconds // optional
                 */

                log('get_task | response: ');
                log(response);
                if (response.data.task) {
                    taskObject = response.data.task;
                    taskTimer = taskObject.ttl_second;
                    taskStayOnPageTimer = parseInt(taskObject.stay_on_site_seconds);
                    comebackTimer = parseInt(response.data.comeback_delay_seconds);

                    if (!response.data.task.bot_mode) {
                        response.data.task.bot_mode = 0;
                    }

                    if (!response.data.task.gtld) {
                        response.data.task.gtld = 'https://www.google.com/';
                    }

                    if (!response.data.task.xads) {
                        response.data.task.xads = true;
                    }

                    taskSearchEngine = response.data.task.gtld;
                    hideAdwords = response.data.task.xads;

                    log('URL: ' + response.data.task.target_url);
                    log('KEY: ' + response.data.task.key_phrase);

                    if (response.data.log_actions_seconds) {
                        logTimer = parseInt(response.data.log_actions_seconds);
                    }
                    log('task_id_get');
                    log(taskObject.id);
                    notifyIndexScript('task_get_success', {response: response});

                    startTaskTimer();
                    startComebackTimer();
                    if (taskObject.bot_mode === 2 || taskObject.bot_mode === 3) {
                        startLogTimer();
                    }
                } else {
                    if (response.data.comeback_delay_seconds) {
                        let time = parseInt(response.data.comeback_delay_seconds);
                        let minutes = Math.floor(time / 60);
                        let seconds = time - minutes * 60;
                        let text;
                        if (seconds > 0) {
                            seconds = seconds + ' sec.'
                        } else {
                            seconds = '';
                        }
                        if (minutes > 0) {
                            text = minutes + ' min ' + seconds;
                        } else {
                            text = seconds;
                        }

                        showMessage('No available tasks', 'Please try again after: ' + text, 5);
                    } else {
                        showMessage('No available tasks', 'Please try again later', 6);
                    }

                    log('get_task | task response error');
                    taskObject = null;
                    taskTimer = 0;
                    taskStayOnPageTimer = 0;
                    comebackTimer = parseInt(response.data.comeback_delay_seconds);
                    startComebackTimer();
                }
            })
            .catch(error => {
                showMessage('Task request error', 'Please try again later', 5);
                log('get_task | task request error:');
                log(error);
            });
    }

    if (request.message === "start_task") {
        log('start_task | taskTimer:');
        log(taskTimer);

        if (taskTimer > 5) {
            browser.tabs.create({
                url: taskSearchEngine
            }).then((tab) => {
                taskAccepted = true;
                taskTab = tab;
                log('Tab created');
                log(taskTab);
                //showMessage('Press [Ctrl+V]', 'or type in search keywords : '+"\r\n"+taskObject.key_phrase, 6);
            }, handleError);
        } else {
            setTaskFailed(false);
            // showMessage('Sorry','This task is timed out',5);
        }
    }

    if (request.message === "send_report") {
        log('send_report');
        if (parseInt(oldBotMode) === 2 || parseInt(oldBotMode) === 3) {
            defaultOptions.body = '';
            defaultOptions.body = JSON.stringify(taskLogs);
        }

        formData = new FormData();
        formData.append("task_id_return", oldTaskID);
        formData.append("auth_key_hash", authToken);
        formData.append("version", pluginVersion);
        formData.append("plugin_version", pluginVersion);
        defaultOptions.body = formData;

        let url = testMode ? testUrl + '/report.php' : baseUrl + "/bot/task/report";
        fetch(url, defaultOptions)
            .then(response => response.json())
            .then((response) => {
                log('send_report | response: ');
                log(response);
                if (response.success) {
                    if (response.data.comeback_delay_seconds) {
                        comebackTimer = parseInt(response.data.comeback_delay_seconds);
                        log('send_report | comebackTimer = ' + comebackTimer);
                        startComebackTimer();
                    }
                } else {
                    showMessage('Report response error', 'Server not accepted report. Please contact support.', 5);
                    log('send_report | report response error:');
                    log(response);
                }
            })
            .catch(error => {
                log('send_report | report request error:');
                log(error);
            });
        browser.tabs.query({active: true, currentWindow: true})
            .then((tabs) => {
                activeTab = tabs[0];
            }, handleError);
    }

    if (request.message === "log_out") {
        log('log_out | removed opened task tab by closing parent index tab');
        if (!!indexTab && indexTab.id) {
            browser.tabs.remove(indexTab.id)
                .then(() => {
                    log('removed indexTab by logout button');
                }, handleError);
        }
    }

    if (request.message === "repeat_mark_website") {
        log('repeat_mark_website');

        notifyTabs('mark_website', {
            searchEngine: taskSearchEngine,
            target_url: taskObject.target_url,
            preferred_url: (typeof taskObject.preferred_url !== 'undefined' ? taskObject.preferred_url : ''),
            xads: hideAdwords,
            isAndroid: isAndroid,
            search: taskObject.key_phrase,
            isRepeat: 1
        });
    }

    sendResponse({response: "Response from background script"});
});

$(function () {
    log('Started plugin version ' + pluginVersion);

    browser.runtime.getPlatformInfo()
        .then(info => {
            log('getBrowserInfo', info);

            if (info.os.indexOf('android') !== -1) {
                log('android detected');
                log('browser.windows is not supported');
                isAndroid = true;
                showAlertsInsteadOfNotifications = true;
                tabActivatingObject = {active: true};
            } else {
                browser.windows.onCreated.addListener(function () {
                    log('Fired windows.onCreated event');
                    checkAuth();
                });
            }
        });
});
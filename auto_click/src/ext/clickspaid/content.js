'use strict';

const debug = false;

const hideAd = '.ads-ad, #tads, #bottomads, #taw, aside, [data-layout="ad"], [data-layout="related_searches"]';

let isMatch = false;
let isUrlFound = false;

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

function handleBackgroundScriptResponse(message) {
    if (typeof message !== 'undefined') {
        log('Message from the content script', message);
    }
}

function notifyBackgroundPage(message, data = {}) {
    let request = data;
    request.message = message;

    log('Message for the background script', request);

    const sending = browser.runtime.sendMessage(request);
    sending.then(handleBackgroundScriptResponse, handleError);
}

function hashHandler() {
    let oldHash = window.location.href;
    let timeInterval;

    let detect = function () {
        if (oldHash !== window.location.href) {
            clearInterval(timeInterval);
            if (!isMatch) {
                notifyBackgroundPage('repeat_mark_website');
            }

            return true;
        }
    };

    timeInterval = setInterval(function () {
        detect();
    }, 100);
}

browser.runtime.onMessage.addListener(request => {
    if (request.message === 'show_alert') {
        alert(request.text);
    }

    log('browser.runtime.onMessage', request);

    if (request.message === 'hide_adwords') {
        log('hide_adwords');
        $(document).ready(function() {
            $(hideAd).hide();
        });
    }

    if (request.message === 'mark_website') {
        log('mark_website | request.search: ' + request.search);
        $(document).ready(function() {
            let defaultSearchVal = $('[name="q"]').val();
            let currentSearchVal = defaultSearchVal;

            let searchEngine = request.searchEngine;
            let currentUrl = document.location.href;
            log('mark_website', currentUrl);
            if (searchEngine) {
                if (searchEngine.indexOf('google.com/search') !== -1) {
                    currentSearchVal = $('textarea[name="q"]').val();
                    if (currentSearchVal) {
                        currentSearchVal = $('input[name="q"]').val();
                    }
                }

                if (searchEngine.indexOf('google.com/maps') !== -1) {
                    currentSearchVal = $('input[name="q"]').val();
                }

                if (searchEngine.indexOf('bing.com') !== -1) {
                    currentSearchVal = $('input[name="q"]').val();
                    if (currentSearchVal !== request.search) {
                        currentSearchVal = $('textarea[name="q"]').val();
                    }
                }

                if (searchEngine.indexOf('duckduckgo.com') !== -1) {
                    currentSearchVal = $('input[name="q"]').val();
                }

                if (searchEngine.indexOf('youtube.com') !== -1) {
                    currentSearchVal = $('input[name="search_query"]').val();
                    if (currentSearchVal !== request.search) {
                        currentSearchVal = $('input[name="search"]').val();
                    }
                }

                hashHandler();
            }

            if (currentSearchVal !== request.search) {
                currentSearchVal = defaultSearchVal;
            }

            // let isAndroid = request.isAndroid;
            // if (isAndroid) {
            //     currentSearchVal = $('header div form div div textarea[name="q"]').val();
            // }

            if (currentSearchVal === request.search) {
                let listFoundEl = [];

                log('currentSearchVal === request.search');

                log('mark_website | request.message');
                isMatch = true;
                notifyBackgroundPage('set_query_match', {'isMatch': isMatch});

                for (let i = 0; i < 3; i++) {
                    let testUrl = request.target_url;

                    if (request.preferred_url) {
                        if (i === 0) {
                            testUrl = request.preferred_url;
                            testUrl = testUrl.split('?')[0].replace(/^\/|\/$/g, '');
                            testUrl = testUrl.replace('/', '%2F');
                        } else if (i === 1) {
                            testUrl = request.preferred_url;
                            testUrl = testUrl.split('?')[0].replace(/^\/|\/$/g, '');
                            testUrl = testUrl.replace('%2F', '/');
                        }
                    } else {
                        i = 2;
                    }

                    log('mark_website | url: ' + testUrl);

                    let lastString = testUrl.replace(/\./g, '\\.');
                    let reg = lastString.replace(/\*/g, '\.');
                    let re = new RegExp('^http://' + reg, 'i');
                    let re0 = new RegExp('^https://' + reg, 'i');
                    let re1 = new RegExp('^http://www.' + reg, 'i');
                    let re2 = new RegExp('^https://www.' + reg, 'i');
                    let re3 = new RegExp('^www.' + reg, 'i');
                    let re4 = new RegExp('^' + reg, 'i');
                    let reVideo = new RegExp(reg, 'i');
                    // let reAndroid = new RegExp('^\/url\?q=http://'+reg+'/',"i");
                    // let re1Android = new RegExp('^\/url\?q=https://'+reg+'/',"i");
                    // let re2Android = new RegExp('^\/url\?q=http://www.'+reg+'/',"i");
                    // let re3Android = new RegExp('^\/url\?q=https://www.'+reg+'/',"i");

                    /*
                    if (isAndroid) {
                        let elt5 = $('#main').children('div').children('div.xpd').children('div').children('a').filter(function() {
                            let testString = $(this).attr('href');
                            let testStringClean = testString.split('/url?q=').join('');
                            if (re.test(testStringClean) || re1.test(testStringClean) || re2.test(testStringClean) || re3.test(testStringClean)) {
                                return true;
                            } else {
                                return false;
                            }
                        });
                        // log($(elt5));
                        //$(elt5).css('background-color', '#ef9292');
                        $(elt5).eq(0).parent().css('background-color', '#ef9292');
                    }*/

                    // let elt4 = $('.g').children('div').children('.rc').children('.r').children('a').filter(function() {
                    //     if (re.test($(this).attr('href')) || re1.test($(this).attr('href')) || re2.test($(this).attr('href')) || re3.test($(this).attr('href'))) {
                    //         return true;
                    //     } else {
                    //         return false;
                    //     }
                    // });
                    // $(elt4).eq(0).closest('.g').css('background-color', '#ef9292');
                    //
                    // let elt3 = $('.g').find('.rc').children('.r').children('a').filter(function() {
                    //     if (re.test($(this).attr('href')) || re1.test($(this).attr('href')) || re2.test($(this).attr('href')) || re3.test($(this).attr('href'))) {
                    //         return true;
                    //     } else {
                    //         return false;
                    //     }
                    // });
                    // $(elt3).eq(0).parent().parent().parent().css('background-color', '#ef9292');
                    //
                    // let elt6 = $('.g').find('.rc').children('div').children('a').filter(function() {
                    //     if (re.test($(this).attr('href')) || re1.test($(this).attr('href')) || re2.test($(this).attr('href')) || re3.test($(this).attr('href'))) {
                    //         return true;
                    //     } else {
                    //         return false;
                    //     }
                    // });
                    // $(elt6).eq(0).parent().parent().css('background-color', '#ef9292');
                    //
                    // let elt7 = $('.g .rc a').filter(function() {
                    //     log('!!!2: ');
                    //     log($(this));
                    //     if (re.test($(this).attr('href')) || re1.test($(this).attr('href')) || re2.test($(this).attr('href')) || re3.test($(this).attr('href'))) {
                    //         return true;
                    //     } else {
                    //         return false;
                    //     }
                    // });
                    // $(elt7).eq(0).closest('.rc').css('background-color', '#ef9292');

                    // $('#tads, #bottomads, #taw, .b_ans, [data-layout="videos"], [data-layout="images"], [data-layout="related_searches"]').hide();

                    log('marking the item red');
                    log(searchEngine);
                    $('body a').attr('target', '_self');
                    if ($('#taw .spell_orig').length > 0) {
                        $('#taw').show();
                        $('#taw .spell_orig').css('background-color', '#ef9292');
                    }

                    if (searchEngine.indexOf('bing.com') !== -1) {
                        $('#b_results a cite').each(function (index, el) {
                            if ($(el).is(':visible')) {
                                let url = $(el).text().replace('/url?q=', '');
                                if (re.test(url) || re0.test(url) || re1.test(url) || re2.test(url) || re3.test(url) || re4.test(url) || url.indexOf(reg) !== -1) {
                                    $(el).css('background-color', '#ef9292');
                                    if ($(el).closest('li').length > 0) {
                                        $(el).closest('li').css('background-color', '#ef9292');
                                    } else {
                                        $(el).closest('div').css('background-color', '#ef9292');
                                    }

                                    listFoundEl.push($(el));
                                    isUrlFound = true;
                                    log('Found the link');
                                }
                            }
                        });
                    } else if (searchEngine.indexOf('google.com/maps') !== -1) {
                        $('a[href]').each(function (index, el) {
                            if ($(el).is(':visible') && $(el).closest('#appbar').length <= 0) {
                                let url = $(el).attr('href').replace('/url?q=', '');
                                if (re.test(url) || re0.test(url) || re1.test(url) || re2.test(url) || re3.test(url) || re4.test(url)) {
                                    $(el).css('background-color', '#ef9292');
                                    $(el).find('*').css('background-color', '#ef9292');

                                    listFoundEl.push($(el));
                                    isUrlFound = true;
                                    log('Found the link');
                                }
                            }
                        });
                    } else if (searchEngine.indexOf('youtube.com') !== -1) {
                        $('a[href]').each(function (index, el) {
                            if ($(el).is(':visible') && $(el).closest('#appbar').length <= 0) {
                                let url = $(el).attr('href').replace('/url?q=', '');
                                if (reVideo.test(url)) {
                                    $(el).css('background-color', '#ef9292');
                                    if ($(el).closest('.text-wrapper').length > 0) {
                                        $(el).closest('.text-wrapper').css('background-color', '#ef9292');
                                    } else if ($(el).closest('li').length > 0) {
                                        $(el).closest('li').css('background-color', '#ef9292');
                                    } else {
                                        $(el).closest('.ytd-video-renderer').css('background-color', '#ef9292');
                                    }

                                    listFoundEl.push($(el));
                                    isUrlFound = true;
                                    log('Found the link');
                                }
                            }
                        });
                    } else if (searchEngine.indexOf('google.com') !== -1 && currentUrl.indexOf('tbm=vid') !== -1) {
                        $('a[href]').each(function (index, el) {
                            if ($(el).is(':visible') && $(el).closest('#appbar').length <= 0) {
                                let url = $(el).attr('href').replace('/url?q=', '');
                                if (reVideo.test(url)) {
                                    $(el).css('background-color', '#ef9292');
                                    if ($(el).closest('.text-wrapper').length > 0) {
                                        $(el).closest('.text-wrapper').css('background-color', '#ef9292');
                                    } else {
                                        $(el).closest('div').css('background-color', '#ef9292');
                                    }

                                    listFoundEl.push($(el));
                                    isUrlFound = true;
                                    log('Found the link');
                                }
                            }
                        });
                    } else {
                        $('a[href]').each(function (index, el) {
                            if ($(el).is(':visible') && $(el).closest('#appbar').length <= 0) {
                                let url = $(el).attr('href').replace('/url?q=', '');
                                if (re.test(url) || re0.test(url) || re1.test(url) || re2.test(url) || re3.test(url) || re4.test(url)) {
                                    $(el).css('background-color', '#ef9292');
                                    if ($(el).closest('.text-wrapper').length > 0) {
                                        $(el).closest('.text-wrapper').css('background-color', '#ef9292');
                                    } else if ($(el).closest('li').length > 0) {
                                        $(el).closest('li').css('background-color', '#ef9292');
                                    } else {
                                        $(el).closest('div').css('background-color', '#ef9292');
                                    }

                                    listFoundEl.push($(el));
                                    isUrlFound = true;
                                    log('Found the link');
                                }
                            }
                        });
                    }

                    if (isUrlFound) {
                        break;
                    }
                }

                if (!isUrlFound) {
                    notifyBackgroundPage('repeat_mark_website');
                } else {
                    if (listFoundEl.length > 0) {
                        listFoundEl.forEach(function(item) {
                            let $el = $(item);
                            if ($el.length > 0) {
                                $el.off('click').on('click', function() {
                                    notifyBackgroundPage('set_click_on_found_link', {'isClickOnFoundLink': true});
                                });

                                $el.closest('li').find('a, button').off('click').on('click', function() {
                                    notifyBackgroundPage('set_click_on_found_link', {'isClickOnFoundLink': true});
                                });
                            }
                        });
                    }
                }
            }
        });
    }

    return Promise.resolve({response: 'Hi from content script'});
});

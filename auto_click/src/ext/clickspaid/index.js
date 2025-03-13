const debug = false;
const manifest = browser.runtime.getManifest();
const pluginVersion = manifest.version;

function log(message, data = null) {
    if (debug) {
        if (data) {
            console.log(message, data);
        } else {
            console.log(message);
        }
    }
}

function handleResponse(message) {
    if (typeof message !== 'undefined') {
        log('Message from the background script', message);
    }
}

function handleError(error) {
    if (typeof error !== 'undefined') {
        console.error(error);
    }
}

function notifyBackgroundPage(message, data = {}) {
    let request = data;
    request.message = message;

    log('Message for the background script');
    log(request);

    const sending = browser.runtime.sendMessage(request);
    sending.then(handleResponse, handleError);
}

function showTask(response) {
    $('.no_task').css('display','none');
    $('.task_block').css('display','flex');
    $('#target_url').html(response.data.task.target_url);
    $('#ttl_second').html(response.data.task.ttl_second);
    if (typeof response.data.task !== 'undefined' &&
        typeof response.data.task.search_depth_page_count !== 'undefined' &&
        response.data.task.search_depth_page_count)
    {
        $('#search_depth_page_count').html(response.data.task.search_depth_page_count);
    } else {
        $('#task_description_search_depth_page_count').css('display','none');
    }
    if (response.data.task.bot_mode || response.data.task.bot_mode >= 0) {
        let botMode = parseInt(response.data.task.bot_mode);
        let time = parseInt(response.data.task.stay_on_site_seconds);
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

        if (botMode === 0) {
            $('#bot_mode').html('Open at least 2-3 pages and stay at least ' + text + ' and on the website.');
        }
        if (botMode === 2) {
            $('#bot_mode').html('Open at least 2-3 pages and stay at least ' + text + ' and on the website.');
        }
        if (botMode === 1) {
            $('#bot_mode').html('Just call ping and close connection');
        }
        if (botMode === 3) {
            $('#bot_mode').html('Just call ping and close connection');
        }
    } else {
        $('#task_description_bot_mode').css('display','none');
    }
    $('#key_phrase').html(response.data.task.key_phrase);
    let otherWindows = browser.extension.getBackgroundPage();
    otherWindows.copy(response.data.task.key_phrase);
    notifyBackgroundPage('start_task');
}

function showEmpty() {
    $('#task_description_bot_mode').css('display','block');
    $('#task_description_search_depth_page_count').css('display','block');
    $('.no_task').css('display','flex');
    $('.task_block').css('display','none');
}

$(function () {
    $('.plugin-version').html(pluginVersion);

    notifyBackgroundPage('index_opened');

    browser.runtime.onMessage.addListener(
        function(request) {
            /**
             * @param {Object} request.response
             * @param {boolean} request.response.success
             * @param {Object} request.response.data
             * @param {Object} request.response.data.task
             * @param {string} request.response.data.search_depth_page_count
             */

            if (request.message === 'task_get_success') {
                showTask(request.response);
                log(request.message);
            }

            if (request.message === 'task_get_button_update_text') {
                $('#get_task').prop('value', request.text);
            }

            if (request.message === 'ttl_second_update_text') {
                let time = parseInt(request.text);
                let minutes = Math.floor(time / 60);
                let seconds = time - minutes * 60;
                let text;

                if (minutes > 0) {
                    text = minutes + ' <span style="font-weight: normal">min</span> ' + seconds;
                } else {
                    text = seconds;
                }
                $('#ttl_second').html(text);
            }

            if (request.message === "task_get_button_disable") {
                $('#get_task').prop('disabled', true);
                log(request.message);
            }

            if (request.message === "task_get_button_enable") {
                $('#get_task').prop('disabled', false);
                log(request.message);
            }

            if (request.message === "task_complete") {
                showEmpty();
                log(request.message);
                notifyBackgroundPage('send_report');
            }

            if (request.message === "task_timedout") {
                showEmpty();
                log(request.message);
            }

            if (request.message === "task_fail") {
                showEmpty();
                log(request.message);
            }
        }
    );

    browser.storage.local.get(['userLogin'])
        .then(response => {
            $('.user_login').html(response.userLogin);
        }, handleError);

    $('#logout_button').on('click', function () {
        browser.storage.local.remove('authToken')
            .then(() => {
                browser.storage.local.get(['authToken'])
                    .then(() => {
                        browser.browserAction.setPopup({popup: "popup.html"})
                            .then(() => {
                                notifyBackgroundPage('log_out');
                            }, handleError);
                    }, handleError);
            }, handleError);
    });

    $('#get_task').on('click',function () {
        $('#get_task')
            .prop('disabled', true)
            .prop('value', 'Waiting for a task');

        notifyBackgroundPage('get_task');
    });
});
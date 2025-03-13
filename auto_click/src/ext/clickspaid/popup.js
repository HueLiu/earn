const debug = false;

function log(message) {
    if (debug) {
        console.log(message);
    }
}

function handleError(error) {
    if (typeof error !== 'undefined') {
        console.error(error);
    }
}

function handleBackgroundScriptResponse(message) {
    if (typeof message !== 'undefined') {
        log('Message from the content script:');
        log(message.response);
    }
}

function notifyBackgroundPage(message, data = {}) {
    let request = data;
    request.message = message;

    log('Message for the background script');
    log(request);

    const sending = browser.runtime.sendMessage(request);
    sending.then(handleBackgroundScriptResponse, handleError);
}


if (typeof jQuery !== 'undefined') {
    jQuery(document).ready(function($) {
        let $formLogin = $('#form-login'),
            $username = $formLogin.find('[name="email"]'),
            $password = $formLogin.find('[name="password"]'),
            $loginButton = $formLogin.find('[type="submit"]'),
            $error = $('#error');

        notifyBackgroundPage('request_username');

        browser.runtime.onMessage.addListener(
            function(request) {
                if (request.message === 'show_login_error') {
                    $error.html(request.error);
                    $loginButton.prop('disabled', false);
                }

                if (request.message === 'set_username') {
                    if (request.username) {
                        $username.val(request.username);
                    }
                }

                if (request.message !== 'show_login_error' && request.message !== 'set_username') {
                    $loginButton.prop('disabled', false);
                    window.close();
                }
            },
        );

        $username.focus(function() {
            resetError();
        });

        $password.focus(function() {
            resetError();
        });

        $loginButton.on('click', function() {
            // e.preventDefault();

            let $button = $(this);
            // let $form = $(this).closest('form');

            $button.prop('disabled', true);

            browser.runtime.sendMessage({
                message: 'try_auth',
                email: $username.val(),
                password: $password.val()
            }).then(response => {
                log('try_auth: success');
                log(response);

                // $form.trigger('submit');
            }).catch(error => {
                log('Authentication error');
                log(error);

                $button.prop('disabled', true);
            });
        });

        $username.on('blur', function() {
            notifyBackgroundPage('set_email',{'email': $username.val()});
        });
    });

    function resetError() {
        $('#error').html('');
    }
}

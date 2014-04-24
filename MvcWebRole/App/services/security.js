define([],
    function () {
        // Routes.
        userInfoUrl = 'api/account/getuserinfo';

        var securityService = {
            getUserInfo: getUserInfo,
        };

        $.ajaxPrefilter(function (options, originalOptions, jqXHR) {
            jqXHR.failJSON = function (callback) {
                jqXHR.fail(function (jqXHR, textStatus, error) {
                    var data;

                    try {
                        data = $.parseJSON(jqXHR.responseText);
                    }
                    catch (e) {
                        data = null;
                    }

                    callback(data, textStatus, jqXHR);
                });
            };
        });

        return securityService;

        function getUserInfo() {
            return $.ajax(userInfoUrl, {
                cache: false
            });
        }
    });
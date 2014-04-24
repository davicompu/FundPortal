define(['plugins/router', 'services/security', 'knockout', 'jquery'],
    function (router, security, ko, $) {

        var session = {
            userName: ko.observable(undefined),
            isLoggedIn: ko.observable(false),
            userRoles: ko.observableArray(),
            userIsInRole: userIsInRole,
            setUser: setUser,
            clearUser: clearUser,
        };

        return session;

        function setUser(user, remember) {
            if (user) {

                session.userName(user.UserName);

                if (user.hasOwnProperty("accessToken")) {
                    setAccessToken(user.accessToken, remember);
                } else if (user.hasOwnProperty("access_token")) {
                    setAccessToken(user.access_token, remember);
                }

                var roles = user.UserRoles.split(",");

                $.each(roles, function (i, v) {
                    session.userRoles.push(v);
                });

                session.isLoggedIn(true);
            }
        }

        function clearUser() {
            clearAccessToken();
            session.userName('');
            session.userRoles.removeAll();
            session.isLoggedIn(false);
        }

        function userIsInRole(requiredRole) {
            if (requiredRole === undefined) {
                return true;
            } else if (session.userRoles() === undefined) {
                return false;
            } else {
                if ($.isArray(requiredRole)) {
                    if (requiredRole.length === 0) {
                        return true;
                    } else {
                        return $.arrayIntersect(session.userRoles(), requiredRole).length > 0;
                    }
                } else {
                    return $.inArray(requiredRole, session.userRoles()) > -1;
                }
            }
        }
    });
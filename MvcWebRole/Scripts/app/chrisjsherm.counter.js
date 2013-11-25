window.chrisjsherm = window.chrisjsherm || {};

window.chrisjsherm.Counter = (function () {

    return Counter;

    function Counter(options) {
        var timer;
        var instance = this;
        var secondsSetting = options.seconds || 10;
        var seconds = secondsSetting;
        var onUpdateStatus = options.onUpdateStatus || function () { };
        var onCounterEnd = options.onCounterEnd || function () { };
        var onCounterStart = options.onCounterStart || function () { };

        function decrementCounter() {
            onUpdateStatus(seconds);
            if (seconds === 0) {
                stopCounter();
                onCounterEnd();
                return;
            }
            seconds--;
        }

        function startCounter() {
            onCounterStart();
            clearInterval(timer);
            timer = 0;
            decrementCounter();
            timer = setInterval(decrementCounter, 1000);
        }

        function stopCounter() {
            clearInterval(timer);
        }

        function restartCounter() {
            seconds = secondsSetting;
        }

        return {
            start: function () {
                startCounter();
            },
            stop: function () {
                stopCounter();
            },
            restart: function () {
                restartCounter();
            }
        };
    }
})();
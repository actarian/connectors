/* global angular, window, document, console  */

(function () {
    'use strict';

    var Forge = function () {

        function Forge() {
            var service = this;
            service.loader = new THREE.JSONLoader();
        }

        Forge.prototype = {
            load: load,
        };

        var i = 0;

        function load(callback) {
            var service = this;
            http({
                url: i % 2 === 0 ? 'img/Curved body 1.js' : 'img/Angled Emitter 1.js',
                onload: function (data) {
                    data = data.replace(new RegExp('transparency', 'g'), 'opacity');
                    data = data.replace(new RegExp('.#QNAN0', 'g'), '.0');
                    var model = service.loader.parse(JSON.parse(data));
                    callback(model.geometry, model.materials);
                }
            });
            i++;
        }

        function http(options) {
            var o = {
                method: 'GET',
                responseType: 'text',
            };
            if (!options || !options.url || !options.onload) {
                return;
            }
            for (var p in options) {
                o[p] = options[p];
            }
            var req = new XMLHttpRequest();
            req.open(o.method, o.url, true);
            req.responseType = o.responseType; // 'blob';
            req.onload = function () {
                if (this.status === 200) {
                    // var blob = this.response;
                    // var image = URL.createObjectURL(blob); // IE10+
                    o.onload(this.response);
                }
            };
            if (o.onerror) {
                req.onerror = o.onerror;
            }
            if (o.onprogress) {
                req.onerror = o.onprogress;
            }
            req.send();
        }

        return Forge;

    }();

    window.Forge = Forge;

    var app = angular.module('app');

    app.factory('Forge', [function () {
        return Forge;
    }]);

}());
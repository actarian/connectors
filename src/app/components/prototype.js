/* global window, document, console  */

(function () {
    'use strict';

    Element.prototype.hasClass = function (name) {
        return new RegExp("(?:^|\\s+)" + name + "(?:\\s+|$)").test(this.className);
    };

    Element.prototype.addClass = function (name) {
        if (!this.hasClass(name)) {
            this.className = this.className ? (this.className + ' ' + name) : name;
        }
    };

    Element.prototype.removeClass = function (name) {
        if (this.hasClass(name)) {
            this.className = this.className.split(name).join('').replace(/\s\s+/g, ' '); // .replace(new RegExp('(?:^|\\s+)' + name + '(?:\\s+|$)', 'g'), '');
        }
    };

    Element.prototype.isDescendant = function (target) {
        function isDescendant(node, target) {
            if (node === target) {
                return true;
            } else if (node.parentNode) {
                return isDescendant(node.parentNode, target);
            } else {
                return false;
            }
        }
        return isDescendant(this, target);
    };

    Element.prototype.getBounds = function () {
        var bounds = {
            x: 0,
            y: 0,
            width: this.offsetWidth,
            height: this.offsetHeight,
            center: {
                x: 0,
                y: 0
            },
        };
        bounds.center.x = bounds.width / 2;
        bounds.center.y = bounds.height / 2;
        return bounds;
    };

    window.getTouch = function (e) {
        var t = new THREE.Vector2();
        t.t = new THREE.Vector2();
        t.relativeTo = function (node) {
            var rect = node.getBoundingClientRect();
            var scrollX = window.pageXOffset || document.documentElement.scrollLeft;
            var scrollY = window.pageYOffset || document.documentElement.scrollTop;
            this.x = ((this.x - rect.left - scrollX) / node.offsetWidth) * 2 - 1;
            this.y = -((this.y - rect.top - scrollY) / node.offsetHeight) * 2 + 1;
        };
        t.pinchSize = function () {
            return Math.sqrt((this.x - this.t.x) * (this.x - this.t.x) + (this.y - this.t.y) * (this.y - this.t.y));
        };
        t.count = 1;
        /*
        var t = {
            x: 0,
            y: 0,
            t: {
                x: 0,
                y: 0,
            },
            count: 1,
            dist: function () {
                return Math.sqrt((this.x - this.t.x) * (this.x - this.t.x) + (this.y - this.t.y) * (this.y - this.t.y));
            }
        };
        */
        if (e.type == 'touchstart' || e.type == 'touchmove' || e.type == 'touchend' || e.type == 'touchcancel') {
            var touch = null,
                second = null;
            var touches = e.originalEvent ? e.originalEvent.touches || e.originalEvent.changedTouches : e.touches || e.changedTouches;
            if (touches && touches.length) {
                touch = touches[0];
                if (touches.length > 1) {
                    second = touches[1];
                }
            }
            if (touch) {
                t.x = touch.pageX;
                t.y = touch.pageY;
            }
            if (second) {
                t.t.x = second.pageX;
                t.t.y = second.pageY;
                t.count = 2;
            }
        } else if (e.type == 'click' || e.type == 'mousedown' || e.type == 'mouseup' || e.type == 'mousemove' || e.type == 'mouseover' || e.type == 'mouseout' || e.type == 'mouseenter' || e.type == 'mouseleave') {
            t.x = e.pageX;
            t.y = e.pageY;
        }
        return t;
    };

}());
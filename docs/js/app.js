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
/* global window, document, console  */

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
                url: i % 2 === 0 ? 'img/Body 1.js' : 'img/Angled Emitter 1.js',
                onload: function (data) {
                    data = data.replace(new RegExp('transparency', 'g'), 'opacity');
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

}());
/* global window, document, console, TweenLite */

(function () {
    'use strict';

    var DEBUG = false;
    var RAD = Math.PI / 180;
    var SCALE = 0.025;
    var I = 0;

    function rad(degree) {
        return degree * RAD;
    }

    var flipQuaternion = new THREE.Quaternion();
    flipQuaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);

    var CombinerItem = function () {

        function CombinerItem(geometry, materials) {
            var item = this;
            item.size = new THREE.Vector3();
            item.box = new THREE.Box3();
            item.group = new THREE.Group();
            item.inner = new THREE.Group();
            item.init(geometry, materials);
        }

        CombinerItem.prototype = {
            enter: enter,
            init: init,
            flip: flip,
            getJoints: getJoints,
            getJoint: getJoint,
        };

        function enter() {
            var item = this;
            item.inner.position.x = item.size.x * SCALE;
            TweenLite.to(item.inner.position, 0.6, {
                x: 0,
                ease: Power2.easeOut,
                overwrite: 'all',
                // ease: Elastic.easeOut, 
            });
        }

        function getCentroid(vertices) {
            var center = vertices.reduce(function (a, b) {
                return {
                    x: a.x + b.x,
                    y: a.y + b.y,
                    z: a.z + b.z
                };
            });
            return new THREE.Vector3().add(center).divideScalar(vertices.length);
        }

        function getJoints(geometry, materials, size) {
            var joints = {},
                ids = {},
                names = ['left', 'right', 'top', 'bottom'],
                colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00],
                index, joint, face;
            materials.map(function (material, index) {
                // console.log(material);
                var i = names.indexOf(material.name);
                if (i !== -1) {
                    var joint = new THREE.Group();
                    joint.name = names[i];
                    joint.vertices = [];
                    joint.c = colors[i];
                    joints[material.name] = joint;
                    ids[index] = joint;
                }
            });
            for (var i = 0; i < geometry.faces.length; i++) {
                face = geometry.faces[i];
                joint = ids[String(face.materialIndex)];
                if (joint) {
                    joint.normal = joint.normal || face.normal; // assume all faces point toward direction;
                    joint.vertices.push(geometry.vertices[face.a]);
                    joint.vertices.push(geometry.vertices[face.b]);
                    joint.vertices.push(geometry.vertices[face.c]);
                    // console.log(joint.name, joint.normal);
                }
            }
            for (var key in joints) {
                joint = joints[key];
                joint.position.copy(getCentroid(joint.vertices));
                joint.vertices = null;
            }
            if (!joints.left) {
                joints.left = new THREE.Group();
                joints.left.position.set(-size.x / 2, 0, 0);
                joints.left.normal = new THREE.Vector3(-1, 0, 0);
                joints.left.c = colors[0];
            }
            if (!joints.right) {
                joints.right = new THREE.Group();
                joints.right.position.set(size.x / 2, 0, 0);
                joints.right.normal = new THREE.Vector3(1, 0, 0);
                joints.right.c = colors[1];
            }
            // console.log('item.getJoints', joints, size);
            return joints;
        }

        function init(geometry, materials) {
            var item = this,
                box = item.box,
                size = item.size,
                group = item.group,
                inner = item.inner;

            var model = new THREE.Mesh(geometry, materials);
            box.setFromObject(model);
            box.getSize(size);

            var joints = item.getJoints(geometry, materials, size);

            // geometry = new THREE.CylinderGeometry(2, 2, 10, 10);            
            materials[1].color = new THREE.Color(0x000000);
            var material;

            model.geometry.uvsNeedUpdate = true;
            model.geometry.normalsNeedUpdate = true;
            model.geometry.verticesNeedUpdate = true;

            // model.geometry.computeMorphNormals();
            model.geometry.computeFaceNormals();
            model.geometry.computeVertexNormals();
            model.geometry.computeBoundingBox();

            // console.log(model);

            if (true) {
                geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
                material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(0.2 * ++I, 0, 0),
                    wireframe: false,
                    transparent: true,
                    opacity: 0.1,
                });
                model = new THREE.Mesh(geometry, material);
            }

            model.position.set(size.x / 2, 0, 0);
            for (var key in joints) {
                var joint = joints[key];
                // joint.quaternion.setFromAxisAngle(joint.normal, rad(90));
                var x = joint.normal.x,
                    y = joint.normal.y,
                    z = -joint.normal.z;
                /*
                var rx = Math.atan2(y, z),
                    ry = z >= 0 ? -Math.atan2(x * Math.cos(rx), z) : Math.atan2(x * Math.cos(rx), -z),
                    rz = 0;
                var rotation = new THREE.Euler(rx, ry, rz);
                 */
                var rotation = new THREE.Euler(
                    0,
                    Math.atan2(z, x),
                    Math.atan2(y, Math.sqrt(x * x + z * z))
                );
                joint.rotation.copy(rotation);
                // joint.lookAt(joint.normal);
                // joint.rotateY(joint.normal.x * rad(90));
                model.add(joint);
                joint.oquaternion = new THREE.Quaternion().multiplyQuaternions(joint.quaternion, flipQuaternion);
                if (true) {
                    var s = size.x / 10;
                    var arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), s, joint.c, s / 2, s / 2);
                    joint.arrow = arrow;
                    joint.add(arrow);
                }
            }
            /*
            var left = item.getJoint(
                new THREE.Vector3(-size.x / 2, 0, 0),
                new THREE.Vector3(0, 0, -rad(180)), // + rad(10)
                0x00ff00
            );
            var right = item.getJoint(
                new THREE.Vector3(size.x / 2, 0, 0),
                // new THREE.Vector3(0, 0, -rad(10) + rad(20) * Math.random()),
                new THREE.Vector3(0, 0, rad(0)),
                0xff0000
            );
            inner.scale.set(SCALE, SCALE, SCALE);
            model.add(left);
            model.add(right);
            inner.add(model);
            group.add(inner);
            // new items
            item.model = model;
            item.left = left;
            item.lquaternion = new THREE.Quaternion().multiplyQuaternions(left.quaternion, flipQuaternion);
            item.right = right;
            item.rquaternion = right.quaternion; // not flipped cause already in opposite direction
            */
            inner.scale.set(SCALE, SCALE, SCALE);
            inner.add(model);
            group.add(inner);
            item.model = model;
            item.joints = joints;
        }

        function getJoint(origin, rotation, color) {
            var item = this,
                size = item.size;
            // rotation.normalize();
            var helper = new THREE.Group();
            helper.position.copy(origin);
            helper.rotation.x = rotation.x;
            helper.rotation.y = rotation.y;
            helper.rotation.z = rotation.z;
            var oppositeQuaternion = new THREE.Quaternion();
            oppositeQuaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rad(180));
            helper.oppositeQuaternion = new THREE.Quaternion().multiplyQuaternions(oppositeQuaternion, helper.quaternion);
            if (DEBUG) {
                var s = size.x / 10;
                var arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), s, color, s / 2, s / 2);
                helper.arrow = arrow;
                helper.add(arrow);
            }
            return helper;
        }

        function flip(callback) {
            var item = this,
                model = item.model;
            // console.log('flip()');
            item.flipped = !item.flipped;
            TweenLite.to(model.rotation, 0.3, {
                y: item.flipped ? Math.PI : 0,
                ease: Power2.easeOut,
                overwrite: 'all',
                // ease: Elastic.easeOut,
                // onUpdate: function() { },
                onComplete: function () {
                    // console.log('flipped');
                    // item.group.updateMatrixWorld();
                    if (typeof callback === 'function') {
                        callback();
                    }
                },
            });
        }

        return CombinerItem;

    }();

    var Combiner = function () {

        function Combiner(scene) {
            var combiner = this;
            combiner.scene = scene;
            combiner.flipping = 0;
            combiner.items = [];
            combiner.hittables = [];
            combiner.center = new THREE.Vector3();
            combiner.size = new THREE.Vector3();
            combiner.group = new THREE.Group();
            combiner.box = new THREE.Box3();
            combiner.boxhelper = new THREE.Box3Helper(combiner.box, 0xff0000);
            combiner.centerhelper = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.3, 0.3),
                new THREE.MeshBasicMaterial({
                    color: 0xff0000
                })
            );
            if (DEBUG) {
                combiner.scene.add(combiner.boxhelper);
                combiner.scene.add(combiner.centerhelper);
            }
        }

        Combiner.prototype = {
            add: add,
            adjust: adjust,
            combine: combine,
            fit: fit,
            flip: flip,
            flipItem: flipItem,
            hitAndFlip: hitAndFlip,
            pop: pop,
            remove: remove,
            select: select,
            unselect: unselect,
            update: update,
        };

        function update() {
            var combiner = this,
                group = combiner.group;
            if (combiner.flipping === 0) {
                // combiner.combine();
                combiner.fit(group);
            }
        }

        function adjust() {
            var combiner = this,
                group = combiner.group;
            combiner.combine();
            combiner.fit(group);
            // combiner.fitCamera();
        }

        function add(geometry, materials) {
            var combiner = this,
                box = combiner.box,
                size = combiner.size,
                items = combiner.items,
                hittables = combiner.hittables,
                group = combiner.group;

            combiner.unselect();
            var item = new CombinerItem(geometry, materials);
            items.push(item);
            combiner.hittables = items.map(function (item) {
                return item.model;
            });
            group.add(item.group);
            combiner.adjust();
            return item;
        }

        function remove() {
            var combiner = this,
                items = combiner.items,
                hittables = combiner.hittables,
                group = combiner.group;
            if (combiner.selection) {
                var selection = combiner.selection;
                var item = selection.item;
                items.splice(selection.index, 1);
                if (item.group.parent) {
                    group.remove(item.group);
                }
                combiner.hittables = items.map(function (item) {
                    return item.model;
                });
                combiner.unselect();
                combiner.adjust();
                if (items.length > selection.index) {
                    items[selection.index].enter();
                }
                return item;
            } else {
                return combiner.pop();
            }
        }

        function pop() {
            var combiner = this,
                items = combiner.items,
                hittables = combiner.hittables,
                group = combiner.group;
            if (items.length) {
                var item = items.pop();
                if (item.group.parent) {
                    group.remove(item.group);
                }
                combiner.hittables = items.map(function (item) {
                    return item.model;
                });
                combiner.adjust();
                return item;
            }
        }

        function __combine() {
            var combiner = this,
                items = combiner.items,
                group = combiner.group;
            var previousQuaternion = new THREE.Quaternion();
            var nextQuaternion = new THREE.Quaternion();
            var previousPosition = new THREE.Vector3();
            var groupPosition = new THREE.Vector3();
            var lquaternion, right;

            function combineItem(item, i) {
                // item.inner.position.x += (0 - item.inner.position.x) / 5;
                if (item.flipped) {
                    lquaternion = item.rquaternion;
                    right = item.left;
                } else {
                    lquaternion = item.lquaternion;
                    right = item.right;
                }
                if (i > 0) {
                    item.group.position.copy(previousPosition.sub(groupPosition));
                    item.group.setRotationFromQuaternion(previousQuaternion.multiply(lquaternion));
                    item.group.updateMatrixWorld();
                }
                /*
                if (i === 1) {
                    item.model.rotation.x += 0.01;
                }
                */
                right.getWorldQuaternion(previousQuaternion);
                right.getWorldPosition(previousPosition);
            }
            if (items.length) {
                group.getWorldPosition(groupPosition);
                items.filter(combineItem);
            }
        }

        function combine() {
            var combiner = this,
                items = combiner.items,
                group = combiner.group;
            var previousQuaternion = new THREE.Quaternion();
            var nextQuaternion = new THREE.Quaternion();
            var previousPosition = new THREE.Vector3();
            var groupPosition = new THREE.Vector3();
            var lquaternion, right;

            function combineItem(item, i) {
                // item.inner.position.x += (0 - item.inner.position.x) / 5;
                if (item.flipped) {
                    lquaternion = item.joints.right.quaternion;
                    right = item.joints.left;
                } else {
                    lquaternion = item.joints.left.oquaternion;
                    right = item.joints.right;
                }
                if (i > 0) {
                    item.group.position.copy(previousPosition.sub(groupPosition));
                    item.group.setRotationFromQuaternion(previousQuaternion.multiply(lquaternion));
                    item.group.updateMatrixWorld();
                }
                /*
                if (i === 1) {
                    item.model.rotation.x += 0.01;
                }
                */
                right.getWorldQuaternion(previousQuaternion);
                right.getWorldPosition(previousPosition);
            }
            if (items.length) {
                group.getWorldPosition(groupPosition);
                items.filter(combineItem);
            }
        }

        function fit() {
            var combiner = this,
                box = combiner.box,
                size = combiner.size,
                center = combiner.center,
                centerhelper = combiner.centerhelper,
                group = combiner.group;
            box.setFromObject(group);
            box.getCenter(center);
            box.getSize(size);
            centerhelper.position.copy(center);
            /*
            group.worldToLocal(center);
            group.position.x = -center.x;
            group.position.y = -center.y;
            group.position.z = -center.z;
            */
            return size;
        }

        function select(raycaster) {
            var combiner = this,
                items = combiner.items,
                hittables = combiner.hittables;

            combiner.unselect();
            var hitted = raycaster.intersectObjects(hittables);
            var selection = null;
            if (hitted.length) {
                var index = hittables.indexOf(hitted[0].object);
                var item = items[index];
                var rotation = item.inner.rotation.clone();
                item.model.material.emissive = new THREE.Color(0x888888);
                // item.model.material.needsUpdate = true;
                selection = {
                    index: index,
                    item: item,
                    rotation: rotation,
                };
                combiner.selection = selection;
            }
            return selection;
        }

        function unselect() {
            var combiner = this;
            if (combiner.selection) {
                combiner.selection.item.model.material.emissive = new THREE.Color(0x000000);
                // combiner.selection.item.model.material.needsUpdate = true;
                combiner.selection = null;
            }
        }

        function flipItem(item, callback) {
            var combiner = this;
            combiner.flipping++;
            item.flip(function () {
                combiner.flipping--;
                combiner.adjust();
                // combiner.unselect(); ???
                if (typeof (callback) === 'function') {
                    setTimeout(function () {
                        callback();
                    }, 100);
                }
            });
        }

        function flip(callback) {
            var combiner = this,
                items = combiner.items,
                hittables = combiner.hittables;
            if (combiner.selection) {
                combiner.flipItem(combiner.selection.item, callback);
            }
        }

        function hitAndFlip(raycaster, callback) {
            var combiner = this,
                items = combiner.items,
                hittables = combiner.hittables;

            var hitted = raycaster.intersectObjects(hittables);
            if (hitted.length) {
                var index = hittables.indexOf(hitted[0].object);
                var item = items[index];
                combiner.flipItem(item, callback);
            }
        }

        return Combiner;

    }();

    window.Combiner = Combiner;

}());
/* global window, document, console, TweenLite */

(function () {
    'use strict';

    var DEBUG = true;
    var RAD = Math.PI / 180;
    var I = 0;

    function rad(degree) {
        return degree * RAD;
    }

    var Fitter = function () {

        function Fitter(scene, camera, controls) {
            var fitter = this;
            fitter.scene = scene;
            fitter.camera = camera;
            fitter.dummy = camera.clone();
            fitter.controls = controls;
            fitter.projector = new THREE.Projector();
            fitter.position = new THREE.Vector3();
            fitter.target = new THREE.Vector3();
            fitter.center = new THREE.Vector3();
            fitter.size = new THREE.Vector3();
            fitter.box = new THREE.Box3();
            fitter.boxhelper = new THREE.Box3Helper(fitter.box, 0xff0000);

            fitter.rotate = false;

            fitter.target = new THREE.Vector3(0, 0, 0);
            fitter.distance = 22;
            fitter.angle = 0;

            fitter.endTarget = new THREE.Vector3(0, 0, 0);
            fitter.position = new THREE.Vector3(0, 0, 0);
            fitter.distanceMin = 10;
            fitter.distanceMax = 34;
            fitter.rotationAngle = 1;
            fitter.dragAngle = 0;
            fitter.zoom = 1; // eliminabili ??
            fitter.pow = 0; // eliminabili ??
            /*
            if (combiner.selected.item.type === APP.Parts.typeEnum.BladePlug) {
                fitter.pow = 1;
            } else {
                fitter.pow = 0;
            }
            */
            if (DEBUG) {
                fitter.scene.add(fitter.boxhelper);
            }
        }

        Fitter.prototype = {
            fit: fit,
            toScreen: toScreen,
            toWorld: toWorld,
            update: update,
        };

        function fit(combiner, offset, up) {
            if (!offset) {
                offset = 1.3;
            }
            if (!up) {
                up = new THREE.Vector3(0, 1, 0);
            }
            var fitter = this,
                projector = fitter.projector,
                box = fitter.box,
                size = fitter.size,
                center = fitter.center,
                camera = fitter.camera,
                controls = fitter.controls,
                dummy = fitter.dummy;
            var object = combiner.selection ? combiner.selection.item.group : combiner.group;
            box.setFromObject(object);
            box.getCenter(center);
            dummy.position.copy(camera.position);
            dummy.quaternion.copy(camera.quaternion);
            dummy.up = up;
            dummy.lookAt(center);
            dummy.updateProjectionMatrix();
            var min = fitter.toScreen(box.min);
            var max = fitter.toScreen(box.max);
            var sc = fitter.toScreen(center);
            box.applyMatrix4(dummy.matrixWorldInverse);
            box.getSize(size);
            var aspect = size.x / size.y;
            var dim = (camera.aspect > aspect) ? size.y : size.x;
            if (camera.aspect < aspect) {
                dim /= camera.aspect;
            }
            dim *= offset;
            var z = dim / 2 / Math.sin(camera.fov / 2 * RAD);
            dummy.position.normalize().multiplyScalar(z);
            fitter.distance = dummy.position.distanceTo(center);
            // camera.far = distance + dim;
            dummy.updateProjectionMatrix();
            var vfrom = camera.position.clone();
            var vto = dummy.position;
            var qfrom = camera.quaternion.clone();
            var qto = dummy.quaternion;
            var animation = {
                pow: 0,
            };
            TweenLite.to(animation, 0.6, {
                pow: 1,
                ease: Power2.easeOut,
                overwrite: 'all',
                // ease: Elastic.easeOut,
                onUpdate: function () {
                    camera.position.lerpVectors(vfrom, vto, animation.pow);
                    THREE.Quaternion.slerp(qfrom, qto, camera.quaternion, animation.pow);
                    camera.updateProjectionMatrix();
                },
                onComplete: function () {
                    if (controls) {
                        // controls.maxDistance = distance + dim;
                        controls.target.copy(center);
                        controls.update();
                    }
                }
            });
        }

        function toWorld(v) {
            var fitter = this,
                projector = fitter.projector,
                camera = fitter.camera,
                w = window.innerWidth / 2,
                h = window.innerHeight / 2;
            var world = v.clone();
            world.x = world.x / w - 1;
            world.y = -world.y / h + 1;
            projector.unprojectVector(world, camera);
            return world;
        }

        function toScreen(v) {
            var fitter = this,
                camera = fitter.camera,
                w = window.innerWidth / 2,
                h = window.innerHeight / 2;
            var screen = v.clone();
            screen.project(camera);
            screen.x = (screen.x + 1) * w;
            screen.y = (-screen.y + 1) * h;
            return screen;
        }

        function update() {
            var fitter = this,
                target = fitter.target,
                endTarget = fitter.endTarget,
                position = fitter.position,
                distance = fitter.distance,
                zoom = fitter.zoom,
                dragAngle = fitter.dragAngle,
                rotationAngle = fitter.rotationAngle,
                pow = fitter.pow,
                camera = fitter.camera;
            if (fitter.rotate) {
                rotationAngle = fitter.rotationAngle += 0.0002;
            }

            target.x += (endTarget.x - target.x) / 40;
            target.y += (endTarget.y - target.y) / 40;
            target.z += (endTarget.z - target.z) / 40;

            position.x = target.x + distance * zoom * Math.cos(dragAngle + rotationAngle);
            position.y = target.y + distance * zoom; // * (0.5 + 1.5 * (1 - pow));
            position.z = target.z + distance * zoom * Math.sin(dragAngle + rotationAngle);

            camera.position.x += (position.x - camera.position.x) / 13;
            camera.position.y += (position.y - camera.position.y) / 13;
            camera.position.z += (position.z - camera.position.z) / 13;
            // camera.up = new THREE.Vector3(0, 0, -1);

            camera.lookAt(target);
        }

        return Fitter;

    }();

    window.Fitter = Fitter;

}());
/* global window, document, console, TweenLite */

(function () {
    'use strict';

    var DEBUG = false;
    var RAD = Math.PI / 180;
    var I = 0;
    var MIN = 11;

    function rad(degree) {
        return degree * RAD;
    }

    var Orbiter = function () {

        function Orbiter(scene, camera, controls) {
            var orbiter = this;
            orbiter.scene = scene;
            orbiter.camera = camera;
            orbiter.dummy = camera.clone();
            orbiter.controls = controls;
            orbiter.projector = new THREE.Projector();
            orbiter.center = new THREE.Vector3();
            orbiter.size = new THREE.Vector3();
            orbiter.box = new THREE.Box3();
            orbiter.boxhelper = new THREE.Box3Helper(orbiter.box, 0xff0000);

            orbiter.rotate = true;

            orbiter.target = new THREE.Vector3(0, 0, 0);
            orbiter.distance = MIN * 2;
            orbiter.rotationAngle = 1;
            orbiter.dragAngle = 0;
            orbiter.zoom = 1; // eliminabili ??
            orbiter.pow = 0; // eliminabili ??

            orbiter.values = {
                target: new THREE.Vector3(0, 0, 0),
                distance: MIN * 2,
                rotationAngle: 0,
                dragAngle: 0,
                zoom: 0,
                pow: 0,
            };

            orbiter.distanceMin = MIN;
            orbiter.distanceMax = MIN * 3;
            /*
            if (combiner.selected.item.type === APP.Parts.typeEnum.BladePlug) {
                orbiter.pow = 1;
            } else {
                orbiter.pow = 0;
            }
            */
            orbiter.set(orbiter.camera, orbiter.target);
            //
            if (DEBUG) {
                orbiter.scene.add(orbiter.boxhelper);
            }
        }

        Orbiter.prototype = {
            fit: fit,
            set: set,
            toScreen: toScreen,
            toWorld: toWorld,
            tween: tween,
            update: update,
        };

        function set(camera, target) {
            var orbiter = this,
                values = orbiter.values;

            camera.position.x = target.x + values.distance * values.zoom * Math.cos(values.dragAngle + values.rotationAngle);
            camera.position.y = target.y + values.distance * values.zoom; // * (0.5 + 1.5 * (1 - values.pow));
            camera.position.z = target.z + values.distance * values.zoom * Math.sin(values.dragAngle + values.rotationAngle);
            // camera.up = new THREE.Vector3(0, 0, -1);
            camera.lookAt(target);
        }

        function fit(combiner, offset, up) {
            if (!offset) {
                offset = 1.3;
            }
            if (!up) {
                up = new THREE.Vector3(0, 1, 0);
            }
            var orbiter = this,
                projector = orbiter.projector,
                box = orbiter.box,
                size = orbiter.size,
                center = orbiter.center,
                camera = orbiter.camera,
                controls = orbiter.controls,
                dummy = orbiter.dummy;

            var object = combiner.selection ? combiner.selection.item.group : combiner.group;
            box.setFromObject(object);
            box.getCenter(center);
            box.getSize(size);
            if (combiner.items.length > 0) {
                orbiter.set(dummy, center);
                /*
                dummy.position.copy(camera.position);
                dummy.quaternion.copy(camera.quaternion);
                dummy.up = up;
                dummy.lookAt(center);
                */
                dummy.fov = camera.fov;
                dummy.aspect = camera.aspect;
                /*
                dummy.updateProjectionMatrix();
                var min = orbiter.toScreen(box.min);
                var max = orbiter.toScreen(box.max);
                var sc = orbiter.toScreen(center);
                */
                // dummy.matrixWorldNeedsUpdate = true;
                // dummy.matrixWorldInverse.getInverse(dummy.matrixWorld);
                size.applyMatrix4(dummy.matrixWorldInverse);
                var aspect = size.x / size.y;
                var dim = (camera.aspect > aspect) ? size.y : size.x;
                if (camera.aspect < aspect) {
                    dim /= camera.aspect;
                }
                dim *= offset;
                var z = dim / 2 / Math.sin(camera.fov / 2 * RAD);
                orbiter.distance = z;
            } else {
                orbiter.distance = MIN;
            }
            orbiter.distanceMin = orbiter.distance * 0.5;
            orbiter.distanceMax = orbiter.distance * 1.5;
            //
            orbiter.target.copy(center);
        }

        function tween() {
            var orbiter = this,
                target = orbiter.target,
                values = orbiter.values;

            if (orbiter.rotate) {
                orbiter.rotationAngle += 0.0002;
            }
            var friction = 1 / 15;
            values.target.x += (target.x - values.target.x) * friction;
            values.target.y += (target.y - values.target.y) * friction;
            values.target.z += (target.z - values.target.z) * friction;
            values.distance += (orbiter.distance - values.distance) * friction;
            values.rotationAngle += (orbiter.rotationAngle - values.rotationAngle) * friction;
            values.dragAngle += (orbiter.dragAngle - values.dragAngle) * friction;
            values.zoom += (orbiter.zoom - values.zoom) * friction;
            values.pow += (orbiter.pow - values.pow) * friction;
        }

        function update() {
            var orbiter = this;
            orbiter.tween();
            orbiter.set(orbiter.camera, orbiter.values.target);
        }

        function toWorld(v) {
            var orbiter = this,
                projector = orbiter.projector,
                camera = orbiter.camera,
                w = window.innerWidth / 2,
                h = window.innerHeight / 2;
            var world = v.clone();
            world.x = world.x / w - 1;
            world.y = -world.y / h + 1;
            projector.unprojectVector(world, camera);
            return world;
        }

        function toScreen(v) {
            var orbiter = this,
                camera = orbiter.camera,
                w = window.innerWidth / 2,
                h = window.innerHeight / 2;
            var screen = v.clone();
            screen.project(camera);
            screen.x = (screen.x + 1) * w;
            screen.y = (-screen.y + 1) * h;
            return screen;
        }

        return Orbiter;

    }();

    window.Orbiter = Orbiter;

}());
/* global window, document, console, TweenLite, Forge, Combiner, Orbiter */

(function () {
    'use strict';

    if (!Detector.webgl) {
        Detector.addGetWebGLMessage();
        return;
    }

    var forge = new Forge();

    var container = document.querySelector('.editor');
    var btnAdd = document.querySelector('.btn-add');
    var btnRemove = document.querySelector('.btn-remove');
    var btnFlip = document.querySelector('.btn-flip');

    var renderer = new THREE.WebGLRenderer({
        alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    var camera = new THREE.PerspectiveCamera(45, container.offsetWidth / container.offsetHeight, 1, 50000);
    // camera.position.set(0, 20, 40);
    // camera.lookAt(0, 0, 0);
    // controls.update() must be called after any manual changes to the camera's transform
    var controls;
    // var controls = new THREE.OrbitControls(camera);
    // controls.update();

    var scene = new THREE.Scene();

    var light = new THREE.PointLight(0xddddee, 1, 2000);
    light.position.set(0, 200, 0);
    scene.add(light);
    var helper = new THREE.PointLightHelper(light, 10);
    scene.add(helper);

    var floor = addFloor();
    scene.add(floor);

    var combiner = new Combiner(scene);
    scene.add(combiner.group);

    var orbiter = new Orbiter(scene, camera, controls);

    var raycaster = new THREE.Raycaster();
    var down;

    function animate() {
        requestAnimationFrame(animate);
        // required if controls.enableDamping or controls.autoRotate are set to true
        // controls.update();
        renderer.render(scene, camera);
        combiner.update();
        floor.position.y = -combiner.size.y / 2;
        floor.position.x = combiner.center.x;
        floor.position.z = combiner.center.z;
        orbiter.update();
    }

    function addFloor() {
        /*
        var radius = 200;
        var radials = 16;
        var circles = 8;
        var divisions = 64;
        var floor = new THREE.PolarGridHelper(radius, radials, circles, divisions);
        */
        var floor = new THREE.GridHelper(500, 500, 0x888888, 0xAAAAAA);
        // floor.rotateOnAxis( new THREE.Vector3( 1, 0, 0 ), 90 * ( Math.PI/180 ));	
        return floor;
    }

    function onResize() {
        camera.aspect = container.offsetWidth / container.offsetHeight;
        camera.updateProjectionMatrix();
        orbiter.fit(combiner);
        renderer.setSize(container.offsetWidth, container.offsetHeight);
    }

    /*
    function getTouch(e) {
        return new THREE.Vector2(
            (e.clientX / container.offsetWidth) * 2 - 1, -(e.clientY / container.offsetHeight) * 2 + 1
        );
    }

        var raycaster = new THREE.Raycaster();
        // raycaster.ray.direction.set(0, -1, 0);
        var mouse = new THREE.Vector2(0, 0);

        var down = null, move = null, moved = 0, pinching = false;
        
    */

    var moved = 0;

    function onDown(e) {
        down = getTouch(e);
        down.relativeTo(container);
        down.mx = down.x;
        down.startDragAngle = orbiter.dragAngle;
        down.startDistance = orbiter.distance;
        // console.log('down', down);
        raycaster.setFromCamera(down, camera);
        var selection = combiner.select(raycaster);
        // console.log('selection', selection);
        if (selection) {
            if (controls) {
                controls.enabled = false;
            }
            down.index = selection.index;
            down.item = selection.item;
            down.rotation = selection.rotation;
        }
        orbiter.fit(combiner);
        /*
        down.index = i;
        down.item = value;
        down.angle = value.coords.angle;
        */
    }

    function onMove(e) {
        moved++;
        var pow = 1; // 0.001;
        if (e.type === 'touchmove') {
            e.stopPropagation();
            e.preventDefault();
            pow *= 4;
        }
        if (down) {
            var move = getTouch(e);
            move.relativeTo(container);
            var diff = move.sub(down);
            // console.log(diff.x, diff.y);
            if (move.count == 2 && down.count == 2) {
                // PINCH                   
                orbiter.distance = down.startDistance + (down.pinchSize() - move.pinchSize()) * pow * 10;
            } else {
                if (combiner.selection && combiner.selection.item === down.item) {
                    // ROTATE ITEM
                    // down.item.rotation = down.rotation + (move.y - down.y) * pow * 10;
                    var index = down.index;
                    // down.item.inner.rotation.x = down.rotation.x + diff.y * Math.PI;
                    down.item.inner.rotation.x = down.rotation.x + diff.y * pow * 10;
                    combiner.adjust();
                } else {
                    // DRAG CAMERA
                    orbiter.dragAngle = down.startDragAngle + diff.x * pow * 10;
                    orbiter.distance = down.startDistance + diff.y * pow * -10;
                    /*
                    // SOUND
                    if (combiner.selectedItem && combiner.selectedItem.type == APP.Parts.typeEnum.Sound) {
                        if (Math.abs(move.x - down.mx) > container.offsetWidth / 3) {
                            down.mx = move.x;
                            scope.$root.$broadcast('onSoundSwing', scope.saber.sound, Math.abs(move.x - down.mx) / 100);
                        }
                    }
                    */
                }
            }
            // orbiter.update();
            orbiter.distance = Math.min(orbiter.distanceMax, Math.max(orbiter.distanceMin, orbiter.distance));
            // scope.$root.$broadcast('onControls');
        }
    }

    function onUp(e) {
        if (down && moved < 5) {
            if (down.item) {
                /*
                scope.$apply(function () {
                    selectedIndex = down.index;
                    onFocus(down.item);
                });
                */
            } else if (combiner.selectedItem) {
                /*
                scope.$apply(function () {
                    onBlur();
                });
                */
            }
        }
        down = null;
        moved = 0;
        if (controls) {
            controls.enabled = true;
        }
        removeListeners();
    }

    function onWheel(e) {
        e = window.event || e; // old IE support
        var bounds = container.getBounds();
        if (Math.abs(e.pageX - bounds.center.x) < bounds.width / 3) {
            var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
            orbiter.distance += delta;
            orbiter.distance = Math.min(orbiter.distanceMax, Math.max(orbiter.distanceMin, orbiter.distance));
            orbiter.update();
            e.preventDefault();
            // scope.$root.$broadcast('onControls');
        }
    }

    function onDoubleClick(e) {
        console.log('onDoubleClick');
        var touch = getTouch(e);
        raycaster.setFromCamera(touch, camera);
        combiner.hitAndFlip(raycaster, function () {
            orbiter.fit(combiner);
        });
    }

    function onAdd() {
        forge.load(function (geometry, materials) {
            var item = combiner.add(geometry, materials);
            orbiter.fit(combiner);
            item.enter();
        });
    }

    function onRemove() {
        combiner.remove();
        orbiter.fit(combiner);
    }

    function onFlip() {
        combiner.flip(function () {
            orbiter.fit(combiner);
        });
    }

    function onMouseDown(e) {
        onDown(e);
        addMouseListeners();
    }

    function onTouchDown(e) {
        onDown(e);
        addTouchListeners();
        e.stopPropagation();
        e.preventDefault();
    }

    function addMouseListeners() {
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }

    function addTouchListeners() {
        window.addEventListener('touchmove', onMove);
        window.addEventListener('touchend', onUp);
    }

    function removeListeners() {
        window.removeEventListener('touchmove mousemove', onMove);
        window.removeEventListener('touchend mouseup', onUp);
    }

    // container.addEventListener('dblclick', onDoubleClick);
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('touchstart', onTouchDown);
    container.addEventListener('mousewheel', onWheel);

    window.addEventListener('resize', onResize, false);
    btnAdd.addEventListener('click', onAdd);
    btnRemove.addEventListener('click', onRemove);
    btnFlip.addEventListener('click', onFlip);

    animate();

    onAdd();

}());
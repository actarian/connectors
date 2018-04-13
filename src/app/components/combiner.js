/* global window, document, console, TweenLite */

(function () {
    'use strict';

    var DEBUG = true;
    var RAD = Math.PI / 180;

    function rad(degree) {
        return degree * RAD;
    }

    var CombinerItem = function () {

        function CombinerItem(geometry, materials) {
            var service = this;
            service.size = new THREE.Vector3();
            service.box = new THREE.Box3();
            service.group = new THREE.Group();
            service.inner = new THREE.Group();
            service.init(geometry, materials);
        }

        CombinerItem.prototype = {
            init: init,
            flip: flip,
            joint: joint,
        };

        function init(geometry, materials) {
            var service = this,
                box = service.box,
                size = service.size,
                group = service.group,
                inner = service.inner;
            geometry = new THREE.BoxGeometry(10, 4, 4);
            // geometry = new THREE.CylinderGeometry(2, 2, 10, 10);
            var material = new THREE.MeshStandardMaterial({
                color: 0x888888,
                wireframe: false,
            });
            var model = new THREE.Mesh(geometry, material);
            box.setFromObject(model);
            box.getSize(size);
            model.position.set(size.x / 2, 0, 0);
            var left = service.joint(
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 0, -rad(180)),
                0x00ff00
            );
            var right = service.joint(
                new THREE.Vector3(size.x, 0, 0),
                new THREE.Vector3(0, 0, -rad(10) + rad(20) * Math.random()),
                0xff0000
            );
            inner.position.x = size.x / 2;
            inner.add(model);
            inner.add(left);
            inner.add(right);
            group.add(inner);
            // new items
            service.model = model;
            service.left = left;
            service.right = right;
        }

        function joint(origin, rotation, color) {
            var service = this,
                size = service.size;
            var s = size.x / 10;
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
                var arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), s, color, s / 2, s / 2);
                helper.arrow = arrow;
                helper.add(arrow);
            }
            return helper;
        }

        function flip(callback) {
            var service = this,
                model = service.model;
            // console.log('flip()');
            service.flipped = !service.flipped;
            TweenLite.to(model.rotation, 0.3, {
                y: service.flipped ? Math.PI : 0,
                ease: Power2.easeOut,
                // ease: Elastic.easeOut,
                // onUpdate: function() { },
                onComplete: function () {
                    // console.log('flipped');
                    if (typeof callback === 'function') {
                        callback();
                    }
                },
            });
        }

        return CombinerItem;

    }();

    var Combiner = function () {

        function Combiner(scene, camera, controls) {
            var service = this;
            service.scene = scene;
            service.camera = camera;
            service.controls = controls;
            service.flipping = 0;
            service.items = [];
            service.hittables = [];
            service.projector = new THREE.Projector();
            service.center = new THREE.Vector3();
            service.size = new THREE.Vector3();
            service.group = new THREE.Group();
            service.box = new THREE.Box3();
            service.boxhelper = new THREE.Box3Helper(service.box, 0xff0000);
            service.centerhelper = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.3, 0.3),
                new THREE.MeshBasicMaterial({
                    color: 0xff0000
                })
            );
            if (DEBUG) {
                service.scene.add(service.boxhelper);
                service.scene.add(service.centerhelper);
            }
        }

        Combiner.prototype = {
            add: add,
            combine: combine,
            fit: fit,
            fitCamera: fitCamera,
            flip: flip,
            remove: remove,
            select: select,
            update: update,
            toScreen: toScreen,
            toWorld: toWorld,
        };

        function update() {
            var service = this,
                group = service.group;
            service.combine();
            if (service.flipping === 0) {
                service.fitGroup(group);
            }
        }

        function add(geometry, materials) {
            var service = this,
                box = service.box,
                size = service.size,
                items = service.items,
                hittables = service.hittables,
                group = service.group;
            var item = new CombinerItem(geometry, materials);
            items.push(item);
            hittables = items.map(function (item) {
                return item.model;
            });
            group.add(item.group);
            service.fitCamera();
            return item;
        }

        function remove() {
            var service = this,
                items = service.items,
                hittables = service.hittables,
                group = service.group;
            if (items.length > 1) {
                var item = items.pop();
                if (item.group.parent) {
                    group.remove(item.group);
                }
                hittables = items.map(function (item) {
                    return item.model;
                });
                service.fitCamera();
            }
        }

        function combine() {
            var service = this,
                items = service.items,
                group = service.group;
            var previousQuaternion = new THREE.Quaternion();
            var previousPosition = new THREE.Vector3();
            var groupPosition = new THREE.Vector3();
            if (items.length) {
                group.getWorldPosition(groupPosition);
                items.filter(function (item, i) {
                    item.inner.position.x += (1 - item.inner.position.x) / 5;
                    if (i > 0) {
                        var rotationQuaternion = new THREE.Quaternion().multiplyQuaternions(previousQuaternion, item.left.oppositeQuaternion);
                        item.group.position.copy(previousPosition.sub(groupPosition));
                        // item.group.position.copy(previousPosition);
                        item.group.setRotationFromQuaternion(rotationQuaternion);
                    }
                    /*
                    if (i === 1) {
                        item.model.rotation.y += 0.01;
                    }
                    */
                    item.right.getWorldQuaternion(previousQuaternion);
                    item.right.getWorldPosition(previousPosition);
                });
            }
        }

        function fit() {
            var service = this,
                box = service.box,
                size = service.size,
                center = service.center,
                centerhelper = service.centerhelper,
                group = service.group;
            box.setFromObject(group);
            box.getCenter(center);
            box.getSize(size);
            centerhelper.position.copy(center);
            group.worldToLocal(center);
            group.position.x = -center.x;
            group.position.y = -center.y;
            group.position.z = -center.z;
            return size;
        }

        function toWorld(v) {
            var service = this,
                projector = service.projector,
                camera = service.camera,
                w = window.innerWidth / 2,
                h = window.innerHeight / 2;
            var world = v.clone();
            world.x = world.x / w - 1;
            world.y = -world.y / h + 1;
            projector.unprojectVector(world, camera);
            return world;
        }

        function toScreen(v) {
            var service = this,
                camera = service.camera,
                w = window.innerWidth / 2,
                h = window.innerHeight / 2;
            var screen = v.clone();
            screen.project(camera);
            screen.x = (screen.x + 1) * w;
            screen.y = (-screen.y + 1) * h;
            return screen;
        }

        function fitCamera(offset, up) {
            if (!offset) {
                offset = 1.3;
            }
            if (!up) {
                up = new THREE.Vector3(0, 1, 0);
            }
            var service = this,
                projector = service.projector,
                box = service.box,
                size = service.size,
                center = service.center,
                group = service.group,
                camera = service.camera,
                controls = service.controls;
            box.setFromObject(group);
            box.getCenter(center);
            camera.up = up;
            camera.lookAt(center);
            camera.updateProjectionMatrix();
            var min = service.toScreen(box.min);
            var max = service.toScreen(box.max);
            var sc = service.toScreen(center);
            console.log(min, max, sc);
            box.applyMatrix4(camera.matrixWorldInverse);

            box.getSize(size);
            var aspect = size.x / size.y;
            var dim = (camera.aspect > aspect) ? size.y : size.x;
            if (camera.aspect < aspect) {
                dim /= camera.aspect;
            }
            dim *= offset;
            var z = dim / 2 / Math.sin(camera.fov / 2 * RAD);
            camera.position.normalize().multiplyScalar(z);
            var distance = camera.position.distanceTo(center);
            // console.log(camera.position, disc.position);
            // camera.far = distance + dim;
            camera.updateProjectionMatrix();
            if (controls) {
                // controls.maxDistance = distance + dim;
                controls.update();
            }
            /*
            box.setFromObject(group);
            box.getSize(size);
            var max = Math.max(size.x, size.y, size.z);
            var fov = camera.fov * RAD;
            var z = max / 2 / Math.tan(fov / 2) * 1.5;
            camera.position.normalize().multiplyScalar(z);
            if (controls) {
                controls.update();
            }
            */
        }

        function select(raycaster) {
            var service = this,
                items = service.items,
                hittables = service.hittables;
            var hitted = raycaster.intersectObjects(hittables);
            if (hitted.length) {
                var index = combiner.hittables.indexOf(hitted[0].object);
                var item = items[index];
                var rotation = item.inner.rotation.clone();
                return {
                    index: index,
                    item: item,
                    rotation: rotation,
                };
            } else {
                return null;
            }
        }

        function flip(raycaster) {
            var service = this,
                items = service.items,
                hittables = service.hittables;
            var hitted = raycaster.intersectObjects(hittables);
            if (hitted.length) {
                var index = hittables.indexOf(hitted[0].object);
                var item = items[index];
                service.flipping++;
                item.flip(function () {
                    service.flipping--;
                });
            }
        }

        return Combiner;

    }();

    window.Combiner = Combiner;

}());
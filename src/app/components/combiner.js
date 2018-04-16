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
            joint: joint,
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

        function init(geometry, materials) {
            var item = this,
                box = item.box,
                size = item.size,
                group = item.group,
                inner = item.inner;
            // geometry = new THREE.CylinderGeometry(2, 2, 10, 10);            
            materials[1].color = new THREE.Color(0x000000);
            var model = new THREE.Mesh(geometry, materials);
            var material;

            model.geometry.uvsNeedUpdate = true;
            model.geometry.normalsNeedUpdate = true;
            model.geometry.verticesNeedUpdate = true;

            // model.geometry.computeMorphNormals();
            model.geometry.computeFaceNormals();
            model.geometry.computeVertexNormals();
            model.geometry.computeBoundingBox();

            // console.log(model);
            box.setFromObject(model);
            box.getSize(size);

            if (true) {
                console.log(size);
                geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
                material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(0.2 * ++I, 0, 0),
                    wireframe: false,
                    transparent: false,
                    opacity: 1,
                });
                model = new THREE.Mesh(geometry, material);
            }

            model.position.set(size.x / 2, 0, 0);
            var left = item.joint(
                new THREE.Vector3(-size.x / 2, 0, 0),
                new THREE.Vector3(0, 0, -rad(180)), // + rad(10)
                0x00ff00
            );
            var right = item.joint(
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
        }

        function joint(origin, rotation, color) {
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
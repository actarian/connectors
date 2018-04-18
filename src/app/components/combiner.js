/* global window, document, console, TweenLite */

(function () {
    'use strict';

    var DEBUG = false;
    var DEBUG_HELPER = false;
    var DEBUG_ANGLE = false;
    var DEBUG_ARROW = true;
    var DEBUG_MODELS = true;
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
            item.outer = new THREE.Group();
            item.inner = new THREE.Group();
            item.init(geometry, materials);
        }

        CombinerItem.prototype = {
            enter: enter,
            init: init,
            flip: flip,
            getJoints: getJoints,
            setFlip: setFlip,
        };

        function enter() {
            var item = this;
            item.outer.position.x = item.size.x;
            TweenLite.to(item.outer.position, 0.6, {
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
                /*
                diffs = [
                    new THREE.Vector3(-size.x / 2, 0, 0), // left
                    new THREE.Vector3(size.x / 2, 0, 0), // right
                    new THREE.Vector3(0, -size.y / 2, 0), // top
                    new THREE.Vector3(0, size.y / 2, 0), // bottom
                ],
                */
                names = ['left', 'right', 'top', 'bottom'],
                colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00],
                index, joint, face;
            materials.map(function (material, index) {
                // console.log(material);
                var i = names.indexOf(material.name);
                if (i !== -1) {
                    var joint = new THREE.Group();
                    // joint.diff = diffs[i];
                    joint.name = names[i];
                    joint.c = colors[i];
                    joint.vertices = [];
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
                // joint.diff.sub(joint.position);
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
            if (DEBUG_ANGLE) {
                joints.right.normal.y += 0.2;
            }
            // console.log('item.getJoints', joints, size);
            return joints;
        }

        function init(geometry, materials) {
            var item = this,
                box = item.box,
                size = item.size,
                group = item.group,
                outer = item.outer,
                inner = item.inner;

            for (var v = 0; v < geometry.vertices.length; v++) {
                geometry.vertices[v].x *= SCALE;
                geometry.vertices[v].y *= SCALE;
                geometry.vertices[v].z *= SCALE;
            }

            var model = new THREE.Mesh(geometry, materials);
            box.setFromObject(model);
            box.getSize(size);

            var joints = item.getJoints(geometry, materials, size);

            var material;

            model.geometry.uvsNeedUpdate = true;
            model.geometry.normalsNeedUpdate = true;
            model.geometry.verticesNeedUpdate = true;

            // model.geometry.computeMorphNormals();
            model.geometry.computeFaceNormals();
            model.geometry.computeVertexNormals();
            model.geometry.computeBoundingBox();

            // console.log(model);

            if (DEBUG_MODELS) {
                // geometry = new THREE.CylinderGeometry(2, 2, 10, 10);            
                materials[1].color = new THREE.Color(0x000000);
                geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
                material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(0.2 * ++I, 0, 0),
                    wireframe: false,
                    transparent: false,
                    opacity: 1.0,
                });
                model = new THREE.Mesh(geometry, material);
            }

            for (var key in joints) {
                var joint = joints[key];
                var x = joint.normal.x,
                    y = joint.normal.y,
                    z = -joint.normal.z;
                var rotation = new THREE.Euler(
                    0,
                    Math.atan2(z, x),
                    Math.atan2(y, Math.sqrt(x * x + z * z))
                );
                joint.rotation.copy(rotation);
                model.add(joint);
                joint.oquaternion = new THREE.Quaternion().multiplyQuaternions(joint.quaternion, flipQuaternion);
                if (DEBUG_ARROW) {
                    var s = size.x / 10;
                    var arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), s, joint.c, s / 2, s / 2);
                    joint.arrow = arrow;
                    joint.add(arrow);
                }
            }
            inner.position.set(size.x / 2, 0, 0);
            inner.add(model);
            outer.add(inner);
            group.add(outer);
            item.joints = joints;
            item.model = model;
        }

        function setFlip() {
            var item = this,
                model = item.model;
            var position = new THREE.Vector3();
            if (item.flipped) {
                // model.quaternion.copy(item.joints.right.oquaternion);
                item.joints.right.localToWorld(position);
                item.inner.worldToLocal(position);
                position.x -= item.size.x / 2;
            } else {
                // model.quaternion.copy(item.joints.left.oquaternion);
                item.joints.left.localToWorld(position);
                item.inner.worldToLocal(position);
                position.x += item.size.x / 2;
            }
            item.model.position.sub(position);
            console.log('position', position);
        }

        function flip(callback) {
            var item = this,
                inner = item.inner;
            // console.log('flip()');
            item.flipped = !item.flipped;
            TweenLite.to(inner.rotation, 0.3, {
                y: item.flipped ? Math.PI : 0,
                ease: Power2.easeOut,
                overwrite: 'all',
                // ease: Elastic.easeOut,
                // onUpdate: function() { },
                onComplete: function () {
                    // console.log('flipped');
                    item.setFlip();
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
            if (DEBUG_HELPER) {
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
            item.setFlip();
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
            var lquaternion, left, right;

            function combineItem(item, i) {
                if (item.flipped) {
                    lquaternion = item.joints.right.quaternion;
                    left = item.joints.right;
                    right = item.joints.left;
                } else {
                    lquaternion = item.joints.left.oquaternion;
                    left = item.joints.left;
                    right = item.joints.right;
                }
                if (i > 0) {
                    previousPosition.sub(groupPosition);
                    item.group.position.copy(previousPosition);
                    item.group.setRotationFromQuaternion(previousQuaternion.multiply(lquaternion));
                    item.group.updateMatrixWorld();
                }
                /*
                if (i === 1) {
                    item.outer.rotation.x += 0.01;
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
                var rotation = item.outer.rotation.clone();
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
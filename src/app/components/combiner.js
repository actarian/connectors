/* global window, document, console, TweenLite */

(function () {
    'use strict';

    var DEBUG = {
        HELPER: true,
        JOINTS: true,
        MODELS: true,
        ANGLE: false,
        FINISH: 'standard', // 'weathered',
    };

    var RAD = Math.PI / 180;
    var SCALE = 0.025;
    var I = 0;

    function rad(degree) {
        return degree * RAD;
    }

    var flipQuaternion = new THREE.Quaternion();
    flipQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

    var CombinerItem = function () {

        function CombinerItem() {
            var item = this;
            item.size = new THREE.Vector3();
            item.box = new THREE.Box3();
            item.group = new THREE.Group();
            item.outer = new THREE.Group();
            item.inner = new THREE.Group();
        }

        CombinerItem.prototype = {
            enter: enter,
            load: load,
            flip: flip,
            getJoints: getJoints,
            setFlip: setFlip,
        };

        function enter(callback) {
            var item = this;
            item.outer.position.x = item.size.x;
            TweenLite.to(item.outer.position, 0.6, {
                x: 0,
                ease: Power2.easeOut,
                overwrite: 'all',
                // ease: Elastic.easeOut, 
                onComplete: function () {
                    if (typeof callback === 'function') {
                        callback();
                    }
                }
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

        function getMaterials(materials, library, finish) {
            var names = ['left', 'right', 'top', 'bottom'],
                colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00],
                index, finish = finish || DEBUG.FINISH;
            return materials.map(function (material, index) {
                var i = names.indexOf(material.name);
                if (i !== -1) {
                    return new THREE.MeshStandardMaterial({
                        name: material.name,
                        color: new THREE.Color(colors[i]),
                        visible: false,
                    });
                } else {
                    material.name = material.name.replace('chrome', 'silver');
                    // console.log(material.name);
                    return library.materials[finish][material.name].clone();
                }
            });
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
            materials.filter(function (material, index) {
                // console.log(material);
                var i = names.indexOf(material.name);
                if (i !== -1) {
                    var joint = new THREE.Group();
                    // joint.diff = diffs[i];
                    joint.name = names[i];
                    joint.color = colors[i];
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
                joint.origin = joint.position.clone();
                // joint.diff.sub(joint.position);
                joint.vertices = null;
            }
            if (!joints.left) {
                joints.left = new THREE.Group();
                joints.left.position.set(-size.x / 2, 0, 0);
                joints.left.origin = joint.position.clone();
                joints.left.normal = new THREE.Vector3(-1, 0, 0);
                joints.left.c = colors[0];
            }
            if (!joints.right) {
                joints.right = new THREE.Group();
                joints.right.position.set(size.x / 2, 0, 0);
                joints.right.origin = joint.position.clone();
                joints.right.normal = new THREE.Vector3(1, 0, 0);
                joints.right.c = colors[1];
            }
            if (DEBUG.ANGLE) {
                joints.right.normal.y += 0.2;
            }
            // console.log('item.getJoints', joints, size);
            return joints;
        }

        function load(geometry, materials, library, finish) {
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
            materials = getMaterials(materials, library, finish);
            var model = new THREE.Mesh(geometry, materials);
            box.setFromObject(model);
            box.getSize(size);
            var joints = item.getJoints(geometry, materials, size);
            item.quaternionL = model.quaternion.clone();
            var quaternionD = new THREE.Quaternion().setFromUnitVectors(joints.left.normal.clone().multiplyScalar(-1), joints.right.normal);
            item.quaternionR = new THREE.Quaternion().multiplyQuaternions(item.quaternionL, flipQuaternion).multiply(quaternionD.inverse());
            item.positionL = new THREE.Vector3();
            item.positionR = joints.left.origin.clone().sub(joints.right.origin.clone().applyQuaternion(item.quaternionR));
            console.log(item.positionR);
            model.geometry.computeVertexNormals();
            model.geometry.verticesNeedUpdate = true;
            model.geometry.uvsNeedUpdate = true;
            // model.geometry.mergeVertices();
            // model.geometry.computeFaceNormals();
            // model.geometry.normalsNeedUpdate = true;
            // model.geometry.uvsNeedUpdate = true;
            // model.geometry.computeMorphNormals();
            /*           
            model.geometry.computeFaceNormals();
            model.geometry.computeVertexNormals();
            model.geometry.computeBoundingBox();
            */
            // console.log(model);
            if (DEBUG.MODELS) {
                // geometry = new THREE.CylinderGeometry(2, 2, 10, 10);            
                materials[1].color = new THREE.Color(0x000000);
                geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
                var material = new THREE.MeshStandardMaterial({
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
                var euler = new THREE.Euler(
                    0,
                    Math.atan2(z, x),
                    Math.atan2(y, Math.sqrt(x * x + z * z))
                );
                joint.rotation.copy(euler);
                model.add(joint);
                // joint.oquaternion = new THREE.Quaternion().multiplyQuaternions(joint.quaternion, flipQuaternion);
                if (DEBUG.JOINTS) {
                    var helper = new THREE.Mesh(
                        new THREE.BoxGeometry(0.1, 0.1, 0.1),
                        new THREE.MeshBasicMaterial({
                            color: joint.color,
                        })
                    );
                    joint.add(helper);
                    /*
                    var s = size.x / 10;
                    var arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), s, joint.color, s / 2, s / 2);
                    joint.add(arrow);
                    */
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
            // THREE.Quaternion.slerp(item.quaternionL, item.quaternionR, item.model.quaternion, item.flipped ? 1 : 0);
            model.quaternion.copy(item.flipped ? item.quaternionR : item.quaternionL);
            model.position.copy(item.flipped ? item.positionR : item.positionL);
            item.group.updateMatrixWorld();
            /*
            var position = new THREE.Vector3();
            if (item.flipped) {
                // model.quaternion.copy(item.joints.right.quaternion.conjugate());
                // item.joints.right.localToWorld(position);
                // item.pivot.worldToLocal(position);
                // item.model.setRotationFromQuaternion(item.joints.right.quaternion.conjugate());
                // item.model.position.set(0, 0, 0).sub(item.joints.right.origin);
                // position.x -= item.size.x / 2;
                // item.model.quaternion.setFromUnitVectors(item.joints.left.normal, item.joints.right.normal);
            } else {
                // model.quaternion.copy(item.joints.left.quaternion.conjugate());
                // item.joints.left.localToWorld(position);
                // item.pivot.worldToLocal(position);
                // item.model.setRotationFromQuaternion(item.joints.left.quaternion.conjugate());
                // item.model.position.set(0, 0, 0).sub(item.joints.left.origin);
                // position.x += item.size.x / 2;
                // item.model.setRotationFromQuaternion(new THREE.Quaternion());
            }
            item.model.updateMatrixWorld();
            // console.log('setFlip', item.flipped, item.joints.left.quaternion);
            */
        }

        function flip(callback) {
            var item = this,
                inner = item.inner;
            // console.log('flip()');
            item.flipped = !item.flipped;
            var animation = {
                pow: item.flipped ? 0 : 1
            };
            TweenLite.to(animation, 0.3, {
                pow: item.flipped ? 1 : 0,
                ease: Power2.easeOut,
                overwrite: 'all',
                // ease: Elastic.easeOut,
                onUpdate: function () {
                    THREE.Quaternion.slerp(item.quaternionL, item.quaternionR, item.model.quaternion, animation.pow);
                    item.model.position.lerpVectors(item.positionL, item.positionR, animation.pow);
                },
                onComplete: function () {
                    // console.log('flipped');
                    // item.setFlip();
                    if (typeof callback === 'function') {
                        callback();
                    }
                },
            });
            /*
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
            */
        }

        return CombinerItem;

    }();

    var Combiner = function () {

        function Combiner(scene, library) {
            var combiner = this;
            combiner.flags = {
                rotate: false,
            };
            combiner.scene = scene;
            combiner.library = library;
            combiner.flipping = 0;
            combiner.entering = 0;
            combiner.items = [];
            combiner.hittables = [];
            combiner.center = new THREE.Vector3();
            combiner.size = new THREE.Vector3();
            combiner.group = new THREE.Group();
            combiner.box = new THREE.Box3();
            if (DEBUG.HELPER) {
                combiner.boxhelper = new THREE.Box3Helper(combiner.box, 0xff00ff);
                combiner.originhelper = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 0.1, 0.1),
                    new THREE.MeshBasicMaterial({
                        color: 0xaa00ff
                    })
                );
                combiner.centerhelper = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 0.1, 0.1),
                    new THREE.MeshBasicMaterial({
                        color: 0xff00ff
                    })
                );
                combiner.scene.add(combiner.boxhelper);
                combiner.scene.add(combiner.originhelper);
                combiner.scene.add(combiner.centerhelper);
            }
        }

        Combiner.prototype = {
            add: add,
            adjust: adjust,
            busy: busy,
            combine: combine,
            fit: fit,
            flip: flip,
            flipItem: flipItem,
            hitAndFlip: hitAndFlip,
            pop: pop,
            remove: remove,
            rotate: rotate,
            select: select,
            unselect: unselect,
            update: update,
        };

        function add(geometry, materials, library, finish) {
            var combiner = this,
                library = combiner.library,
                box = combiner.box,
                size = combiner.size,
                items = combiner.items,
                hittables = combiner.hittables,
                group = combiner.group;

            combiner.unselect();
            var item = new CombinerItem();
            item.load(geometry, materials, library, finish);
            items.push(item);
            combiner.hittables = items.map(function (item) {
                return item.model;
            });
            group.add(item.group);
            item.setFlip();
            combiner.adjust();
            return item;
        }

        function adjust() {
            var combiner = this;
            combiner.combine();
            combiner.fit();
            // combiner.fitCamera();
        }

        function busy() {
            var combiner = this;
            return combiner.entering || combiner.flipping;
        }

        function combine() {
            var combiner = this,
                items = combiner.items,
                group = combiner.group;
            // var quaternionL = new THREE.Quaternion();
            var quaternionR = new THREE.Quaternion();
            var positionL = new THREE.Vector3();
            var positionR = new THREE.Vector3();
            var left, right;
            // var groupPosition = new THREE.Vector3();
            // var lquaternion;

            function combineItem(item, i) {
                if (item.flipped) {
                    // lquaternion = item.joints.right.quaternion;
                    left = item.joints.right;
                    right = item.joints.left;
                } else {
                    // lquaternion = item.joints.left.oquaternion;
                    left = item.joints.left;
                    right = item.joints.right;
                }
                if (i > 0) {
                    //
                    item.group.setRotationFromQuaternion(quaternionR);
                    item.group.position.copy(positionR);
                    //
                    // positionL = left.position.clone();
                    // item.model.localToWorld(positionL);
                    // 
                    if (false) {
                        left.getWorldPosition(positionL);
                        item.group.worldToLocal(positionL);
                        item.group.position.sub(positionL);
                    }
                    //
                    // console.log('left.position', positionL);
                    // item.group.position.set(0, 0, 0);
                    // left.getWorldQuaternion(quaternionL);
                    /*
                    positionR.sub(groupPosition);
                    item.group.position.copy(positionR);
                    // item.group.setRotationFromQuaternion(quaternionR.multiply(lquaternion));
                    item.group.setRotationFromQuaternion(quaternionR);
                    */
                }
                //} else {
                //    item.group.rotation.z = rad(30);
                //}
                console.log(left.origin);
                // right.updateMatrixWorld();
                right.getWorldQuaternion(quaternionR);
                right.getWorldPosition(positionR);
            }
            if (items.length) {
                // group.getWorldPosition(groupPosition);
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
            if (DEBUG.HELPER) {
                centerhelper.position.copy(center);
            }
            /*
            group.worldToLocal(center);
            group.position.x = -center.x;
            group.position.y = -center.y;
            group.position.z = -center.z;
            */
            return size;
        }

        function flip(callback) {
            var combiner = this,
                items = combiner.items,
                hittables = combiner.hittables;
            if (combiner.selection) {
                combiner.flipItem(combiner.selection.item, callback);
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
                    combiner.entering++;
                    items[selection.index].enter(function () {
                        combiner.entering--;
                    });
                }
                return item;
            } else {
                return combiner.pop();
            }
        }

        function rotate(y) {
            var combiner = this;
            combiner.selection.item.outer.rotation.x = combiner.selection.rotation.x + y;
            combiner.selection.item.group.updateMatrixWorld();
            combiner.adjust();
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
                /*
                item.outline(true, combiner.library);
                // item.model.material.emissive = new THREE.Color(0x888888);
                */
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
                /*
                combiner.selection.item.outline(false, combiner.library);
                // combiner.selection.item.model.material.emissive = new THREE.Color(0x000000);
                */
                // combiner.selection.item.model.material.needsUpdate = true;
                combiner.selection = null;
            }
        }

        function update() {
            var combiner = this,
                flags = combiner.flags;
            if (!combiner.busy()) {
                if (flags.rotate) {
                    if (combiner.items.length) {
                        var first = combiner.items[0];
                        first.outer.rotation.x += 0.01;
                        combiner.adjust();
                    }
                } else {
                    // combiner.combine();
                    combiner.fit();
                }
            }
        }

        return Combiner;

    }();

    window.Combiner = Combiner;

}());
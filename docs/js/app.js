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
/* global window, document, console, TweenLite */

(function () {
    'use strict';

    var Effects = function () {

        function Effects(scene, camera, renderer, w, h) {
            var effects = this;
            //
            var renderPass = new THREE.RenderPass(scene, camera);
            //
            var outlinePass = new THREE.OutlinePass(new THREE.Vector2(w, h), scene, camera);
            outlinePass.visibleEdgeColor.set(0x00ff00);
            outlinePass.hiddenEdgeColor.set(0x000000);
            outlinePass.edgeStrength = 5.0;
            outlinePass.edgeGlow = 0.0;
            outlinePass.edgeThickness = 1.0;
            outlinePass.pulsePeriod = 2;
            outlinePass.rotate = false;
            outlinePass.usePatternTexture = false;
            //
            var fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
            fxaaPass.uniforms.resolution.value.set(1 / w, 1 / h);
            fxaaPass.renderToScreen = true;
            //
            var composer = new THREE.EffectComposer(renderer);
            composer.addPass(renderPass);
            composer.addPass(outlinePass);
            composer.addPass(fxaaPass);
            //
            effects.renderPass = renderPass;
            effects.outlinePass = outlinePass;
            effects.fxaaPass = fxaaPass;
            effects.composer = composer;
        }

        Effects.prototype = {
            update: update,
            resize: resize,
            select: select,
            unselect: unselect,
        };

        function update() {
            var effects = this;
            effects.composer.render();
        }

        function resize(w, h) {
            var effects = this;
            effects.composer.setSize(w, h);
            effects.fxaaPass.uniforms.resolution.value.set(1 / w, 1 / h);
        }

        function select(object) {
            var effects = this;
            effects.outlinePass.selectedObjects = [object];
        }

        function unselect() {
            var effects = this;
            effects.outlinePass.selectedObjects = [];
        }

        return Effects;

    }();

    window.Effects = Effects;

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
                url: i % 2 === 0 ? 'img/Curved Body 2.js' : 'img/Angled Emitter 1.js',
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

}());
/* global window, document, console, TweenLite */

(function () {
    'use strict';

    var Library = function () {

        var BASE = 'img/textures/';
        var ANISOTROPY = 1;

        function Library(renderer) {
            ANISOTROPY = renderer.capabilities.getMaxAnisotropy();
            this.replaceShader();
            var manager = new THREE.LoadingManager();
            manager.onProgress = function (item, loaded, total) {
                console.log('Library.manager.onProgress', item, loaded, total);
            };
            this.renderer = renderer;
            this.manager = manager;
            this.textures = this.getTextures();
            this.materials = this.getMaterials();
        }

        // publics
        Library.prototype = {
            getMaterials: getMaterials,
            getTextures: getTextures,
            getTexture: getTexture,
            getTextureCube: getTextureCube,
            getTextureCubeHdr: getTextureCubeHdr,
            replaceShader: replaceShader,
        };

        function getMaterials() {
            var service = this,
                manager = this.manager,
                loader = this.loader,
                textures = this.textures;
            return {
                floor: new THREE.MeshPhongMaterial({
                    bumpMap: textures.floor,
                    bumpScale: 0.05,
                    color: 0x101010,
                    specular: 0x101010,
                    reflectivity: 0.15,
                    shininess: 12,
                    // metal: true,
                }),
                wrap: new THREE.MeshPhongMaterial({
                    name: 'wrap',
                    color: 0x101010,
                    specular: 0x444444,
                    shininess: 7,
                    reflectivity: 0.75,
                    specularMap: textures.leatherLight,
                    bumpMap: textures.leatherBump,
                    bumpScale: 0.15,
                    combine: THREE.MixOperation,
                    // metal: true,
                }),
                bronze: new THREE.MeshPhongMaterial({
                    name: 'bronze',
                    color: 0xc07f5d,
                    specular: 0x555555,
                    specularMap: textures.silver,
                    shininess: 10,
                    reflectivity: 0.20,
                    envMap: textures.env,
                    combine: THREE.MixOperation,
                    bumpMap: textures.silver,
                    bumpScale: 0.001,
                    // metal: true,
                }),
                gold: new THREE.MeshPhongMaterial({
                    name: 'gold',
                    color: 0xc8ad60,
                    specular: 0x555555,
                    specularMap: textures.silver,
                    shininess: 10,
                    reflectivity: 0.20,
                    envMap: textures.env,
                    combine: THREE.MixOperation,
                    bumpMap: textures.silver,
                    bumpScale: 0.001,
                    // metal: true,
                }),
                green: new THREE.MeshPhongMaterial({
                    name: 'green',
                    color: 0x00aa00,
                    specular: 0x333333,
                    specularMap: textures.silver,
                    shininess: 30,
                    reflectivity: 0.10,
                    envMap: textures.env,
                    combine: THREE.MixOperation,
                    bumpMap: textures.silver,
                    bumpScale: 0.003,
                    // metal: true,
                }),
                red: new THREE.MeshPhongMaterial({
                    name: 'red',
                    color: 0xdd0000,
                    specular: 0x333333,
                    specularMap: textures.silver,
                    shininess: 30,
                    reflectivity: 0.10,
                    envMap: textures.env,
                    combine: THREE.MixOperation,
                    bumpMap: textures.silver,
                    bumpScale: 0.003,
                    // metal: true,
                }),
                standard: {
                    silver: new THREE.MeshPhongMaterial({
                        name: 'chrome',
                        color: 0x888888,
                        specular: 0x555555,
                        specularMap: textures.silver,
                        shininess: 30,
                        reflectivity: 0.15,
                        envMap: textures.env,
                        combine: THREE.MixOperation,
                        bumpMap: textures.silver,
                        bumpScale: 0.003,
                        // metal: true,
                    }),
                    black: new THREE.MeshPhongMaterial({ // MeshLambertMaterial
                        name: 'black',
                        color: 0x0d0d0d, // 0x0d0d0d
                        reflectivity: 0.3,
                        envMap: textures.env,
                        combine: THREE.MultiplyOperation
                    }),
                },
                weathered: {
                    silver: new THREE.MeshPhongMaterial({
                        name: 'chrome',
                        color: 0x444444,
                        specular: 0x555555,
                        specularMap: textures.weathered,
                        shininess: 90,
                        reflectivity: 0.15,
                        envMap: textures.env,
                        combine: THREE.MixOperation,
                        bumpMap: textures.silver,
                        bumpScale: 0.003,
                        // metal: true,
                        map: textures.weathered,
                        roughness: 0.2,
                        // roughnessMap: textures.silver,
                        metalness: 0.5,
                        metalnessMap: textures.weathered,
                    }),
                    black: new THREE.MeshPhongMaterial({
                        name: 'chrome',
                        color: 0x333333,
                        specular: 0x444444,
                        specularMap: textures.weathered,
                        shininess: 90,
                        reflectivity: 0.05,
                        envMap: textures.env,
                        combine: THREE.MixOperation,
                        bumpMap: textures.silver,
                        bumpScale: 0.003,
                        // metal: true,
                        map: textures.weathered,
                        roughness: 1.4,
                        roughnessMap: textures.weathered,
                        metalness: 0.5,
                        metalnessMap: textures.silver,
                    }),
                    /*
                    black: new THREE.MeshLambertMaterial({
                        name: 'black',
                        color: 0x070707, // 0x070707
                        specular: 0x0a0a0a,
                        reflectivity: 0.05,
                        envMap: textures.env,
                        combine: THREE.MultiplyOperation
                    }),
                    */
                },
                /*
                silver: {
                    silver: new THREE.MeshPhongMaterial({
                        name: 'chrome',
                        color: 0x888888,
                        specular: 0x555555,
                        specularMap: textures.silver,
                        shininess: 30,
                        reflectivity: 0.15,
                        envMap: textures.env,
                        combine: THREE.MixOperation,
                        bumpMap: textures.silver,
                        bumpScale: 0.003,
                        // metal: true,
                    }),
                    black: new THREE.MeshPhongMaterial({
                        name: 'black',
                        color: 0x777777,
                        specular: 0x444444,
                        specularMap: textures.silver,
                        shininess: 30,
                        reflectivity: 0.15,
                        envMap: textures.env,
                        combine: THREE.MixOperation,
                        bumpMap: textures.silver,
                        bumpScale: 0.003,
                        // metal: true,
                    }),
                },
                */
                black: {
                    silver: new THREE.MeshPhongMaterial({
                        name: 'chrome',
                        color: 0x070707, // 0x070707
                        specular: 0x0a0a0a,
                        reflectivity: 0.05,
                        envMap: textures.env,
                        combine: THREE.MultiplyOperation
                    }),
                    black: new THREE.MeshPhongMaterial({ // MeshLambertMaterial
                        name: 'black',
                        color: 0x060606, // 0x060606
                        specular: 0x0a0a0a,
                        reflectivity: 0.05,
                        envMap: textures.env,
                        combine: THREE.MultiplyOperation
                    }),
                },
                light: {
                    off: new THREE.MeshPhongMaterial({
                        name: 'light',
                        opacity: 0.98,
                        transparent: true,
                        color: 0x444444,
                        specular: 0x888888,
                        shininess: 20,
                        reflectivity: 0.3
                    }),
                    on6: new THREE.MeshPhongMaterial({
                        name: 'light',
                        opacity: 0.98,
                        transparent: true,
                        color: 0x444444,
                        emissive: 0x444444,
                        specular: 0x888888,
                        shininess: 20,
                        reflectivity: 0.3
                    }),
                    on12: new THREE.MeshPhongMaterial({
                        name: 'light',
                        color: 0xffffff,
                        emissive: 0x888888,
                        specular: 0xffffff,
                        shininess: 100,
                        reflectivity: 0.3
                    }),
                },
                glare: {
                    off: new THREE.MeshLambertMaterial({
                        name: 'glare',
                        opacity: 0,
                        transparent: true,
                        color: 0x000000,
                    }),
                    on6: new THREE.MeshLambertMaterial({
                        name: 'glare',
                        opacity: 0.6,
                        transparent: true,
                        color: 0xecf4fb,
                        map: textures.glare,
                        blending: THREE.AdditiveBlending,
                        specular: 0x000000,
                        shininess: 0,
                        combine: THREE.MixOperation,
                        reflectivity: 0
                    }),
                    on12: new THREE.MeshLambertMaterial({
                        name: 'glare',
                        opacity: 0.85,
                        transparent: true,
                        color: 0xecf4fb,
                        map: textures.glare,
                        blending: THREE.AdditiveBlending,
                        specular: 0x000000,
                        shininess: 0,
                        combine: THREE.MixOperation,
                        reflectivity: 0
                    }),
                },
                emitterGlare: {
                    off: new THREE.MeshLambertMaterial({
                        name: 'glare',
                        opacity: 0,
                        transparent: true,
                        color: 0x000000,
                    }),
                    on6: new THREE.MeshLambertMaterial({
                        name: 'glare',
                        opacity: 0.6,
                        transparent: true,
                        color: 0xecf4fb,
                        map: textures.emitterGlare,
                        blending: THREE.AdditiveBlending,
                        specular: 0x000000,
                        shininess: 0,
                        combine: THREE.MixOperation,
                        reflectivity: 0
                    }),
                    on12: new THREE.MeshLambertMaterial({
                        name: 'glare',
                        opacity: 0.85,
                        transparent: true,
                        color: 0xecf4fb,
                        map: textures.emitterGlare,
                        blending: THREE.AdditiveBlending,
                        specular: 0x000000,
                        shininess: 100,
                        combine: THREE.MixOperation,
                        reflectivity: 0
                    }),
                },
            };
        }

        function getTexture(url) {
            var service = this,
                manager = this.manager,
                textures = this.textures;
            // scope.loader.add('texture-silver');
            return new THREE.TextureLoader(manager).load(BASE + url,
                function onLoad(texture) {
                    // scope.loader.remove('texture-silver');            
                },
                function onProgress(loaded, total) {

                },
                function onError(e) {
                    // scope.loader.remove('texture-silver');
                });
        }

        function getTextureCube(url) {
            var service = this,
                manager = this.manager,
                textures = this.textures;
            // scope.loader.add('texture-silver');
            return new THREE.CubeTextureLoader(manager).setPath(BASE + url).load([
                    'px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'
                ],
                function onLoad(texture) {
                    // scope.loader.remove('texture-silver');
                },
                function onProgress(loaded, total) {

                },
                function onError(e) {
                    // scope.loader.remove('texture-silver');
                });
        }

        function getTextureCubeHdr(url, key) {
            var service = this,
                renderer = this.renderer,
                manager = this.manager,
                textures = this.textures;
            var urls = [
                BASE + url + 'px.hdr', BASE + url + 'nx.hdr',
                BASE + url + 'py.hdr', BASE + url + 'ny.hdr',
                BASE + url + 'pz.hdr', BASE + url + 'nz.hdr'
            ];
            return new THREE.HDRCubeTextureLoader().load(THREE.UnsignedByteType, urls, function (cubemap) {
                renderer.gammaInput = true; // ???
                renderer.gammaOutput = true;
                renderer.toneMapping = THREE.LinearToneMapping;
                renderer.toneMappingExposure = 1.3;
                var generator = new THREE.PMREMGenerator(cubemap);
                generator.update(renderer);
                var packer = new THREE.PMREMCubeUVPacker(generator.cubeLods);
                packer.update(renderer);
                textures[key] = packer.CubeUVRenderTarget;
                cubemap.dispose();
                service.materials.weathered.silver.envMap = packer.CubeUVRenderTarget;
                service.materials.weathered.silver.needsUpdate = true;
                service.materials.weathered.black.envMap = packer.CubeUVRenderTarget;
                service.materials.weathered.black.needsUpdate = true;
                // generator.dispose();
                // packer.dispose();
                // scope.loader.remove('texture-silver');
            });
        }

        function getTextures() {
            var service = this,
                manager = this.manager,
                textures = {};
            //
            textures.env = service.getTextureCube('env/');
            // textures.env = service.getTextureCubeHdr('env/pisa/', 'env');
            textures.env.anisotropy = ANISOTROPY;
            textures.env.format = THREE.RGBFormat;
            // 
            textures.floor = service.getTexture('floor.jpg');
            textures.floor.anisotropy = ANISOTROPY;
            textures.floor.wrapS = THREE.RepeatWrapping;
            textures.floor.wrapT = THREE.RepeatWrapping;
            textures.floor.repeat.set(40, 40);
            //
            textures.silver = service.getTexture('brushed-light.jpg');
            textures.silver.anisotropy = ANISOTROPY;
            // textures.silver.wrapS = THREE.RepeatWrapping;
            textures.silver.wrapT = THREE.RepeatWrapping;
            // textures.silver.repeat.set(1, 1);
            //
            textures.weathered = service.getTexture('brushed-dark.jpg');
            textures.weathered.anisotropy = ANISOTROPY;
            // textures.weathered.wrapS = THREE.RepeatWrapping;
            textures.weathered.wrapT = THREE.RepeatWrapping;
            // textures.weathered.repeat.set(1, 1);
            // 
            textures.bump = service.getTexture('brushed-dark.jpg');
            textures.bump.anisotropy = ANISOTROPY;
            textures.bump.wrapS = THREE.RepeatWrapping;
            textures.bump.wrapT = THREE.RepeatWrapping;
            textures.bump.repeat.set(5, 5);
            //
            textures.glare = service.getTexture('glare.jpg');
            textures.glare.anisotropy = ANISOTROPY;
            //
            textures.emitterGlare = service.getTexture('emitter-glare.jpg');
            textures.emitterGlare.anisotropy = ANISOTROPY;
            //
            textures.leatherBump = service.getTexture('leather-bump.jpg');
            textures.leatherBump.anisotropy = ANISOTROPY;
            textures.leatherBump.wrapS = THREE.RepeatWrapping;
            textures.leatherBump.wrapT = THREE.RepeatWrapping;
            // textures.leatherBump.repeat.set(1, 1);
            //
            textures.leatherLight = service.getTexture('leather-light.jpg');
            textures.leatherLight.anisotropy = ANISOTROPY;
            textures.leatherLight.wrapS = THREE.RepeatWrapping;
            textures.leatherLight.wrapT = THREE.RepeatWrapping;
            // textures.leatherLight.repeat.set(1, 1);
            //
            textures.reptileBump = service.getTexture('reptile-bump.jpg');
            textures.reptileBump.anisotropy = ANISOTROPY;
            textures.reptileBump.wrapS = THREE.RepeatWrapping;
            textures.reptileBump.wrapT = THREE.RepeatWrapping;
            // textures.reptileBump.repeat.set(1, 1);
            //
            textures.reptileLight = service.getTexture('reptile-light.jpg');
            textures.reptileLight.anisotropy = ANISOTROPY;
            textures.reptileLight.wrapS = THREE.RepeatWrapping;
            textures.reptileLight.wrapT = THREE.RepeatWrapping;
            // textures.reptileLight.repeat.set(1, 1);
            //
            textures.stingrayBump = service.getTexture('stingray-bump.jpg');
            textures.stingrayBump.anisotropy = ANISOTROPY;
            textures.stingrayBump.wrapS = THREE.RepeatWrapping;
            textures.stingrayBump.wrapT = THREE.RepeatWrapping;
            // textures.stingrayBump.repeat.set(1, 1);
            //
            textures.stingrayLight = service.getTexture('stingray-light.jpg');
            textures.stingrayLight.anisotropy = ANISOTROPY;
            textures.stingrayLight.wrapS = THREE.RepeatWrapping;
            textures.stingrayLight.wrapT = THREE.RepeatWrapping;
            // textures.stingrayLight.repeat.set(1, 1);
            return textures;
        }

        function replaceShader() {
            var fragment = THREE.ShaderChunk.meshphong_frag;
            // console.log('Library.replaceShader THREE.ShaderChunk.meshphong_frag', fragment);
            var outgoingLightA = "vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;";
            var outgoingLightB = "vec3 outgoingLight = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) * specular + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveLight;";
            // console.log('MAterials.replacing meshphong_frag', fragment.indexOf(outgoingLightA));
            THREE.ShaderChunk.meshphong_frag = fragment.replace(outgoingLightA, outgoingLightB);
        }

        return Library;

    }();

    window.Library = Library;

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
/* global window, document, console, TweenLite, Forge, Combiner, Orbiter, Library */

(function () {
    'use strict';

    if (!Detector.webgl) {
        Detector.addGetWebGLMessage();
        return;
    }

    var forge = new Forge();

    var btnAdd = document.querySelector('.btn-add');
    var btnRemove = document.querySelector('.btn-remove');
    var btnFlip = document.querySelector('.btn-flip');
    var container = document.querySelector('.editor');
    var w = container.offsetWidth,
        h = container.offsetHeight;

    var renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
    });
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    var camera = new THREE.PerspectiveCamera(45, w / h, 1, 50000);
    // camera.position.set(0, 20, 40);
    // camera.lookAt(0, 0, 0);
    // controls.update() must be called after any manual changes to the camera's transform
    var controls;
    // var controls = new THREE.OrbitControls(camera);
    // controls.update();

    var scene = new THREE.Scene();

    var library = new Library(renderer);

    var lights = addLights(scene);

    /*
    var light = new THREE.PointLight(0xddddee, 1, 2000);
    light.position.set(0, 200, 0);
    scene.add(light);
    */

    var floor = addFloor(scene);

    var combiner = new Combiner(scene, library);
    scene.add(combiner.group);

    var orbiter = new Orbiter(scene, camera, controls);

    var effects = new Effects(scene, camera, renderer, w, h);

    var raycaster = new THREE.Raycaster();
    var down;

    function animate() {
        requestAnimationFrame(animate);
        // required if controls.enableDamping or controls.autoRotate are set to true
        // controls.update();
        combiner.update();
        //
        var y = combiner.center.y - combiner.size.y / 2 - 3;
        floor.position.y += (y - floor.position.y) / 8;
        lights.position.x += (combiner.center.x - lights.position.x) / 8;
        lights.position.y += (combiner.center.y - lights.position.y) / 8;
        lights.position.z += (combiner.center.z - lights.position.z) / 8;
        // floor.position.x = combiner.center.x;
        // floor.position.z = combiner.center.z;
        //
        orbiter.update();
        effects.update();
        // renderer.render(scene, camera);
    }

    function addLights(scene) {
        var lights = new THREE.Group();
        lights.name = 'pivot';
        lights.rotation.y = Math.PI / 180 * 90;
        //
        var light = new THREE.AmbientLight(0x444444);
        scene.add(light);
        // 
        var light1 = new THREE.DirectionalLight(0xeedddd, 1.0, 2000);
        light1.name = 'light1';
        light1.position.set(-30, 20, 10);
        lights.add(light1);
        //
        var light2 = new THREE.DirectionalLight(0xddddee, 1.0, 2000);
        light2.name = 'light2';
        light2.position.set(30, 20, -10);
        lights.add(light2);
        //
        scene.add(lights);
        return lights;
    }

    function addFloor(scene) {
        /*
        var radius = 200;
        var radials = 16;
        var circles = 8;
        var divisions = 64;
        var floor = new THREE.PolarGridHelper(radius, radials, circles, divisions);
        */
        // var floor = new THREE.GridHelper(500, 500, 0x888888, 0xAAAAAA);
        // floor.rotateOnAxis( new THREE.Vector3( 1, 0, 0 ), 90 * ( Math.PI/180 ));	
        var floor = new THREE.Mesh(new THREE.PlaneBufferGeometry(500, 500), library.materials.floor);
        floor.name = 'floor';
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -3.5;
        floor.visible = true;
        scene.add(floor);
        return floor;
    }

    function onAdd() {
        if (!combiner.busy()) {
            forge.load(function (geometry, materials) {
                if (effects) effects.unselect();
                var item = combiner.add(geometry, materials);
                orbiter.fit(combiner);
                combiner.entering++;
                item.enter(function () {
                    combiner.entering--;
                });
            });
        }
    }

    function onRemove() {
        if (!combiner.busy()) {
            combiner.remove();
            orbiter.fit(combiner);
        }
    }

    function onFlip() {
        combiner.flip(function () {
            orbiter.fit(combiner);
        });
    }

    function onResize() {
        w = container.offsetWidth;
        h = container.offsetHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        orbiter.fit(combiner);
        renderer.setSize(w, h);
        if (effects) effects.resize(w, h);
    }

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
            if (effects) effects.select(down.item.model);
        } else {
            if (effects) effects.unselect();
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
                    // var index = down.index;
                    // down.item.outer.rotation.x = down.rotation.x + diff.y * Math.PI;
                    combiner.rotate(diff.y * pow * 10);
                } else {
                    // DRAG CAMERA
                    orbiter.dragAngle = down.startDragAngle + diff.x * pow * 10;
                    orbiter.distance = down.startDistance + diff.y * pow * -10;
                    /*
                    // SOUND
                    if (combiner.selectedItem && combiner.selectedItem.type == APP.Parts.typeEnum.Sound) {
                        if (Math.abs(move.x - down.mx) > w / 3) {
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

    setTimeout(onAdd, 1000);

}());
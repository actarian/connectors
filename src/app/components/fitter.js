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
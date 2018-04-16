/* global window, document, console, TweenLite */

(function () {
    'use strict';

    var DEBUG = false;
    var RAD = Math.PI / 180;
    var I = 0;

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
            orbiter.distance = 22;
            orbiter.rotationAngle = 1;
            orbiter.dragAngle = 0;
            orbiter.zoom = 1; // eliminabili ??
            orbiter.pow = 0; // eliminabili ??

            orbiter.values = {
                target: new THREE.Vector3(0, 0, 0),
                distance: 22,
                rotationAngle: 0,
                dragAngle: 0,
                zoom: 0,
                pow: 0,
            };

            orbiter.distanceMin = 10;
            orbiter.distanceMax = 34;
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
            orbiter.set(dummy, center);
            /*
            dummy.position.copy(camera.position);
            dummy.quaternion.copy(camera.quaternion);
            dummy.up = up;
            dummy.lookAt(center);
            */
            dummy.updateProjectionMatrix();
            var min = orbiter.toScreen(box.min);
            var max = orbiter.toScreen(box.max);
            var sc = orbiter.toScreen(center);
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
            orbiter.distance = dummy.position.distanceTo(center);
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
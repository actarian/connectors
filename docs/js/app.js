/* global window, document, console, TweenLite */

(function () {
    'use strict';

    if (!Detector.webgl) {
        Detector.addGetWebGLMessage();
        return;
    }

    var RAD = Math.PI / 180;

    var flipping = 0;
    var connectors = [];
    var hittables = [];

    var loader = forge();
    var editor = document.querySelector('.editor');
    var btnAdd = document.querySelector('.btn-add');
    var btnRemove = document.querySelector('.btn-remove');

    var renderer = new THREE.WebGLRenderer({
        alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    editor.appendChild(renderer.domElement);

    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 50000);
    camera.position.set(0, 20, 40);
    camera.lookAt(0, 0, 0);
    // controls.update() must be called after any manual changes to the camera's transform
    var controls = new THREE.OrbitControls(camera);
    // controls.update();

    var scene = new THREE.Scene();
    var floor = addFloor();
    var group = new THREE.Group();

    var light = new THREE.PointLight(0xddddee, 1, 2000);
    light.position.set(0, 200, 0);
    scene.add(light);

    var helper = new THREE.PointLightHelper(light, 10);
    scene.add(helper);

    scene.add(floor);
    scene.add(group);

    loader.load(addElement);
    loader.load(addElement);
    loader.load(addElement);

    animate();

    function animate() {
        requestAnimationFrame(animate);
        // required if controls.enableDamping or controls.autoRotate are set to true
        // controls.update();
        renderer.render(scene, camera);
        combine();
        if (flipping === 0) {
            fitGroup(group);
        }
    }

    function addFloor() {
        /*
        var radius = 200;
        var radials = 16;
        var circles = 8;
        var divisions = 64;
        var floor = new THREE.PolarGridHelper(radius, radials, circles, divisions);
        */
        var floor = new THREE.GridHelper(30, 30, 0x888888, 0xAAAAAA);
        // floor.rotateOnAxis( new THREE.Vector3( 1, 0, 0 ), 90 * ( Math.PI/180 ));	
        return floor;
    }

    function addElement(geometry, materials) {
        var i = connectors.length;
        var o = new THREE.Group();
        var inner = new THREE.Group();
        geometry = new THREE.BoxGeometry(10, 4, 4);
        // var geometry = new THREE.CylinderGeometry(5, 5, 10, 10);
        var material = new THREE.MeshStandardMaterial({
            color: 0x888888,
            wireframe: false,
        });
        var model = new THREE.Mesh(geometry, material);
        var box = new THREE.Box3().setFromObject(model);
        var size = new THREE.Vector3();
        box.getSize(size);
        console.log(size.x);
        model.position.set(size.x / 2, 0, 0);
        var left = addHelper(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -rad(180)),
            0x00ff00,
            size
        );
        var right = addHelper(
            new THREE.Vector3(size.x, 0, 0),
            new THREE.Vector3(0, 0, -rad(10) + rad(20) * Math.random()),
            0xff0000,
            size
        );
        inner.position.x = size.x / 2;
        inner.add(model);
        inner.add(left);
        inner.add(right);
        o.inner = inner;
        o.model = model;
        o.left = left;
        o.right = right;
        o.add(inner);
        o.flip = function () {
            flipping++;
            console.log('flip()');
            o.flipped = !o.flipped;
            TweenLite.to(model.rotation, 0.3, {
                y: o.flipped ? Math.PI : 0,
                ease: Power2.easeOut,
                // ease: Elastic.easeOut,
                // onUpdate: function() { },
                onComplete: function () {
                    console.log('flipped');
                    flipping--;
                },
            })
        };
        connectors.push(o);
        hittables = connectors.map(function (item) {
            return item.model;
        });
        group.add(o);
        fitCamera(group);
        return o;
    }

    function removeElement() {
        if (connectors.length > 1) {
            var o = connectors.pop();
            if (o.parent) {
                group.remove(o);
            }
            hittables = connectors.map(function (item) {
                return item.model;
            });
            fitCamera(group);
        }
    }

    function addHelper(origin, rotation, color, size) {
        var s = size.x / 10;
        // rotation.normalize();
        var helper = new THREE.Group();
        helper.position.copy(origin);
        var arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), s, color, s / 2, s / 2);
        helper.rotation.x = rotation.x;
        helper.rotation.y = rotation.y;
        helper.rotation.z = rotation.z;
        var q = new THREE.Quaternion();
        q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rad(180));
        helper.q = new THREE.Quaternion().multiplyQuaternions(q, helper.quaternion);
        helper.arrow = arrow;
        helper.add(arrow);
        return helper;
    }

    function combine() {
        var q = new THREE.Quaternion();
        var p = new THREE.Vector3();
        var g = new THREE.Vector3();
        if (connectors.length) {
            group.getWorldPosition(g);
            connectors.filter(function (o, i) {
                o.inner.position.x += (1 - o.inner.position.x) / 5;
                if (i > 0) {
                    var qq = new THREE.Quaternion().multiplyQuaternions(q, o.left.q);
                    o.position.copy(p.sub(g));
                    o.setRotationFromQuaternion(qq);
                }
                /*
                    if (i === 1) {
                        o.model.rotation.y += 0.01;
                    }
                    */
                o.right.getWorldQuaternion(q);
                o.right.getWorldPosition(p);
            });
        }
    }

    var _box;

    function getBox() {
        if (_box) {
            return _box;
        } else {
            _box = new THREE.Box3();
            var boxhelper = new THREE.Box3Helper(_box, 0xff0000);
            scene.add(boxhelper);
            return _box;
        }
    }

    var _center;

    function setCenter(center) {
        if (!_center) {
            var geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            var material = new THREE.MeshBasicMaterial({
                color: 0xff0000
            });
            _center = new THREE.Mesh(geometry, material);
            scene.add(_center);
        }
        _center.position.copy(center);
    }

    function fitGroup(group) {
        var box = getBox();
        box.setFromObject(group);
        var center = new THREE.Vector3();
        var size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        setCenter(center);
        group.worldToLocal(center);
        group.position.x = -center.x;
        group.position.y = -center.y;
        group.position.z = -center.z;
        floor.position.y = -size.y / 2;
    }

    function fitCamera(group) {
        var box = getBox();
        box.setFromObject(group);
        var size = new THREE.Vector3()
        box.getSize(size);
        var max = Math.max(size.x, size.y, size.z);
        var fov = camera.fov * RAD;
        var z = max / 2 / Math.tan(fov / 2) * 1.5;
        camera.position.normalize().multiplyScalar(z);
        controls.update();
    }

    var raycaster = new THREE.Raycaster();
    var down;

    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function getTouch(e) {
        return new THREE.Vector2(
            (e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1
        );
    }

    function onDown(e) {
        // calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        down = getTouch(e);
        // down.x = (e.clientX / renderer.domElement.offsetWidth) * 2 - 1;
        // down.y = -(e.clientY / renderer.domElement.offsetHeight) * 2 + 1;
        raycaster.setFromCamera(down, camera);
        var hitted = raycaster.intersectObjects(hittables);
        // console.log(hitted.length, down.x, down.y);
        if (hitted.length) {
            controls.enabled = false;
            var index = hittables.indexOf(hitted[0].object);
            down.index = index;
            down.rotation = connectors[index].inner.rotation.clone();
            // connectors[index].inner.position.x = 10;
        } else {
            down = null;
        }
    }

    function onMove(e) {
        if (down) {
            var move = getTouch(e);
            var diff = move.sub(down);
            var index = down.index;
            var rotation = connectors[index].inner.rotation;
            rotation.x = down.rotation.x + diff.y * Math.PI;
            // console.log('rotation.x', rotation.x);
        }
    }

    function onUp(e) {
        down = null;
        controls.enabled = true;
    }

    function onDoubleClick(e) {
        var touch = getTouch(e);
        raycaster.setFromCamera(touch, camera);
        var hitted = raycaster.intersectObjects(hittables);
        if (hitted.length) {
            var index = hittables.indexOf(hitted[0].object);
            connectors[index].flip();
        }
    }

    function onAdd() {
        loader.load(addElement);
    }

    function onRemove() {
        removeElement();
    }

    renderer.domElement.addEventListener('mousedown', onDown);
    renderer.domElement.addEventListener('mousemove', onMove);
    renderer.domElement.addEventListener('dblclick', onDoubleClick);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('resize', onResize, false);
    btnAdd.addEventListener('click', onAdd);
    btnRemove.addEventListener('click', onRemove);

    function rad(degree) {
        return degree * RAD;
    }

    function forge() {
        var loader = new THREE.JSONLoader();
        return {
            load: function (callback) {
                http({
                    url: 'img/Body 1.js',
                    onload: function (data) {
                        data = data.replace(new RegExp('transparency', 'g'), 'opacity');
                        var model = loader.parse(JSON.parse(data));
                        callback(model.geometry, model.materials);
                    }
                });
            }
        };
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

}());
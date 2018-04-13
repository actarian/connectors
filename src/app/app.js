/* global window, document, console, TweenLite, Forge, Combiner */

(function () {
    'use strict';

    if (!Detector.webgl) {
        Detector.addGetWebGLMessage();
        return;
    }

    var forge = new Forge();

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

    var light = new THREE.PointLight(0xddddee, 1, 2000);
    light.position.set(0, 200, 0);
    scene.add(light);
    var helper = new THREE.PointLightHelper(light, 10);
    scene.add(helper);

    var floor = addFloor();
    scene.add(floor);

    var combiner = new Combiner(scene, camera, controls);
    scene.add(combiner.group);

    forge.load(function (geometry, materials) {
        combiner.add(geometry, materials);
    });
    forge.load(function (geometry, materials) {
        combiner.add(geometry, materials);
    });
    forge.load(function (geometry, materials) {
        combiner.add(geometry, materials);
    });

    animate();

    function animate() {
        requestAnimationFrame(animate);
        // required if controls.enableDamping or controls.autoRotate are set to true
        // controls.update();
        renderer.render(scene, camera);
        combiner.combine();
        if (combiner.flipping === 0) {
            combiner.fit();
            floor.position.y = -combiner.size.y / 2;
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
        down = getTouch(e);
        raycaster.setFromCamera(down, camera);
        var selection = combiner.select(raycaster);
        if (selection) {
            controls.enabled = false;
            down.index = selection.index;
            down.item = selection.item;
            down.rotation = selection.rotation;
        } else {
            down = null;
        }
    }

    function onMove(e) {
        if (down) {
            var move = getTouch(e);
            var diff = move.sub(down);
            var index = down.index;
            var rotation = down.item.inner.rotation;
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
        combiner.flip(raycaster);
    }

    function onAdd() {
        forge.load(function (geometry, materials) {
            combiner.add(geometry, materials);
        });
    }

    function onRemove() {
        combiner.remove();
    }

    renderer.domElement.addEventListener('mousedown', onDown);
    renderer.domElement.addEventListener('mousemove', onMove);
    renderer.domElement.addEventListener('dblclick', onDoubleClick);

    window.addEventListener('mouseup', onUp);
    window.addEventListener('resize', onResize, false);

    btnAdd.addEventListener('click', onAdd);
    btnRemove.addEventListener('click', onRemove);

}());
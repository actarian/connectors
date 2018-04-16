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
                if (down.item && combiner.selectedItem === down.item) {
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
            // orbiter.distance = Math.min(orbiter.distanceMax, Math.max(orbiter.distanceMin, orbiter.distance));
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
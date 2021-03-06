/* global angular, window, document, console, TweenLite, Forge, Combiner, Orbiter, Library */

(function () {
    "use strict";

    var app = angular.module('app');

    app.directive('builder', ['Polyfills', 'Prototypes', 'ThreeUtils', function (Polyfills, Prototypes, ThreeUtils) {
        return {
            restrict: 'A',
            link: function (scope, element, attributes) {
                console.log('app.builder');
                var container = element[0]; // document.querySelector('.editor');

                if (!Detector.webgl) {
                    Detector.addGetWebGLMessage();
                    return;
                }

                var w = container.offsetWidth,
                    h = container.offsetHeight;

                var options = {
                    down: false,
                    moved: 0,
                };

                var raycaster = new THREE.Raycaster();

                var forge = new Forge();

                var renderer = addRenderer();

                var library = new Library(renderer);

                var camera = new THREE.PerspectiveCamera(45, w / h, 1, 50000);

                var scene = new THREE.Scene();

                var lights = addLights(scene);

                var floor = addFloor(scene);

                var combiner = new Combiner(scene);

                var orbiter = new Orbiter(scene, camera);

                var effects = new Effects(scene, camera, renderer, w, h);

                function render() {
                    combiner.update();
                    //
                    var y = combiner.center.y - combiner.size.y / 2 - 3;
                    floor.position.y += (y - floor.position.y) / 8;
                    // floor.position.x = combiner.center.x;
                    // floor.position.z = combiner.center.z;
                    lights.position.x += (combiner.center.x - lights.position.x) / 8;
                    lights.position.y += (combiner.center.y - lights.position.y) / 8;
                    lights.position.z += (combiner.center.z - lights.position.z) / 8;
                    //
                    orbiter.update();
                    effects.update();
                    // renderer.render(scene, camera);
                }

                function snapshot() {
                    if (options.snapshot === true) {
                        options.snapshot = false;
                        /*
                        Snapshot.post(scope.saber.code, renderer.domElement.toDataURL('image/jpeg', 0.95)).then(function (share) {
                            scope.$root.$broadcast('onSocialPictureReady', share);
                        });
                        */
                    }
                }

                function animate() {
                    render();
                    snapshot();
                    options.requestId = window.requestAnimationFrame(animate, renderer.domElement);
                }

                function play() {
                    if (!options.requestId) {
                        animate();
                    }
                }

                function pause() {
                    if (options.requestId) {
                        window.cancelAnimationFrame(options.requestId);
                        options.requestId = false;
                    }
                }

                function addRenderer() {
                    var renderer = new THREE.WebGLRenderer({
                        alpha: true,
                        antialias: true,
                    });
                    renderer.setClearColor(0x101010);
                    renderer.setPixelRatio(window.devicePixelRatio);
                    renderer.setSize(w, h);
                    container.appendChild(renderer.domElement);
                    return renderer;
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
                    /*
                    var light = new THREE.PointLight(0xddddee, 1, 2000);
                    light.position.set(0, 200, 0);
                    scene.add(light);
                    */
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
                            materials = library.updateMaterials(materials, null, null); // finish, secondaryFinish
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

                function onFinish() {
                    combiner.selectedModel(function (model) {
                        model.material = library.setFinish(model.material, null);
                    });
                }

                function onFloor() {
                    library.setNextFloor();
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

                function onDown(e) {
                    var down = getTouch(e);
                    down.relativeTo(container);
                    down.mx = down.x;
                    down.startDragAngle = orbiter.dragAngle;
                    down.startDistance = orbiter.distance;
                    // console.log('down', down);
                    raycaster.setFromCamera(down, camera);
                    var selection = combiner.select(raycaster);
                    // console.log('selection', selection);
                    if (selection) {
                        /*
                        if (controls) {
                            controls.enabled = false;
                        }
                        */
                        down.index = selection.index;
                        down.item = selection.item;
                        down.rotation = selection.rotation;
                        if (effects) effects.select(down.item.model);
                    } else {
                        if (effects) effects.unselect();
                    }
                    orbiter.fit(combiner);
                    options.down = down;
                    /*
                    down.index = i;
                    down.item = value;
                    down.angle = value.coords.angle;
                    */
                }

                function onMove(e) {
                    options.moved++;
                    var pow = 1; // 0.001;
                    if (e.type === 'touchmove') {
                        e.stopPropagation();
                        e.preventDefault();
                        pow *= 4;
                    }
                    var down = options.down;
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
                    var down = options.down;
                    var moved = options.moved;
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
                    options.down = null;
                    options.moved = 0;
                    /*
                    if (controls) {
                        controls.enabled = true;
                    }
                    */
                    removeDragListeners();
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
                    // console.log('onDoubleClick');
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

                function removeDragListeners() {
                    window.removeEventListener('touchmove mousemove', onMove);
                    window.removeEventListener('touchend mouseup', onUp);
                }

                function onKeyUp(e) {
                    // console.log(e);
                    var selection;
                    switch (e.keyCode) {
                        case 38:
                            // up arrow
                            break;
                        case 40:
                            // down arrow
                            break;
                        case 37:
                            // left arrow
                            selection = combiner.prev();
                            if (selection) {
                                if (effects) effects.select(selection.item.model);
                            } else {
                                if (effects) effects.unselect();
                            }
                            orbiter.fit(combiner);
                            break;
                        case 39:
                            // right arrow
                            selection = combiner.next();
                            if (selection) {
                                if (effects) effects.select(selection.item.model);
                            } else {
                                if (effects) effects.unselect();
                            }
                            orbiter.fit(combiner);
                            break;
                    }
                }

                var btnAdd = document.querySelector('.btn-add');
                var btnRemove = document.querySelector('.btn-remove');
                var btnFlip = document.querySelector('.btn-flip');
                var btnFinish = document.querySelector('.btn-finish');
                var btnFloor = document.querySelector('.btn-floor');

                function addListeners() {
                    // container.addEventListener('dblclick', onDoubleClick);
                    container.addEventListener('mousedown', onMouseDown);
                    container.addEventListener('touchstart', onTouchDown);
                    container.addEventListener('mousewheel', onWheel);
                    document.addEventListener('keyup', onKeyUp);
                    window.addEventListener('resize', onResize, false);
                    btnAdd.addEventListener('click', onAdd);
                    btnRemove.addEventListener('click', onRemove);
                    btnFlip.addEventListener('click', onFlip);
                    btnFinish.addEventListener('click', onFinish);
                    btnFloor.addEventListener('click', onFloor);
                }

                function removeListeners() {
                    // container.removeEventListener('dblclick', onDoubleClick);
                    container.removeEventListener('mousedown', onMouseDown);
                    container.removeEventListener('touchstart', onTouchDown);
                    container.removeEventListener('mousewheel', onWheel);
                    document.removeEventListener('keyup', onKeyUp);
                    window.removeEventListener('resize', onResize);
                    btnAdd.removeEventListener('click', onAdd);
                    btnRemove.removeEventListener('click', onRemove);
                    btnFlip.removeEventListener('click', onFlip);
                    btnFinish.removeEventListener('click', onFinish);
                    btnFloor.removeEventListener('click', onFloor);
                }

                animate();
                addListeners();

                setTimeout(onAdd, 1000);

                /*
                scope.$on('onSelectPrev', function ($scope) {
                });    
                scope.$on('onSelectNext', function ($scope) {
                });
                scope.$on('onUpdateLed', function (scope, receivers, led) {
                });
                scope.$on('onFinishChange', function ($scope, part, id) {
                });
                scope.$on('onSecondaryFinishChange', function ($scope, part, id) {
                });
                scope.$on('onItemChange', function ($scope, part, id) {
                });
                scope.$on('onAddPart', function ($scope, part, id, counter) {
                });
                scope.$on('onPlayPause', function ($scope, pause) {
                });
                scope.$on('onRemovePart', function ($scope, part) {
                });
                scope.$on('onFlipPart', function ($scope, part) {
                });
                scope.$on('onSwapBackground', function ($scope) {
                });
                scope.$on('onRotationToggle', function ($scope) {
                });
                scope.$on('onSocialPictureGenerationRequest', function ($scope) {
                    options.snapshot = true;
                });
                scope.$on('$destroy', function () {
                    removeListeners();
                });
                */
            }
        };
    }]);

}());
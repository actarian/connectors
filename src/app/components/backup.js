app.directive('saber', ['$window', '$document', '$rootScope', '$timeout', '$interval', 'APP', 'Forge', 'Snapshot', function ($window, $document, $rootScope, $timeout, $interval, APP, Forge, Snapshot) {
    return {
        restrict: 'A',
        replace: true,
        scope: {
            saber: '=saber',
            zoom: '=zoom',
            controls: '=controls',
            loader: '=loader',
        },
        link: function (scope, element, attributes, model) {

            // VARIABLES
            var maxAnisotropy = 1;
            var selectedIndex = null;
            var cameraVector = new THREE.Vector3(0, 0, 0);
            var cameraTarget = new THREE.Vector3(0, 0, 0);
            var cameraPosition = new THREE.Vector3(0, 0, 0);
            var cameraRadiusMultiplier = 1;
            var cameraAngle = 1;
            var cameraDragAngle = 0;
            var cameraPow = 0;
            var transform = function () {};

            // OBJECTS
            var jsonLoader = new THREE.JSONLoader(),
                manager, renderer, camera, scene, controls, textures = {},
                materials = {},
                objects = {};

            function addManager() {
                manager = new THREE.LoadingManager();
                manager.onProgress = function (item, loaded, total) {
                    // console.log('manager', item, loaded, total);                    
                };
            }

            function addRenderer() {
                renderer = Detector.webgl ? new THREE.WebGLRenderer({
                    antialias: true
                }) : new THREE.CanvasRenderer();
                // renderer = new THREE.WebGLRenderer({ antialias: true });
                renderer.setClearColor(0x101010);
                renderer.setPixelRatio(window.devicePixelRatio);
                renderer.setSize(element[0].offsetWidth, element[0].offsetHeight);
                maxAnisotropy = renderer.getMaxAnisotropy();
            }

            function addCamera() {
                camera = new THREE.PerspectiveCamera(45, element[0].offsetWidth / element[0].offsetHeight, 2, 1000);

                cameraVector.x = cameraTarget.x;
                cameraVector.y = cameraTarget.y;
                cameraVector.z = cameraTarget.z;

                cameraPosition.x = cameraVector.x + scope.zoom.cameraRadius * cameraRadiusMultiplier * Math.cos(cameraDragAngle + cameraAngle);
                cameraPosition.y = cameraVector.y + scope.zoom.cameraRadius * cameraRadiusMultiplier * 2;
                cameraPosition.z = cameraVector.z + scope.zoom.cameraRadius * cameraRadiusMultiplier * Math.sin(cameraDragAngle + cameraAngle);

                camera.position.x = cameraPosition.x;
                camera.position.y = cameraPosition.y;
                camera.position.z = cameraPosition.z;
                // camera.up = new THREE.Vector3(0, 0, -1);

                camera.lookAt(cameraVector);

                /*
                camera.position.set(5, 10, 5);
                camera.up = new THREE.Vector3(0, 0, -1);
                camera.lookAt(new THREE.Vector3(0, 0, 0));
                */
            }

            function addScene() {
                scene = new THREE.Scene();
                // scene.fog = new THREE.Fog(0x000000, 1, 1000); // ?? FOG
            }

            function addControls() {
                controls = new THREE.OrbitControls(camera);
                controls.damping = 0.2;
                controls.addEventListener('change', render);
            }

            var imageLoader;

            function addTextures() {
                var r = "/Content/Textures/env/";
                var urls = [r + "px.jpg", r + "nx.jpg", r + "py.jpg", r + "ny.jpg", r + "pz.jpg", r + "nz.jpg"];
                textures.env = THREE.ImageUtils.loadTextureCube(urls);
                textures.env.anisotropy = maxAnisotropy;
                textures.env.format = THREE.RGBFormat;

                textures.floor = new THREE.Texture();
                imageLoader = new THREE.ImageLoader(manager);
                scope.loader.add('texture-floor');
                imageLoader.load('/Content/Textures/floor.jpg', function (image) {
                    textures.floor.image = image;
                    textures.floor.needsUpdate = true;
                    scope.loader.remove('texture-floor');
                });
                // textures.floor = THREE.ImageUtils.loadTexture("/Content/Textures/floor.jpg");
                textures.floor.wrapS = THREE.RepeatWrapping;
                textures.floor.wrapT = THREE.RepeatWrapping;
                textures.floor.repeat.set(40, 40);
                textures.floor.anisotropy = maxAnisotropy;

                textures.silver = new THREE.Texture();
                imageLoader = new THREE.ImageLoader(manager);
                scope.loader.add('texture-silver');
                imageLoader.load('/Content/Textures/brushed-light.jpg', function (image) {
                    textures.silver.image = image;
                    textures.silver.needsUpdate = true;
                    scope.loader.remove('texture-silver');
                });
                textures.silver.anisotropy = maxAnisotropy;
                // textures.silver.wrapS = THREE.RepeatWrapping;
                textures.silver.wrapT = THREE.RepeatWrapping;
                // textures.silver.repeat.set(1, 1);

                textures.weathered = new THREE.Texture();
                imageLoader = new THREE.ImageLoader(manager);
                scope.loader.add('texture-weathered');
                imageLoader.load('/Content/Textures/brushed-dark.jpg', function (image) {
                    textures.weathered.image = image;
                    textures.weathered.needsUpdate = true;
                    scope.loader.remove('texture-weathered');
                });
                textures.weathered.anisotropy = maxAnisotropy;
                // textures.weathered.wrapS = THREE.RepeatWrapping;
                textures.weathered.wrapT = THREE.RepeatWrapping;
                // textures.weathered.repeat.set(1, 1);

                textures.glare = new THREE.Texture();
                imageLoader = new THREE.ImageLoader(manager);
                scope.loader.add('texture-glare');
                imageLoader.load('/Content/Textures/glare.jpg', function (image) {
                    textures.glare.image = image;
                    textures.glare.needsUpdate = true;
                    scope.loader.remove('texture-glare');
                });
                textures.glare.anisotropy = maxAnisotropy;

                textures.emitterGlare = new THREE.Texture();
                imageLoader = new THREE.ImageLoader(manager);
                scope.loader.add('texture-emitter-glare');
                imageLoader.load('/Content/Textures/emitter-glare.jpg', function (image) {
                    textures.emitterGlare.image = image;
                    textures.emitterGlare.needsUpdate = true;
                    scope.loader.remove('texture-emitter-glare');
                });
                textures.emitterGlare.anisotropy = maxAnisotropy;

                // LEATHER
                textures.leatherBump = new THREE.Texture();
                imageLoader = new THREE.ImageLoader(manager);
                scope.loader.add('texture-leather-bump');
                imageLoader.load('/Content/Textures/leather-bump.jpg', function (image) {
                    textures.leatherBump.image = image;
                    textures.leatherBump.needsUpdate = true;
                    scope.loader.remove('texture-leather-bump');
                });
                textures.leatherBump.anisotropy = maxAnisotropy;
                textures.leatherBump.wrapS = THREE.RepeatWrapping;
                textures.leatherBump.wrapT = THREE.RepeatWrapping;
                // textures.leatherBump.repeat.set(1, 1);

                textures.leatherLight = new THREE.Texture();
                imageLoader = new THREE.ImageLoader(manager);
                scope.loader.add('texture-leather-light');
                imageLoader.load('/Content/Textures/leather-light.jpg', function (image) {
                    textures.leatherLight.image = image;
                    textures.leatherLight.needsUpdate = true;
                    scope.loader.remove('texture-leather-light');
                });
                textures.leatherLight.anisotropy = maxAnisotropy;
                textures.leatherLight.wrapS = THREE.RepeatWrapping;
                textures.leatherLight.wrapT = THREE.RepeatWrapping;
                // textures.leatherLight.repeat.set(1, 1);

                // REPTILE
                textures.reptileBump = new THREE.Texture();
                imageLoader = new THREE.ImageLoader(manager);
                scope.loader.add('texture-reptile-bump');
                imageLoader.load('/Content/Textures/reptile-bump.jpg', function (image) {
                    textures.reptileBump.image = image;
                    textures.reptileBump.needsUpdate = true;
                    scope.loader.remove('texture-reptile-bump');
                });
                textures.reptileBump.anisotropy = maxAnisotropy;
                textures.reptileBump.wrapS = THREE.RepeatWrapping;
                textures.reptileBump.wrapT = THREE.RepeatWrapping;
                // textures.reptileBump.repeat.set(1, 1);

                textures.reptileLight = new THREE.Texture();
                imageLoader = new THREE.ImageLoader(manager);
                scope.loader.add('texture-reptile-light');
                imageLoader.load('/Content/Textures/reptile-light.jpg', function (image) {
                    textures.reptileLight.image = image;
                    textures.reptileLight.needsUpdate = true;
                    scope.loader.remove('texture-reptile-light');
                });
                textures.reptileLight.anisotropy = maxAnisotropy;
                textures.reptileLight.wrapS = THREE.RepeatWrapping;
                textures.reptileLight.wrapT = THREE.RepeatWrapping;
                // textures.reptileLight.repeat.set(1, 1);

                // STINGRAY
                textures.stingrayBump = new THREE.Texture();
                imageLoader = new THREE.ImageLoader(manager);
                scope.loader.add('texture-stingray-bump');
                imageLoader.load('/Content/Textures/stingray-bump.jpg', function (image) {
                    textures.stingrayBump.image = image;
                    textures.stingrayBump.needsUpdate = true;
                    scope.loader.remove('texture-stingray-bump');
                });
                textures.stingrayBump.anisotropy = maxAnisotropy;
                textures.stingrayBump.wrapS = THREE.RepeatWrapping;
                textures.stingrayBump.wrapT = THREE.RepeatWrapping;
                // textures.stingrayBump.repeat.set(1, 1);

                textures.stingrayLight = new THREE.Texture();
                imageLoader = new THREE.ImageLoader(manager);
                scope.loader.add('texture-stingray-light');
                imageLoader.load('/Content/Textures/stingray-light.jpg', function (image) {
                    textures.stingrayLight.image = image;
                    textures.stingrayLight.needsUpdate = true;
                    scope.loader.remove('texture-stingray-light');
                });
                textures.stingrayLight.anisotropy = maxAnisotropy;
                textures.stingrayLight.wrapS = THREE.RepeatWrapping;
                textures.stingrayLight.wrapT = THREE.RepeatWrapping;
                // textures.stingrayLight.repeat.set(1, 1);

            }

            function addMaterials() {
                // new THREE.MeshLambertMaterial({ map: textures.floor });
                materials = {
                    floor: new THREE.MeshPhongMaterial({
                        bumpMap: textures.floor,
                        bumpScale: 0.05,
                        color: 0x101010,
                        specular: 0x101010,
                        reflectivity: 0.15,
                        shininess: 12,
                        metal: true,
                        /*
                        color: 0x202020,
                        specular: 0x202020,
                        bumpMap: textures.floor,
                        bumpScale: 0.045,
                        reflectivity: 0.15,
                        shininess: 14,
                        metal: true,
                        */
                    }),
                    wrap: new THREE.MeshPhongMaterial({
                        name: 'wrap',
                        color: 0x101010,
                        specular: 0x444444,
                        shininess: 7, // 15
                        reflectivity: 0.75, // 0.25
                        specularMap: textures.leatherLight,
                        bumpMap: textures.leatherBump,
                        bumpScale: 0.15,
                        combine: THREE.MixOperation,
                        metal: true,
                    }),
                    bronze: new THREE.MeshPhongMaterial({
                        name: 'bronze',
                        color: 0xc07f5d,
                        specular: 0x555555,
                        specularMap: textures.silver,
                        shininess: 10, // 15
                        reflectivity: 0.20, // 0.25
                        envMap: textures.env,
                        combine: THREE.MixOperation,
                        bumpMap: textures.silver,
                        bumpScale: 0.001,
                        metal: true,
                    }),
                    gold: new THREE.MeshPhongMaterial({
                        name: 'gold',
                        color: 0xc8ad60,
                        specular: 0x555555,
                        specularMap: textures.silver,
                        shininess: 10, // 15
                        reflectivity: 0.20, // 0.25
                        envMap: textures.env,
                        combine: THREE.MixOperation,
                        bumpMap: textures.silver,
                        bumpScale: 0.001,
                        metal: true,
                    }),
                    green: new THREE.MeshPhongMaterial({
                        name: 'green',
                        color: 0x00aa00,
                        specular: 0x333333,
                        specularMap: textures.silver,
                        shininess: 30, // 15
                        reflectivity: 0.10, // 0.25
                        envMap: textures.env,
                        combine: THREE.MixOperation,
                        bumpMap: textures.silver,
                        bumpScale: 0.003,
                        metal: true,
                    }),
                    red: new THREE.MeshPhongMaterial({
                        name: 'red',
                        color: 0xdd0000,
                        specular: 0x333333,
                        specularMap: textures.silver,
                        shininess: 30, // 15
                        reflectivity: 0.10, // 0.25
                        envMap: textures.env,
                        combine: THREE.MixOperation,
                        bumpMap: textures.silver,
                        bumpScale: 0.003,
                        metal: true,
                    }),
                    standard: {
                        silver: new THREE.MeshPhongMaterial({
                            name: 'chrome',
                            color: 0x888888,
                            specular: 0x555555,
                            specularMap: textures.silver,
                            shininess: 30, // 15
                            reflectivity: 0.15, // 0.25
                            envMap: textures.env,
                            combine: THREE.MixOperation,
                            bumpMap: textures.silver,
                            bumpScale: 0.003,
                            metal: true,
                        }),
                        black: new THREE.MeshLambertMaterial({
                            name: 'black',
                            color: 0x0d0d0d,
                            reflectivity: 0.3,
                            envMap: textures.env,
                            combine: THREE.MultiplyOperation
                        }),
                    },
                    weathered: {
                        silver: new THREE.MeshPhongMaterial({
                            name: 'chrome',
                            color: 0x222222,
                            specular: 0x555555,
                            specularMap: textures.weathered,
                            shininess: 30, // 15
                            reflectivity: 0.15, // 0.25
                            envMap: textures.env,
                            combine: THREE.MixOperation,
                            bumpMap: textures.silver,
                            bumpScale: 0.003,
                            metal: true,
                        }),
                        black: new THREE.MeshLambertMaterial({
                            name: 'black',
                            color: 0x070707,
                            specular: 0x0a0a0a,
                            reflectivity: 0.05,
                            envMap: textures.env,
                            combine: THREE.MultiplyOperation
                        }),
                    },
                    silver: {
                        silver: new THREE.MeshPhongMaterial({
                            name: 'chrome',
                            color: 0x888888,
                            specular: 0x555555,
                            specularMap: textures.silver,
                            shininess: 30, // 15
                            reflectivity: 0.15, // 0.25
                            envMap: textures.env,
                            combine: THREE.MixOperation,
                            bumpMap: textures.silver,
                            bumpScale: 0.003,
                            metal: true,
                        }),
                        black: new THREE.MeshPhongMaterial({
                            name: 'black',
                            color: 0x777777,
                            specular: 0x444444,
                            specularMap: textures.silver,
                            shininess: 30, // 15
                            reflectivity: 0.15, // 0.25
                            envMap: textures.env,
                            combine: THREE.MixOperation,
                            bumpMap: textures.silver,
                            bumpScale: 0.003,
                            metal: true,
                        }),
                    },
                    black: {
                        silver: new THREE.MeshPhongMaterial({
                            name: 'chrome',
                            color: 0x070707,
                            specular: 0x0a0a0a,
                            reflectivity: 0.05,
                            envMap: textures.env,
                            combine: THREE.MultiplyOperation
                        }),
                        black: new THREE.MeshLambertMaterial({
                            name: 'black',
                            color: 0x060606,
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
                    /*
                    emitter: {
                        off: new THREE.MeshPhongMaterial({
                            name: 'emitter',
                            opacity: 0,
                            transparent: true,
                            color: 0x000000,
                        }),
                        on6: new THREE.MeshPhongMaterial({
                            name: 'emitter',
                            opacity: 0.7,
                            transparent: true,
                            color: 0xecf4fb,
                            // blending: THREE.AdditiveBlending,
                            specular: 0x000000,
                            shininess: 0,
                            combine: THREE.MixOperation,
                            reflectivity: 0
                        }),
                        on12: new THREE.MeshPhongMaterial({
                            name: 'emitter',
                            opacity: 0.95,
                            transparent: true,
                            color: 0xecf4fb,
                            // blending: THREE.AdditiveBlending,
                            specular: 0x000000,
                            shininess: 0,
                            combine: THREE.MixOperation,
                            reflectivity: 0
                        }),
                    },
                    */
                };
            }

            function addObjects() {
                objects.floor = new THREE.Mesh(new THREE.PlaneBufferGeometry(400, 400), materials.floor);
                objects.floor.name = 'floor';
                // objects.floor.material.side = THREE.DoubleSide;
                objects.floor.rotation.x = -Math.PI / 2;
                objects.floor.position.y = -3.5;
                objects.floor.visible = true;
                // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


                objects.pivot = new THREE.Object3D();
                objects.pivot.name = 'pivot';
                objects.pivot.rotation.y = Math.PI / 180 * 90;

                objects.light1 = new THREE.DirectionalLight(0xeedddd, 3.2, 2000);
                objects.light1.name = 'light';
                objects.light1.position.set(-30, 20, 10);
                objects.pivot.add(objects.light1);

                objects.light2 = new THREE.DirectionalLight(0xddddee, 3.2, 2000);
                objects.light2.name = 'light';
                objects.light2.position.set(30, 20, -10);
                objects.pivot.add(objects.light2);

                /*
                objects.saberlight1 = new THREE.SpotLight(0xff0000, 50, 50);
                objects.saberlight1.position.set(25, 10, 0);                
                objects.saberlight1.target.position.set(30, -1.5, 5);
                scene.add(objects.saberlight1);
                */

                /*
                objects.saberlight2 = new THREE.DirectionalLight(0xff0000, 5, 2);
                objects.saberlight2.position.set(-30, 20, 0);
                objects.saberlight2.target.position.set(-31, 0, 0);
                scene.add(objects.saberlight2);
                */

                scene.add(objects.floor);
                scene.add(objects.pivot);

                objects.saber = new THREE.Object3D();
                objects.saber.name = 'saber';
                scene.add(objects.saber);

            }

            function getTransformX(newPart) {
                var previous = null,
                    x = 0;
                angular.forEach(scope.saber.parts, function (part, partKey) {
                    if (part.currentModel) {
                        if (previous) {
                            part.bounds.left = previous.bounds.left + previous.bounds.width / 2 - previous.insetRight - part.insetLeft + part.bounds.width / 2;
                            previous = part;
                        } else {
                            part.bounds.left = -scope.saber.width / 2 - part.insetLeft + part.bounds.width / 2;
                            previous = part;
                        }
                        if (part === newPart) {
                            x = part.currentModel.position.x = part.bounds.left;
                            part.wrongPivot.position.x = part.currentModel.position.x + part.bounds.width / 2 - part.insetRight;
                        }
                    }
                });
                return x;
            }

            function transformParts(norotation) {
                var previous = null;
                angular.forEach(scope.saber.parts, function (part, partKey) {
                    previous = part.transform(previous, scope.saber.width, norotation);
                    /*
                    if (part.currentModel) {
                        if (previous) {
                            part.bounds.left = previous.bounds.left + previous.bounds.width / 2 - (previous.bounds.width * previous.insetRight) - (part.bounds.width * part.insetLeft) + part.bounds.width / 2;
                            previous = part;
                        } else {
                            part.bounds.left = -scope.saber.width / 2 - (part.bounds.width * part.insetLeft) + part.bounds.width / 2;
                            previous = part;
                        }
                        part.currentModel.position.x += (part.bounds.left - part.currentModel.position.x) / 10;
                        part.currentModel.position.y += (part.coords.current - part.currentModel.position.y) / 10;
                        part.currentModel.rotation.y += ((part.flipped ? Math.PI : 0) - part.currentModel.rotation.y) / 6;

                        if (part.type === APP.Parts.typeEnum.Blade) {
                            part.currentModel.scale.x += (1 - part.currentModel.scale.x) / 8
                        } else {
                            part.currentModel.rotation.x += 0.005;
                        }
                        
                        part.wrongPivot.position.x = part.currentModel.position.x + part.bounds.width / 2 - part.bounds.width * part.insetRight;
                        part.wrongPivot.rotation.x += 0.02;                        
                    }
                    */
                    /*
                        part.saberLight.position.x = (part.bounds.left + part.bounds.width / 2) * scope.saber.scale; // + 120;
                        part.saberLight.position.y = part.currentModel.position.y * scope.saber.scale + 20; // + 200;
                        */
                    /*
                    if (part.key === 'emitter') {
                        part.saberLight.position.x = part.currentModel.position.x + part.bounds.width / 2; // + 120;
                        part.saberLight.position.y = part.currentModel.position.y + 200;
                    }
                    */
                });
            }

            addManager();
            addRenderer();
            addCamera();
            addScene();
            // addControls();
            addTextures();
            addMaterials();
            addObjects();

            element[0].appendChild(renderer.domElement);

            function replaceMaterial(array, name, material) {
                if (!array) {
                    return;
                }
                var found = -1,
                    i = 0,
                    t = array.length;
                while (i < t) {
                    // console.log(array[i].name, name);
                    if (array[i].name === name) {
                        found = i;
                    }
                    i++;
                }
                if (found !== -1) {
                    material.name = name;
                    array[found] = material;
                    // console.log('replaceMaterial', name, array[found]);
                }
            }

            function setMaterialMaps(array, name, mapName, finish) {
                if (!array) {
                    return;
                }
                var found = -1,
                    i = 0,
                    t = array.length;
                while (i < t) {
                    // console.log(array[i].name, name);
                    if (array[i].name === name) {
                        found = i;
                    }
                    i++;
                }
                if (found !== -1) {
                    var color = hexToRgb(finish.color);
                    // console.log(array[i].color, color);
                    var material = array[found];
                    material.color.r = color.r / 255;
                    material.color.g = color.g / 255;
                    material.color.b = color.b / 255;
                    material.specularMap = textures[mapName + 'Light'];
                    material.bumpMap = textures[mapName + 'Bump'];
                }
            }

            var prevTime, request, composer;

            // postprocessing

            /*
            composer = new THREE.EffectComposer(renderer);
            composer.addPass(new THREE.RenderPass(scene, camera));
            */

            /*
            var glitchPass = new THREE.GlitchPass();
            glitchPass.renderToScreen = true;
            composer.addPass(glitchPass);
            */

            /*
            var effect = new THREE.ShaderPass(THREE.DotScreenShader);
            effect.uniforms['scale'].value = 4;
            effect.renderToScreen = false;
            composer.addPass(effect);
            */

            /*
            var effect = new THREE.ShaderPass(THREE.RGBShiftShader);
            effect.uniforms['amount'].value = 0.0015;
            effect.renderToScreen = true;
            composer.addPass(effect);
            */

            /*

            THREE.TestShader = {
                uniforms: {
                    tDiffuse: { type: "t", value: null },
                    amount: { type: "f", value: 0.5 },
                },
                vertexShader: [
                "varying vec2 vUv;",
                "void main() {",
                    "vUv = uv;",
                    "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
                "}"].join("\n"),
                fragmentShader: [
                "uniform sampler2D tDiffuse;",
                "uniform float amount;",
                "varying vec2 vUv;",
                "void main() {",
                    "vec4 color = texture2D(tDiffuse, vUv);",
                    "gl_FragColor = color*amount;",
                "}"].join("\n"),
            };

            effectCopy = new THREE.ShaderPass(THREE.TestShader);
            effectCopy.renderToScreen = true;
            composer.addPass(effectCopy);
            */

            /*
            effectBloom = new THREE.BloomPass(1.5, 25, 8, 256);
            effectBloom.renderToScreen = true;
            composer.addPass(effectBloom);
            */

            //

            if (window.addEventListener) {
                window.addEventListener('resize', onWindowResize, false);
            } else {
                window.attachEvent('onresize', onWindowResize);
            }

            function onWindowResize() {
                camera.aspect = element[0].offsetWidth / element[0].offsetHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(element[0].offsetWidth, element[0].offsetHeight);
            }

            var pointerObject = new THREE.Box3();

            function onFocus(part) {
                if (!part) {
                    return;
                }
                scope.saber.selectedPart = part;
                if (part.currentModel) {
                    pointerObject.setFromObject(part.currentModel);
                    var center = pointerObject.center();
                    if (part.type == APP.Parts.typeEnum.Blade) {
                        if (part.flipped) {
                            center.x += ((pointerObject.max.x - pointerObject.min.x) / 3);
                        } else {
                            center.x -= ((pointerObject.max.x - pointerObject.min.x) / 3);
                        }
                    }
                    cameraTarget.copy(center);
                    cameraRadiusMultiplier = .5;
                }
                /*
                var partIndex = scope.saber.getIndexByPart(part);
                cameraPow = Math.max(0, Math.min(1, Math.abs(partIndex - (scope.saber.parts.length / 2)) / (scope.saber.parts.length / 2)));
                */
                if (part.type === APP.Parts.typeEnum.BladePlug) {
                    cameraPow = 1;
                } else {
                    cameraPow = 0;
                }
                // console.log(APP.ios);
                if (part.type == APP.Parts.typeEnum.Sound) {
                    scope.$root.$broadcast('onSoundSwing', scope.saber.sound, scope.accel.change);
                }
                /*
                if (APP.ios) {
                    if (part.type == APP.Parts.typeEnum.Sound) {
                        transform = transformSwing;
                        scope.$root.$broadcast('onSoundSwing', scope.saber.sound, scope.accel.change);
                    } else {
                        transform = transformBuilder;
                    }
                } else if (part.type == APP.Parts.typeEnum.Sound) {
                    scope.$root.$broadcast('onSoundSwing', scope.saber.sound, scope.accel.change);
                }
                */
            }

            function onBlur() {
                scope.saber.selectedPart = null;
                selectedIndex = null;
                cameraTarget.x = cameraTarget.y = cameraTarget.z = 0;
                cameraRadiusMultiplier = 1;
                cameraPow = 0;
                transform = scope.controls.rotationFlag ? transformBuilder : transformBuilderNoRotation;
            }

            function onAddItem(part, id, counter) {
                // console.log('onAddItem', part.key, id);
                var newPart = scope.saber.add(part, id);
                onJsonLoad(newPart, function () {
                    /*
                    $timeout(function () {
                        onFocus(newPart);
                    }, 50);
                    */
                }, counter);
            }

            function onRemoveItem(part) {
                // console.log('onRemoveItem', part.key);
                scope.saber.remove(part);
                onBlur();
            }

            function onJsonLoad(part, callback, counter) {
                // console.log('onJsonLoad', part.key);
                scope.saber.update(part, part.item);
                var item = part.currentItem;
                if (part.isLed && part.hasLedReceivers) {
                    onUpdateLed(part.receivers, part);
                } else if (part.type === APP.Parts.typeEnum.Sound && !part.withCode) {
                    scope.$root.$broadcast('onSoundStart', part);
                }
                part.withCode = null;
                if (!item || !item.model) {
                    callback ? callback() : null;
                    return;
                }

                part.loading = true;

                // console.log(item.key, finish.key);

                scope.loader.add(item.key + item.id);

                function onJsonLoaded(_geometry, _materials) {
                    // console.log('onJsonLoaded', part.key, finish.key);
                    scope.loader.remove(item.key + item.id);
                    var finish = part.currentFinish;
                    if (finish && materials[finish.key]) {
                        // console.log(finish.key);
                        replaceMaterial(_materials, 'chrome', materials[finish.key].silver);
                        replaceMaterial(_materials, 'black', materials[finish.key].black);
                    }
                    replaceMaterial(_materials, 'bronze', materials.bronze);
                    replaceMaterial(_materials, 'gold', materials.gold);
                    replaceMaterial(_materials, 'red', materials.red);
                    replaceMaterial(_materials, 'green', materials.green);
                    if (part.hasSecondaryFinishes) {
                        var secondaryFinish = part.currentSecondaryFinish;
                        replaceMaterial(_materials, 'wrap', materials.wrap.clone());
                        onUpdateSecondaryFinish(_materials, secondaryFinish);
                    }
                    part.materials = _materials;
                    if (part.isLedReceiver) {
                        onUpdateLed([part], part.led);
                    }

                    var _material = new THREE.MeshFaceMaterial(_materials);
                    var object = new THREE.Mesh(_geometry, _material);

                    object.geometry.uvsNeedUpdate = true;
                    object.geometry.normalsNeedUpdate = true;
                    object.geometry.verticesNeedUpdate = true;
                    object.geometry.computeMorphNormals();
                    object.geometry.computeFaceNormals();
                    object.geometry.computeVertexNormals();

                    object.geometry.computeBoundingBox();
                    var bounds = object.geometry.boundingBox.clone();

                    // $timeout(function () {

                    part.bounds.min = bounds.min.x;
                    part.bounds.max = bounds.max.x;
                    part.bounds.size = part.bounds.width = bounds.max.x - bounds.min.x;
                    part.bounds.left = 0;

                    if (part.type == APP.Parts.typeEnum.Blade) {
                        part.bounds.width = 0;
                        part.coords.start = 0;
                        object.scale.x = 0.01;
                        part.transform = part.transformBlade;
                    } else {
                        part.transform = part.transformDefault;
                    }

                    scope.saber.computedWidth();

                    var x = getTransformX(part);

                    object.position.x = x; // part.bounds.left; // * 1.5;
                    object.position.y = part.coords.start;
                    part.coords.current = part.coords.end;

                    if (part.flipped) {
                        object.rotation.y = Math.PI;
                        part.insetLeft = item.insetRight;
                        part.insetRight = item.insetLeft;
                    } else {
                        part.insetRight = item.insetRight;
                        part.insetLeft = item.insetLeft;
                    }

                    // console.log('part.bounds', part.bounds.min, part.bounds.max, part.bounds.width, part.bounds.left, part.insetLeft, part.insetRight);

                    object.name = part.key + item.id;
                    part.currentModel = object;
                    part.wrongPivot.position.x = part.bounds.width / 2 - part.insetRight;

                    objects.saber.add(object);
                    objects.saber.add(part.wrongPivot);

                    // }, counter ? 150 * counter : 0);

                    // console.log(part.currentModel);

                    /*
                    if (part.key === 'emitter') {
                        part.saberLight = new THREE.PointLight(0xff0000, 5, 20);
                        part.saberLight.position.set((part.bounds.left + part.bounds.width / 2) * scope.saber.scale, 100, 0);
                        scene.add(part.saberLight);
                    } else {
                        part.saberLight = new THREE.Object3D();
                    }
                    */

                    // console.log(modelWidth, scope.saber.scale);

                    scope.saber.onLoaded(part);

                    callback ? callback() : null;

                    transform = scope.controls.rotationFlag ? transformBuilder : transformBuilderNoRotation;

                    part.loading = false;
                    part.loaded = true;

                };

                var forge = new Forge();
                forge.get('/Media/' + item.model).then(function (data) {
                    var loader = new THREE.JSONLoader();
                    var model = loader.parse(data);
                    onJsonLoaded(model.geometry, model.materials);
                });

                /*
                jsonLoader = new THREE.JSONLoader();
                jsonLoader.load('/Media/' + item.model, onJsonLoaded);
                */
            }

            function loadItemParts() {
                if (scope.saber.parts) {
                    angular.forEach(scope.saber.parts, function (part, partKey) {
                        if (!part.loaded && !part.loading) {
                            onJsonLoad(part);
                        }
                    });
                }
            }
            loadItemParts();

            function onSelectPrev() {
                if (scope.saber.parts.length === 0) {
                    return;
                }
                selectedIndex != null ? selectedIndex-- : selectedIndex = scope.saber.parts.length - 1;
                if (selectedIndex < 0) {
                    onBlur();
                } else {
                    onFocus(scope.saber.parts[selectedIndex]);
                }
            }

            function onSelectNext() {
                if (scope.saber.parts.length === 0) {
                    return;
                }
                selectedIndex != null ? selectedIndex++ : selectedIndex = 0;
                if (selectedIndex >= scope.saber.parts.length) {
                    onBlur();
                } else {
                    onFocus(scope.saber.parts[selectedIndex]);
                }
            }

            scope.$on('onSelectPrev', function ($scope) {
                onSelectPrev();
            });

            scope.$on('onSelectNext', function ($scope) {
                onSelectNext();
            });

            function onUpdateLed(receivers, led) {
                var ledType, ledFinish = null;
                if (led) {
                    ledType = led.ledType;
                    ledFinish = led.currentFinish;
                } else {
                    ledType = APP.Parts.ledTypeEnum.OFF;
                }
                angular.forEach(receivers, function (part, key) {
                    // console.log('onUpdateLed', part.key, ledType, ledFinish);
                    switch (ledType) {
                        case APP.Parts.ledTypeEnum.OFF:
                            replaceMaterial(part.materials, 'light', materials.light.off);
                            replaceMaterial(part.materials, 'glare', materials.glare.off.clone());
                            replaceMaterial(part.materials, 'emitterGlare', materials.emitterGlare.off.clone());
                            // replaceMaterial(part.materials, 'emitter', materials.emitter.off.clone());
                            break;
                        case APP.Parts.ledTypeEnum.ON6:
                            replaceMaterial(part.materials, 'light', materials.light.on6);
                            replaceMaterial(part.materials, 'glare', materials.glare.on6.clone());
                            replaceMaterial(part.materials, 'emitterGlare', materials.emitterGlare.on6.clone());
                            // replaceMaterial(part.materials, 'emitter', materials.emitter.on6.clone());
                            onUpdateColor(part.materials, ledFinish);
                            break;
                        case APP.Parts.ledTypeEnum.ON12:
                            replaceMaterial(part.materials, 'light', materials.light.on12);
                            replaceMaterial(part.materials, 'glare', materials.glare.on12.clone());
                            replaceMaterial(part.materials, 'emitterGlare', materials.emitterGlare.on12.clone());
                            // replaceMaterial(part.materials, 'emitter', materials.emitter.on12.clone());
                            onUpdateColor(part.materials, ledFinish);
                            break;
                    }
                });
            }

            scope.$on('onUpdateLed', function (scope, receivers, led) {
                // console.log('scope.onUpdateLed', receivers, led);
                onUpdateLed(receivers, led);
            });

            scope.$on('onFinishChange', function ($scope, part, id) {
                var finish = part.setFinish(id);
                // console.log('onFinishChange', part, id, finish, part.isLed, part.hasLedReceivers);
                if (part.isLed) {
                    if (part.hasLedReceivers) {
                        onUpdateLed(part.receivers, part);
                    }
                }
                if (part.type === APP.Parts.typeEnum.Sound) {} else {
                    onUpdateFinish(part.materials, finish);
                }
                scope.saber.encode(part);
            });

            scope.$on('onSecondaryFinishChange', function ($scope, part, id) {
                // console.log('onSecondaryFinishChange', part, id);                
                var secondaryFinish = part.setSecondaryFinish(id);
                onUpdateSecondaryFinish(part.materials, secondaryFinish);
                scope.saber.encode(part);

            });

            scope.$on('onItemChange', function ($scope, part, id) {
                part.setItem(id);
                onJsonLoad(part, function () {
                    scope.saber.encode(part);
                    // console.log('onItemChange', part.type, scope.saber.code);                    
                });
                scope.play();
            });

            scope.$on('onAddPart', function ($scope, part, id, counter) {
                // console.log('onAddPart', part.key, id);
                onAddItem(part, id, counter);
                scope.play();
            });

            scope.$on('onPlayPause', function ($scope, pause) {
                if (pause) {
                    scope.pause();
                    onBlur();
                    // console.log('onPlayPause', 'pause');
                } else {
                    scope.play();
                    // console.log('onPlayPause', 'play');
                }
            });

            scope.$on('onRemovePart', function ($scope, part) {
                onRemoveItem(part);
            });

            scope.$on('onFlipPart', function ($scope, part) {
                part.flipped = !part.flipped;
                if (part.flipped) {
                    part.insetLeft = part.currentItem.insetRight;
                    part.insetRight = part.currentItem.insetLeft;
                } else {
                    part.insetRight = part.currentItem.insetRight;
                    part.insetLeft = part.currentItem.insetLeft;
                }
                scope.saber.update(part);
            });

            var flagFloor = 0;
            scope.$on('onSwapBackground', function ($scope) {
                var color;
                switch (flagFloor) {
                    case 0:
                        flagFloor = 1;
                        objects.floor.material.color.set(0xffffff);
                        objects.floor.material.specular.set(0x202020);
                        objects.floor.material.bumpScale = 0.0001;
                        scope.$root.$broadcast('onBackgroundChange', 'white');
                        // onUpdateColor(objects.floor.material, { name: 'floor', color: '#909090' });
                        break;
                    case 1:
                        flagFloor = 2;
                        objects.floor.material.color.set(0x101010);
                        objects.floor.material.specular.set(0x101010);
                        scope.$root.$broadcast('onBackgroundChange', 'black');
                        // onUpdateColor(objects.floor.material, { name: 'floor', color: '#101010' });
                        break;
                    case 2:
                        flagFloor = 0;
                        objects.floor.material.color.set(0x101010);
                        objects.floor.material.specular.set(0x101010);
                        objects.floor.material.bumpScale = 0.05;
                        scope.$root.$broadcast('onBackgroundChange', 'black');
                        // onUpdateColor(objects.floor.material, { name: 'floor', color: '#909090' });
                        break;
                }
            });

            scope.$on('onRotationToggle', function ($scope) {
                onRotationToggle();
            });

            function onRotationToggle() {
                if (scope.controls.rotationFlag) {
                    transform = transformBuilder;
                } else {
                    transform = transformBuilderNoRotation;
                }
            };


            function hexToRgb(hex) {
                var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : null;
            }

            function onUpdateColor(array, finish) {
                // console.log('onUpdateColor', array, finish);
                if (!array || !finish) {
                    return;
                }
                var found = -1,
                    i = 0,
                    t = array.length;
                while (i < t) {
                    if (array[i].name === 'glare' || array[i].name === 'emitter' || array[i].name === 'emitterGlare') {
                        var color = hexToRgb(finish.color);
                        // console.log(array[i].color, color);
                        array[i].color.r = color.r / 255;
                        array[i].color.g = color.g / 255;
                        array[i].color.b = color.b / 255;
                    }
                    i++;
                }
            }

            function onUpdateFinish(array, finish) {
                // console.log('onUpdateFinish', array, finish);
                if (!array) {
                    return;
                }
                switch (finish.key) {
                    case 'standard':
                        replaceMaterial(array, 'chrome', materials.standard.silver);
                        replaceMaterial(array, 'black', materials.standard.black);
                        break;
                    case 'weathered':
                        replaceMaterial(array, 'chrome', materials.weathered.silver);
                        replaceMaterial(array, 'black', materials.weathered.black);
                        break;
                    case 'silver':
                        replaceMaterial(array, 'chrome', materials.silver.silver);
                        replaceMaterial(array, 'black', materials.silver.black);
                        break;
                    case 'black':
                        replaceMaterial(array, 'chrome', materials.black.silver);
                        replaceMaterial(array, 'black', materials.black.black);
                        break;
                }
            }

            function onUpdateSecondaryFinish(array, finish) {
                // console.log('onUpdateSecondaryFinish', array, finish);
                if (!array) {
                    return;
                }
                if (finish.key.indexOf('Leather') != -1) {
                    setMaterialMaps(array, 'wrap', 'leather', finish);
                } else if (finish.key.indexOf('Reptile') != -1) {
                    setMaterialMaps(array, 'wrap', 'reptile', finish);
                } else if (finish.key.indexOf('Stingray') != -1) {
                    setMaterialMaps(array, 'wrap', 'stingray', finish);
                }
            }

            function getTouch(e) {
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
            }

            var raycaster = new THREE.Raycaster();
            // raycaster.ray.direction.set(0, -1, 0);
            var mouse = new THREE.Vector2(0, 0);

            var down = null,
                move = null,
                moved = 0,
                pinching = false;

            function onDown(e) {
                down = getTouch(e);
                down.mx = down.x;
                down.sx = cameraDragAngle;
                down.sy = scope.zoom.cameraRadius;
                addDragListeners();

                var rect = element[0].getBoundingClientRect();
                var scrollX = window.pageXOffset || document.documentElement.scrollLeft;
                var scrollY = window.pageYOffset || document.documentElement.scrollTop;
                mouse.x = ((down.x - rect.left - scrollX) / element[0].offsetWidth) * 2 - 1;
                mouse.y = -((down.y - rect.top - scrollY) / element[0].offsetHeight) * 2 + 1;
                // console.log((down.x - rect.left - scrollX), (down.y - rect.top - scrollY));
                raycaster.setFromCamera(mouse, camera);
                var intersects = raycaster.intersectObjects(objects.saber.children);
                angular.forEach(intersects, function (item, itemKey) {
                    // item.object.material.color.set(0xff0000);
                    angular.forEach(scope.saber.parts, function (value, i) {
                        if (value.currentModel === item.object) { // && value.type !== APP.Parts.typeEnum.Blade) {
                            // console.log(item.object);
                            down.index = i;
                            down.part = value;
                            down.angle = value.coords.angle;
                        }
                    });
                });
                if (e.type === 'touchstart') {
                    e.stopPropagation();
                    e.preventDefault();
                }
            }

            function onMove(e) {
                move = getTouch(e);
                moved++;
                var multiplier = 0.001;
                if (e.type === 'touchmove') {
                    e.stopPropagation();
                    e.preventDefault();
                    multiplier *= 4;
                }
                if (move.count == 2 && down.count == 2) {
                    // PINCHING                    
                    scope.zoom.cameraRadius = down.sy + (down.dist() - move.dist()) * multiplier * 10;
                } else {
                    if (down.part && scope.saber.selectedPart === down.part) {
                        // ROTATE ANGLE
                        down.part.coords.angle = down.angle + (move.y - down.y) * multiplier * 10;
                    } else {
                        cameraDragAngle = down.sx + (move.x - down.x) * multiplier;
                        scope.zoom.cameraRadius = down.sy + (down.y - move.y) * multiplier * 10;
                        if (scope.saber.selectedPart && scope.saber.selectedPart.type == APP.Parts.typeEnum.Sound) {
                            if (Math.abs(move.x - down.mx) > $window.innerWidth / 3) {
                                down.mx = move.x;
                                scope.$root.$broadcast('onSoundSwing', scope.saber.sound, Math.abs(move.x - down.mx) / 100);
                            }
                        }
                    }
                }
                scope.zoom.cameraRadius = Math.min(scope.zoom.cameraRadiusMax, Math.max(scope.zoom.cameraRadiusMin, scope.zoom.cameraRadius));
                scope.$root.$broadcast('onControls');
            }

            function onUp(e) {
                if (down && moved < 5) {
                    if (down.part) {
                        scope.$apply(function () {
                            selectedIndex = down.index;
                            onFocus(down.part);
                        });
                    } else if (scope.saber.selectedPart) {
                        scope.$apply(function () {
                            onBlur();
                        });
                    }
                }
                down = null;
                move = null;
                moved = 0;
                removeDragListeners();
            }

            function addDragListeners() {
                angular.element(document).on('touchmove mousemove', onMove);
                angular.element(document).on('touchend mouseup', onUp);
            }

            function removeDragListeners() {
                angular.element(document).off('touchmove mousemove', onMove);
                angular.element(document).off('touchend mouseup', onUp);
            }

            function onWheel(e) {
                var e = window.event || e; // old IE support
                var bounds = getElementBounds();
                if (Math.abs(e.pageX - bounds.center.x) < bounds.width / 3) {
                    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
                    scope.zoom.cameraRadius += delta;
                    scope.zoom.cameraRadius = Math.min(scope.zoom.cameraRadiusMax, Math.max(scope.zoom.cameraRadiusMin, scope.zoom.cameraRadius));
                    e.preventDefault();
                    scope.$root.$broadcast('onControls');
                }
            }

            function getElementBounds() {
                var bounds = {
                    x: 0,
                    y: 0,
                    width: element[0].offsetWidth,
                    height: element[0].offsetHeight,
                    center: {
                        x: 0,
                        y: 0
                    },
                }
                bounds.center.x = bounds.width / 2;
                bounds.center.y = bounds.height / 2;
                return bounds;
            }

            element.on('touchstart mousedown', onDown);
            element.on('mousewheel', onWheel);

            function onKeyUp(e) {
                switch (e.keyCode) {
                    case 38:
                        // up arrow
                        break;
                    case 40:
                        // down arrow
                        break;
                    case 37:
                        // left arrow
                        onSelectPrev();
                        break;
                    case 39:
                        // right arrow
                        onSelectNext();
                        break;
                }
            }

            angular.element($document).on('keyup', onKeyUp);

            scope.accel = {
                change: 7,
                shaking: 0,
                x: 0,
                y: 0,
                z: 0,
            };

            function doAccelerometer() {
                var sensitivity = 6;
                var x1 = 0,
                    y1 = 0,
                    z1 = 0,
                    x2 = 0,
                    y2 = 0,
                    z2 = 0;
                // Periodically check the position and fire
                // if the change is greater than the sensitivity
                function checkAcceleration() {
                    var change = 0;
                    if (scope.accel.shaking > 0) {
                        scope.accel.shaking--;
                    } else {
                        change = Math.abs(x1 - x2 + y1 - y2 + z1 - z2);
                        if (change > sensitivity) {
                            // console.log('shake');
                            scope.accel.shaking = 10;
                            scope.$root.$broadcast('onSoundSwing', scope.saber.sound, change);
                        }
                    }
                    scope.accel.change = change;
                    scope.accel.x = x1;
                    scope.accel.y = y1;
                    scope.accel.z = z1;
                    // console.log('checkAcceleration', change, x1, y1, z1);
                    // Update new position
                    x2 = x1;
                    y2 = y1;
                    z2 = z1;
                }
                // Shake sensitivity (a lower number is more)
                // Listen to motion events and update the position
                window.addEventListener('devicemotion', function (e) {
                    x1 = e.accelerationIncludingGravity.x;
                    y1 = e.accelerationIncludingGravity.y;
                    z1 = e.accelerationIncludingGravity.z;
                    // console.log('devicemotion', x1, y1, z1);
                }, false);
                $interval(checkAcceleration, 150);
                /*
                if (typeof window.DeviceMotionEvent != 'undefined' && typeof window.addEventListener != 'undefined') {
                    // Shake sensitivity (a lower number is more)
                    // Listen to motion events and update the position
                    window.addEventListener('devicemotion', function (e) {
                        x1 = e.accelerationIncludingGravity.x;
                        y1 = e.accelerationIncludingGravity.y;
                        z1 = e.accelerationIncludingGravity.z;
                        // console.log('devicemotion', x1, y1, z1);
                    }, false);
                    $interval(checkAcceleration, 150);
                } else {
                    $timeout(function () {
                        scope.accel.change = 'no accelerometer';
                    }, 1);
                }
                */
            }

            /*
            if (APP.ios) {
                doAccelerometer();
            } else {
                console.log('no accelerometer');
            }
            */

            var requestId, drawPicture;

            transform = transformIdle;

            scope.loop = function (time) {
                /*
                if (drawPicture == true) {
                    drawPicture = false;
                    makeSnapshot();
                }*/
                if (!scope.loader.loading) {
                    // dispatch(events.update, { time: time, delta: time - prevTime });
                    // if (vr) controls.update();
                    // camera.updateMatrixWorld();
                    transform();
                    renderer.render(scene, camera);
                    // composer.render();
                    // prevTime = time; 
                    if (drawPicture == true) {
                        drawPicture = false;
                        Snapshot.post(scope.saber.code, renderer.domElement.toDataURL('image/jpeg', 0.95)).then(function (share) {
                            scope.$root.$broadcast('onSocialPictureReady', share);
                        });
                    }
                }
                requestId = window.requestAnimationFrame(scope.loop, renderer.domElement);
            }

            scope.play = function () {
                if (!requestId) {
                    scope.loop();
                }
            }

            scope.pause = function () {
                if (requestId) {
                    window.cancelAnimationFrame(requestId);
                    requestId = undefined;
                }
            }

            scope.play();

            scope.$on('onSocialPictureGenerationRequest', function ($scope) {
                drawPicture = true;
            });

            // TRANSFORMATIONS
            function transformIdle() {
                cameraAngle += 0.0002;

                cameraVector.x += (cameraTarget.x - cameraVector.x) / 40;
                cameraVector.y += (cameraTarget.y - cameraVector.y) / 40;
                cameraVector.z += (cameraTarget.z - cameraVector.z) / 40;

                cameraPosition.x = cameraVector.x + scope.zoom.cameraRadius * cameraRadiusMultiplier * Math.cos(cameraDragAngle + cameraAngle);
                cameraPosition.y = cameraVector.y + scope.zoom.cameraRadius * cameraRadiusMultiplier * 2;
                cameraPosition.z = cameraVector.z + scope.zoom.cameraRadius * cameraRadiusMultiplier * Math.sin(cameraDragAngle + cameraAngle);

                camera.position.x += (cameraPosition.x - camera.position.x) / 13;
                camera.position.y += (cameraPosition.y - camera.position.y) / 13;
                camera.position.z += (cameraPosition.z - camera.position.z) / 13;
                // camera.up = new THREE.Vector3(0, 0, -1);

                camera.lookAt(cameraVector);

                objects.saber.scale.x = scope.saber.scale;
                objects.saber.scale.y = scope.saber.scale;
                objects.saber.scale.z = scope.saber.scale;
            };

            function transformBuilder() {

                cameraAngle += 0.0002;

                cameraVector.x += (cameraTarget.x - cameraVector.x) / 40;
                cameraVector.y += (cameraTarget.y - cameraVector.y) / 40;
                cameraVector.z += (cameraTarget.z - cameraVector.z) / 40;

                cameraPosition.x = cameraVector.x + scope.zoom.cameraRadius * cameraRadiusMultiplier * Math.cos(cameraDragAngle + cameraAngle);
                cameraPosition.y = cameraVector.y + scope.zoom.cameraRadius * cameraRadiusMultiplier * (2 - 1.5 * cameraPow);
                cameraPosition.z = cameraVector.z + scope.zoom.cameraRadius * cameraRadiusMultiplier * Math.sin(cameraDragAngle + cameraAngle);

                camera.position.x += (cameraPosition.x - camera.position.x) / 13;
                camera.position.y += (cameraPosition.y - camera.position.y) / 13;
                camera.position.z += (cameraPosition.z - camera.position.z) / 13;
                // camera.up = new THREE.Vector3(0, 0, -1);

                camera.lookAt(cameraVector);

                objects.saber.scale.x = scope.saber.scale;
                objects.saber.scale.y = scope.saber.scale;
                objects.saber.scale.z = scope.saber.scale;

                transformParts();

            };

            function transformBuilderNoRotation() {

                cameraVector.x += (cameraTarget.x - cameraVector.x) / 40;
                cameraVector.y += (cameraTarget.y - cameraVector.y) / 40;
                cameraVector.z += (cameraTarget.z - cameraVector.z) / 40;

                cameraPosition.x = cameraVector.x + scope.zoom.cameraRadius * cameraRadiusMultiplier * Math.cos(cameraDragAngle + cameraAngle);
                cameraPosition.y = cameraVector.y + scope.zoom.cameraRadius * cameraRadiusMultiplier * (2 - 1.5 * cameraPow);
                cameraPosition.z = cameraVector.z + scope.zoom.cameraRadius * cameraRadiusMultiplier * Math.sin(cameraDragAngle + cameraAngle);

                camera.position.x += (cameraPosition.x - camera.position.x) / 13;
                camera.position.y += (cameraPosition.y - camera.position.y) / 13;
                camera.position.z += (cameraPosition.z - camera.position.z) / 13;
                // camera.up = new THREE.Vector3(0, 0, -1);

                camera.lookAt(cameraVector);

                objects.saber.scale.x = scope.saber.scale;
                objects.saber.scale.y = scope.saber.scale;
                objects.saber.scale.z = scope.saber.scale;

                transformParts(true);

            };

            function transformSwing() {

                scope.zoom.cameraRadius = scope.zoom.cameraRadiusMax;
                cameraAngle += 0.0002;

                cameraVector.x += (cameraTarget.x - cameraVector.x) / 40;
                cameraVector.y += (cameraTarget.y - cameraVector.y) / 40;
                cameraVector.z += (cameraTarget.z - cameraVector.z) / 40;

                cameraPosition.x = cameraVector.x - (scope.zoom.cameraRadius * cameraRadiusMultiplier * 1.5); // cameraVector.x + scope.zoom.cameraRadius * cameraRadiusMultiplier * Math.cos(cameraDragAngle + cameraAngle);
                cameraPosition.y = scope.zoom.cameraRadius * cameraRadiusMultiplier * 5; // cameraVector.y + scope.zoom.cameraRadius * cameraRadiusMultiplier * 2;
                cameraPosition.z = cameraVector.z; // cameraVector.z + scope.zoom.cameraRadius * cameraRadiusMultiplier * Math.sin(cameraDragAngle + cameraAngle);

                camera.position.x += (cameraPosition.x - camera.position.x) / 20;
                camera.position.y += (cameraPosition.y - camera.position.y) / 20;
                camera.position.z += (cameraPosition.z - camera.position.z) / 20;

                camera.lookAt(cameraVector);

                objects.saber.scale.x = scope.saber.scale;
                objects.saber.scale.y = scope.saber.scale;
                objects.saber.scale.z = scope.saber.scale;

                objects.saber.rotation.y = cameraDragAngle;

                transformParts();

            };

        }
    }
}]);

app.directive('appShare', ['$rootScope', function ($rootScope) {
    return {
        restrict: 'A',
        scope: {
            type: '@appShare',
            share: '=',
        },
        link: function (scope, element, attributes, model) {
            function onShare(type, share) {
                var base = '';
                switch (type) {
                    case 'facebook':
                        // console.log('shareUrl', share.url);
                        // console.log('shareUrlEncoded', encodeURIComponent(share.url));
                        base = 'http://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(share.url);
                        break;
                    case 'twitter':
                        base = 'https://twitter.com/intent/tweet?';
                        if (share.hashtags) {
                            base += '&hashtags=' + encodeURIComponent(share.hashtags);
                        }
                        if (share.description) {
                            base += '&text=' + encodeURIComponent(share.description);
                        }
                        if (share.host) {
                            base += '&url=' + encodeURIComponent(share.host);
                        }
                        if (share.via) {
                            base += '&via=' + encodeURIComponent(share.via);
                        }
                        break;
                    case 'googleplus':
                        base = 'https://plus.google.com/share?url=' + encodeURIComponent(share.url);
                        break;
                    case 'pinterest':
                        base = 'https://pinterest.com/pin/create/button/?url=' + encodeURIComponent(share.url) + '&media=' + encodeURIComponent(share.picture);
                        if (share.text) {
                            base += '&description=' + encodeURIComponent(share.text);
                            if (share.description) {
                                base += encodeURIComponent(' ' + share.description);
                            }
                        }
                        break;
                    case 'linkedin':
                        // http://www.linkedin.com/shareArticle?mini=true&url={articleUrl}&title={articleTitle}&summary={articleSummary}&source={articleSource}
                        base = 'http://www.linkedin.com/shareArticle?mini=true&url=' + encodeURIComponent(share.url);
                        if (share.text) {
                            base += '&title=' + encodeURIComponent(share.text);
                        }
                        if (share.description) {
                            base += '&summary=' + encodeURIComponent(share.description);
                        }
                        if (share.via) {
                            base += '&source=' + encodeURIComponent(share.via);
                        }
                        break;
                }
                var width = 623;
                var height = 309;
                var left = (angular.element(window).offsetWidth - width) / 2;
                var top = (angular.element(window).offsetHeight - height) / 2;
                window.open(base, "_blank", "toolbar=no, scrollbars=yes, resizable=no, left=" + left + ", top=" + top + ", width=" + width + ", height=" + height + "");
            }

            function onClick(e) {
                e.stopPropagation();
                onShare(scope.type, scope.share);
                return false;
            }

            function addListeners() {
                element.on('click', onClick);
            };

            function removeListeners() {
                element.off('click', onClick);
            };
            addListeners();
            scope.$on('$destroy', function () {
                removeListeners();
            });
        }
    };
}]);

app.directive('media', [function () {
    return {
        restrict: 'A',
        link: function (scope, element, attributes, model) {
            var media = attributes.media;
            if (media != undefined) {
                var img = new Image();
                img.onload = function () {
                    element.attr('src', media);
                };
                img.src = media;
            }
        }
    }
}]);

app.directive('appZoom', [function () {
    return {
        restrict: 'A',
        scope: {
            zoom: '=appZoom',
        },
        link: function (scope, element, attributes, model) {

            var track = angular.element('<div class="track"></div>');
            var slider = angular.element('<div class="slider"></div>');
            element.append(track);
            element.append(slider);
            var init = false;

            function onUpdate() {
                var pow = (scope.zoom.cameraRadius - scope.zoom.cameraRadiusMin) / (scope.zoom.cameraRadiusMax - scope.zoom.cameraRadiusMin);
                slider.css({
                    top: ((track[0].offsetHeight - 4) * (1 - pow)) + 'px'
                });
            }
            scope.$watch('zoom.cameraRadius', function (newValue) {
                onUpdate();
                if (!init) {
                    init = true;
                    addListeners();
                }
            });
            scope.$on('onControls', function ($scope) {
                onUpdate();
            });

            function getTouch(e) {
                var t = {
                    x: 0,
                    y: 0
                };
                if (e.type == 'touchstart' || e.type == 'touchmove' || e.type == 'touchend' || e.type == 'touchcancel') {
                    var touch = null;
                    var touches = e.originalEvent ? e.originalEvent.touches || e.originalEvent.changedTouches : e.touches || e.changedTouches;
                    if (touches && touches.length) {
                        touch = touches[0];
                    }
                    if (touch) {
                        t.x = touch.pageX;
                        t.y = touch.pageY;
                    }
                } else if (e.type == 'click' || e.type == 'mousedown' || e.type == 'mouseup' || e.type == 'mousemove' || e.type == 'mouseover' || e.type == 'mouseout' || e.type == 'mouseenter' || e.type == 'mouseleave') {
                    t.x = e.pageX;
                    t.y = e.pageY;
                }
                return t;
            }

            var down = null;

            function onDown(e) {
                down = getTouch(e);
                down.sy = (scope.zoom.cameraRadius - scope.zoom.cameraRadiusMin) / (scope.zoom.cameraRadiusMax - scope.zoom.cameraRadiusMin);
                addDragListeners();
                if (e.type === 'touchstart') {
                    e.stopPropagation();
                    e.preventDefault();
                }
            }

            function onMove(e) {
                // console.log('zoom.onMove', e);                
                var move = getTouch(e);
                if (e.type === 'touchmove') {
                    e.stopPropagation();
                    e.preventDefault();
                }
                var pow = down.sy + (down.y - move.y) / track[0].offsetHeight;
                pow = Math.min(1, Math.max(0, pow));
                slider.css({
                    top: ((track[0].offsetHeight - 4) * (1 - pow)) + 'px'
                });
                // console.log(track[0].offsetHeight, pow, scope.zoom.cameraRadius);
                scope.zoom.cameraRadius = scope.zoom.cameraRadiusMin + (scope.zoom.cameraRadiusMax - scope.zoom.cameraRadiusMin) * pow;
            }

            function onWindowResize() {
                onUpdate();
            }

            function onUp(e) {
                removeDragListeners();
            }

            function addDragListeners() {
                angular.element(document).on('touchmove mousemove', onMove);
                angular.element(document).on('touchend mouseup', onUp);
            }

            function removeDragListeners() {
                angular.element(document).off('touchmove mousemove', onMove);
                angular.element(document).off('touchend mouseup', onUp);
            }

            function addListeners() {
                if (window.addEventListener) {
                    window.addEventListener('resize', onWindowResize, false);
                } else {
                    window.attachEvent('onresize', onWindowResize);
                }

                element.on('touchstart mousedown', onDown);
                element.on('mousewheel', onWheel);
            };

            function removeListeners() {
                element.off('touchstart mousedown', onDown);
            };

            function onWheel(e) {
                var e = window.event || e; // old IE support
                var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
                var pow = (scope.zoom.cameraRadius - scope.zoom.cameraRadiusMin) / (scope.zoom.cameraRadiusMax - scope.zoom.cameraRadiusMin);
                pow += delta * .01;
                pow = Math.min(1, Math.max(0, pow));
                slider.css({
                    top: ((track[0].offsetHeight - 4) * (1 - pow)) + 'px'
                });
                // console.log(track[0].offsetHeight, pow, scope.zoom.cameraRadius);
                scope.zoom.cameraRadius = scope.zoom.cameraRadiusMin + (scope.zoom.cameraRadiusMax - scope.zoom.cameraRadiusMin) * pow;
            }
            scope.$on('$destroy', function () {
                removeListeners();
            });
        }
    }
}]);

app.directive('appAudio', ['$rootScope', function ($rootScope) {

    return {
        restrict: 'A',
        link: function (scope, element, attributes, model) {

            var audio = element[0];
            var source = element.find('source');
            var playing = false;
            var currentItem = null;

            // audio.addEventListener('loadstart', onLoadStart, false);
            // audio.addEventListener('progress', onLoadProgress, false);
            // audio.addEventListener('timeupdate', onPlayProgress, false);
            audio.addEventListener('canplay', onAudioCanPlay, false);
            audio.addEventListener('canplaythrough', onAudioCanThrough, false);
            audio.addEventListener('ended', onAudioEnded, false);
            audio.addEventListener('error', onAudioError, false);
            audio.addEventListener('play', onAudioPlay, false);
            audio.addEventListener('pause', onAudioPause, false);
            // audio.addEventListener('seeked', onAudioSeeked, false);

            scope.$on('onSoundStart', function ($scope, part) {
                onSound(part, 'Start');
            });

            scope.$on('onSoundSwing', function ($scope, part, pow) {
                pow = Math.min(1, pow / 10);
                onSound(part, 'Swing', pow);
            });

            function onSound(part, soundType, pow) {
                if (playing) {
                    return;
                }
                playing = true;

                currentItem = part.currentItem;
                pow = pow || .2;

                var currentSrc = '/Media/Sound/';
                if (currentItem.key.indexOf('Crimson') !== -1) {
                    currentSrc += 'Crimson' + soundType;
                } else {
                    currentSrc += 'Viridian' + soundType;
                }

                // console.log('appAudio.onSound', currentSrc, soundType, pow);

                switch (soundType) {
                    case 'Start':
                        currentSrc += '.mp3';
                        break;
                    case 'Swing':
                        currentSrc += (Math.min(2, Math.floor(Math.random() * 3)) + '.mp3');
                        break;
                }

                source.attr('src', currentSrc);
                audio.load();
                audio.play();

                /*
                audio.pause();
                audio.load();
                */

            };

            function onState() {
                $rootScope.$broadcast('onAudioState', currentItem);
            }

            // FUNCTIONS

            function timeRangesToString(r) {
                var log = '';
                for (var i = 0; i < r.length; i++) {
                    log += '[' + r.start(i) + ',' + r.end(i) + ']<br>';
                }
                return log;
            }

            function Buffer(e) {
                var buffer = audio.buffered,
                    start, end, maxBuffer = 0;
                if (buffer) {
                    var i = 0;
                    t = buffer.length;
                    while (i < t) {
                        start = buffer.start(i) / audio.duration;
                        end = buffer.end(i) / audio.duration;
                        maxBuffer = Math.max(maxBuffer, end);
                        i++;
                    }
                }
                return maxBuffer;
            }

            function onLoadStart(e) {
                // console.log ('dsAudio.onLoadStart', currentItem);
                // currentItem.onLoad();
                onState();
            }

            function onLoadProgress(e) {
                // console.log ('dsAudio.onLoadProgress', currentItem);
                // currentItem.buffer = Buffer(e);
                // currentItem.onLoadProgress();
                onState();
            }

            function onPlayProgress(e) {
                // console.log ('dsAudio.onPlayProgress');
                currentItem.duration = audio.duration;
                currentItem.progress = audio.currentTime;
                // currentItem.onPlayProgress();
                onState();
            }

            function onAudioCanPlay(e) {
                currentItem.duration = audio.duration || currentItem.duration;
                currentItem.canplay = true;
                // currentItem.onReady();
                if (!currentItem.playing) {
                    // console.log ('dsAudio.onAudioCanPlay', currentItem.progress);
                    audio.currentTime = currentItem.progress;
                    audio.play();
                }
                /*
                if (currentItem.action) {
                    currentItem.action();
                    currentItem.action = null;
                }
                */
                onState();
            }

            function onAudioCanThrough(e) {
                // console.log ('dsAudio.onAudioCanThrough', currentItem.progress);
                currentItem.canplay = currentItem.canplaythrough = true;
                // currentItem.onLoadComplete();
                onState();
            }

            function onAudioEnded(e) {
                // console.log ('dsAudio.onAudioEnded', currentItem);
                currentItem.playing = false;
                currentItem.paused = true;
                currentItem.buffering = false;
                playing = false;
                // currentItem.onEnded();
                onState();
            }

            function onAudioError(e) {
                // console.log('dsAudio.onAudioError', currentItem);
                currentItem.playing = false;
                currentItem.paused = true;
                currentItem.buffering = false;
                // currentItem.onError();
                onState();
            }

            function onSourceError(e) {
                // console.log ('dsAudio.onSourceError', currentItem);
                currentItem.playing = false;
                currentItem.paused = true;
                currentItem.buffering = false;
                // currentItem.onError();
                onState();
            }

            function onAudioPlay(e) {
                // console.log ('dsAudio.onAudioPlay', currentItem);
                currentItem.playing = true;
                currentItem.paused = false;
                currentItem.buffering = false;
                // currentItem.onState();
                onState();
            }

            function onAudioPause(e) {
                // console.log ('dsAudio.onAudioPause', currentItem);
                currentItem.playing = false;
                currentItem.paused = true;
                currentItem.buffering = false;
                // currentItem.onState();
                onState();
            }

            function onAudioWaiting(e) {
                // console.log ('dsAudio.onAudioWaiting', currentItem);
                currentItem.playing = false;
                currentItem.paused = true;
                currentItem.buffering = true;
                // currentItem.onState();
                onState();
            }

            function onAudioSeeked(e) {
                // console.log ('dsAudio.onAudioWaiting', currentItem);
                // currentItem.onState();
                onState();
            }
        }
    };
}]);
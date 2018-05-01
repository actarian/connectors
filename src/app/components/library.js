/* global angular, window, document, console, TweenLite */

(function () {
    'use strict';

    var Library = function () {

        var DEBUG = {
            FINISHES: ['standard', 'black', 'weathered'],
            randomFinish: function () {
                // return DEBUG.FINISHES[2];
                return {
                    key: DEBUG.FINISHES[Math.floor(Math.random() * DEBUG.FINISHES.length)],
                    color: null
                };
            },
            randomSecondaryFinish: function () {
                // return DEBUG.FINISHES[2];
                return {
                    key: DEBUG.FINISHES[Math.floor(Math.random() * DEBUG.FINISHES.length)],
                    color: null
                };
            }
        };

        var BASE = 'img/textures/';
        var ANISOTROPY = 1;
        var USE_PHONG = false;

        function Library(renderer) {
            ANISOTROPY = renderer.capabilities.getMaxAnisotropy();
            this.replaceShader();
            var manager = new THREE.LoadingManager();
            /*
            manager.onProgress = function (item, loaded, total) {
                console.log('Library.manager.onProgress', item, loaded, total);
            };
            */
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
            setFinish: setFinish,
            setNextFloor: setNextFloor,
            updateMaterials: updateMaterials,
        };

        // statics
        Library.hexToRgb = hexToRgb;
        Library.FLOOR = 0;

        function getMaterials() {
            var service = this,
                manager = this.manager,
                loader = this.loader,
                textures = this.textures;

            var materials = {
                left: new THREE.MeshPhongMaterial({
                    name: 'left',
                    color: new THREE.Color(0xff0000),
                    visible: false,
                }),
                right: new THREE.MeshPhongMaterial({
                    name: 'right',
                    color: new THREE.Color(0x00ff00),
                    visible: false,
                }),
                top: new THREE.MeshPhongMaterial({
                    name: 'top',
                    color: new THREE.Color(0x0000ff),
                    visible: false,
                }),
                bottom: new THREE.MeshPhongMaterial({
                    name: 'bottom',
                    color: new THREE.Color(0xffff00),
                    visible: false,
                }),
                floor: new THREE.MeshStandardMaterial({
                    name: 'floor',
                    color: 0x101010, // 0xaeb7c1, // 0x101010,
                    roughness: 0.5, // 0.4,
                    metalness: 0.1, // 0.99,
                    bumpMap: textures.floor,
                    bumpScale: 0.05,
                    envMap: textures.env,
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
                    // metal: true,
                }),
                bronze: new THREE.MeshStandardMaterial({
                    name: 'bronze',
                    color: 0xc07f5d,
                    roughness: 0.5,
                    roughnessMap: textures.silver,
                    metalness: 0.9,
                    metalnessMap: textures.weathered,
                    envMap: textures.env,
                    envMapIntensity: 0.15,
                    // bumpMap: textures.silver,
                    // bumpScale: 0.003,
                }),
                gold: new THREE.MeshStandardMaterial({
                    name: 'gold',
                    color: 0xc8ad60,
                    roughness: 0.5,
                    roughnessMap: textures.silver,
                    metalness: 0.9,
                    metalnessMap: textures.weathered,
                    envMap: textures.env,
                    envMapIntensity: 0.15,
                    // bumpMap: textures.silver,
                    // bumpScale: 0.003,
                }),
                green: new THREE.MeshPhongMaterial({
                    name: 'green',
                    color: 0x00aa00,
                    specular: 0x333333,
                    specularMap: textures.silver,
                    shininess: 30,
                    reflectivity: 0.10,
                    envMap: textures.env,
                    // combine: THREE.MixOperation,
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
                    bumpMap: textures.silver,
                    bumpScale: 0.003,
                    // metal: true,
                }),
                standard: {
                    silver: new THREE.MeshStandardMaterial({
                        name: 'silver',
                        color: 0x888888,
                        roughness: 0.4,
                        // roughnessMap: textures.brushed,
                        metalness: 0.99,
                        metalnessMap: textures.brushed,
                        envMap: textures.env,
                        envMapIntensity: 1.0,
                        bumpMap: textures.brushed,
                        bumpScale: 0.01,
                    }),
                    black: new THREE.MeshStandardMaterial({
                        name: 'black',
                        color: 0x101010,
                        roughness: 0.5,
                        // roughnessMap: textures.sand,
                        metalness: 0.99,
                        metalnessMap: textures.sand,
                        envMap: textures.env,
                        envMapIntensity: 1.0,
                        bumpMap: textures.sand,
                        bumpScale: 0.015,
                    }),
                },
                weathered: {
                    silver: getWeatheredNode('silver', textures),
                    black: getWeatheredNode('black', textures),
                    _silver: new THREE.MeshStandardMaterial({
                        name: 'silver',
                        color: 0x555555,
                        map: textures.brushed,
                        roughness: 0.6,
                        roughnessMap: textures.weatheredInverted,
                        metalness: 0.99,
                        // metalnessMap: textures.weathered,
                        envMap: textures.env,
                        envMapIntensity: 1.0,
                        // bumpMap: textures.sand,
                        // bumpScale: 0.01,
                    }),
                    _black: new THREE.MeshStandardMaterial({
                        name: 'black',
                        color: 0x444444,
                        map: textures.brushed,
                        roughness: 0.6,
                        roughnessMap: textures.weatheredInverted,
                        metalness: 0.99,
                        // metalnessMap: textures.weathered,
                        envMap: textures.env,
                        envMapIntensity: 1.0,
                        // bumpMap: textures.sand,
                        // bumpScale: 0.01,
                    }),
                },
                black: {
                    silver: new THREE.MeshStandardMaterial({
                        name: 'silver',
                        color: 0x131313,
                        roughness: 0.5,
                        // roughnessMap: textures.sand,
                        metalness: 0.99,
                        metalnessMap: textures.sand,
                        envMap: textures.env,
                        envMapIntensity: 1.0,
                        bumpMap: textures.sand,
                        bumpScale: 0.015,
                    }),
                    black: new THREE.MeshStandardMaterial({
                        name: 'black',
                        color: 0x101010,
                        roughness: 0.5,
                        // roughnessMap: textures.sand,
                        metalness: 0.99,
                        metalnessMap: textures.sand,
                        envMap: textures.env,
                        envMapIntensity: 1.0,
                        bumpMap: textures.sand,
                        bumpScale: 0.015,
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
            return materials;
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
            /*
            textures.weathered = service.getTexture('brushed-dark.jpg');
            textures.weathered.anisotropy = ANISOTROPY;
            // textures.weathered.wrapS = THREE.RepeatWrapping;
            textures.weathered.wrapT = THREE.RepeatWrapping;
            // textures.weathered.repeat.set(1, 1);
            */
            // 
            // textures.weathered = service.getTexture('brushed-dark.jpg');
            textures.weathered = service.getTexture('weathered-512-tile.jpg');
            // textures.weathered = service.getTexture('weathered-tile-sm.jpg');
            textures.weathered.anisotropy = ANISOTROPY;
            textures.weathered.wrapS = THREE.RepeatWrapping;
            textures.weathered.wrapT = THREE.RepeatWrapping;
            textures.weathered.repeat.set(2, 8);
            //
            textures.weatheredInverted = service.getTexture('weathered-512-inverted.jpg');
            textures.weatheredInverted.anisotropy = ANISOTROPY;
            textures.weatheredInverted.wrapS = THREE.RepeatWrapping;
            textures.weatheredInverted.wrapT = THREE.RepeatWrapping;
            textures.weatheredInverted.repeat.set(2, 8);
            //
            textures.sand = service.getTexture('sand.bump.jpg');
            textures.sand.anisotropy = ANISOTROPY;
            textures.sand.wrapS = THREE.RepeatWrapping;
            textures.sand.wrapT = THREE.RepeatWrapping;
            textures.sand.repeat.set(2, 6);
            //
            textures.brushed = service.getTexture('brushed-512-tile.jpg');
            textures.brushed.anisotropy = ANISOTROPY;
            textures.brushed.wrapS = THREE.RepeatWrapping;
            textures.brushed.wrapT = THREE.RepeatWrapping;
            textures.brushed.repeat.set(2, 2);
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

        function setFinish(materials, finish) {
            finish = finish || DEBUG.randomFinish();
            materials = materials.length ? materials : [materials];
            console.log('library.setFinish', materials, finish);
            var library = this;
            return materials.map(function (material, index) {
                switch (material.name) {
                    case 'silver':
                    case 'black':
                        material = library.materials[finish.key][material.name];
                        break;
                }
                return material;
            });
        }

        function setSecondaryFinish(materials, finish) {
            finish = finish || DEBUG.randomSecondaryFinish();
            materials = materials.length ? materials : [materials];
            console.log('library.setSecondaryFinish', materials, finish);
            var library = this,
                textures = this.textures,
                key, color, map;
            return materials.map(function (material, index) {
                switch (material.name) {
                    case 'wrap':
                        key = finish.key;
                        color = finish.color;
                        material = library.materials.wrap.clone();
                        if (key.indexOf('Leather') != -1) {
                            map = 'leather';
                        } else if (key.indexOf('Reptile') != -1) {
                            map = 'reptile';
                        } else if (key.indexOf('Stingray') != -1) {
                            map = 'stingray';
                        }
                        color = Library.hexToRgb(color);
                        material.color.r = color.r / 255;
                        material.color.g = color.g / 255;
                        material.color.b = color.b / 255;
                        material.specularMap = textures[map + 'Light'];
                        material.bumpMap = textures[map + 'Bump'];
                        break;
                }
                return material;
            });
        }

        function colorTween(from, hex) {
            var fromColor = new THREE.Color(from.color.getHex());
            var color = new THREE.Color(hex);
            TweenLite.to(fromColor, 0.4, {
                r: color.r,
                g: color.g,
                b: color.b,
                onUpdate: function () {
                    from.color = fromColor;
                }
            });
        }

        function materialTween(from, to, callback) {
            var options = {
                onComplete: function () {
                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            };
            for (var p in to) {
                if (p === 'color') {
                    colorTween(from, to[p]);
                } else {
                    options[p] = to[p];
                }
            }
            TweenLite.to(from, 0.4, options);
        }

        function setNextFloor() {
            var service = this,
                materials = this.materials,
                floor = this.materials.floor;
            Library.FLOOR = (Library.FLOOR + 1) % 4;
            var to = {};
            switch (Library.FLOOR) {
                case 0:
                    to.color = 0x101010;
                    to.roughness = 0.5;
                    to.metalness = 0.1;
                    to.bumpScale = 0.05;
                    break;
                case 1:
                    to.color = 0xaeb7c1;
                    to.roughness = 0.5;
                    to.metalness = 0.1;
                    to.bumpScale = 0.05;
                    break;
                case 2:
                    to.color = 0x101010;
                    to.roughness = 0.5;
                    to.metalness = 0.1;
                    to.bumpScale = 0.0001;
                    break;
                case 3:
                    to.color = 0xaeb7c1;
                    to.roughness = 0.5;
                    to.metalness = 0.1;
                    to.bumpScale = 0.0001;
                    break;
            }
            console.log('library.setNextFloor', Library.FLOOR);
            materialTween(floor, to, function () {
                console.log('materialTween.completed');
            });
            // floor.needsUpdate = true;
        }

        function updateMaterials(materials, finish, secondaryFinish) {
            finish = finish || DEBUG.randomFinish();
            var library = this,
                textures = this.textures,
                key, color, map;
            return materials.map(function (material, index) {
                material.name = material.name.replace('chrome', 'silver');
                switch (material.name) {
                    case 'silver':
                    case 'black':
                        key = finish.key;
                        material = library.materials[key][material.name];
                        break;
                    case 'wrap':
                        key = secondaryFinish.key;
                        color = secondaryFinish.color;
                        material = library.materials.wrap.clone();
                        if (key.indexOf('Leather') != -1) {
                            map = 'leather';
                        } else if (key.indexOf('Reptile') != -1) {
                            map = 'reptile';
                        } else if (key.indexOf('Stingray') != -1) {
                            map = 'stingray';
                        }
                        color = Library.hexToRgb(color);
                        material.color.r = color.r / 255;
                        material.color.g = color.g / 255;
                        material.color.b = color.b / 255;
                        material.specularMap = textures[map + 'Light'];
                        material.bumpMap = textures[map + 'Bump'];
                        break;
                    case 'bronze':
                    case 'gold':
                    case 'red':
                    case 'green':
                    case 'left':
                    case 'right':
                    case 'top':
                    case 'bottom':
                        material = library.materials[material.name];
                        break;
                }
                return material;
            });
            /*
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
            */
        }

        function updateLedMaterials(receivers, led) {
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

        function hexToRgb(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }

        function getWeatheredNode(name, textures) {
            var material = new THREE.StandardNodeMaterial();
            // material.color = // albedo (vec3)
            // material.alpha = // opacity (float)
            // material.roughness = // roughness (float)
            // material.metalness = // metalness (float)
            // material.normal = // normalmap (vec3)
            // material.normalScale = // normalmap scale (vec2)
            // material.emissive = // emissive color (vec3)
            // material.ambient = // ambient color (vec3)
            // material.shadow = // shadowmap (vec3)
            // material.light = // custom-light (vec3)
            // material.ao = // ambient occlusion (float)
            // material.environment = // reflection/refraction (vec3)
            // material.transform = // vertex transformation (vec3)
            var curvature = new THREE.AttributeNode('curvature', 'float');
            var brushed = new THREE.TextureNode(textures.brushed);
            var brushedInvert = new THREE.Math1Node(brushed, THREE.Math1Node.INVERT);
            var brushedInvertDark = new THREE.Math3Node(
                brushedInvert,
                new THREE.ColorNode(0x111111),
                new THREE.FloatNode(0.8),
                THREE.Math3Node.MUL
            );
            var colorA = new THREE.ColorNode(0x111111);
            var colorB = new THREE.ColorNode(0x666666); // new THREE.TextureNode(textures.brushed);
            // var colorB = new THREE.ColorNode(0xffffff);
            var color = new THREE.Math3Node(
                brushed,
                brushedInvertDark,
                curvature,
                THREE.Math3Node.MIX
            );
            material.color = color;
            //
            var roughnessA = new THREE.FloatNode(0.6);
            var roughnessB = new THREE.FloatNode(0.5);
            var roughness = new THREE.Math3Node(
                roughnessA,
                roughnessB,
                curvature,
                THREE.Math3Node.MIX
            );
            material.roughness = roughness;
            material.metalness = new THREE.FloatNode(0.8);
            /*
            material.normal = new THREE.TextureNode(textures.brushed);
            material.normalScale = normalMask;
            */
            // var roughnessA = new THREE.TextureNode(textures.weatheredInverted);
            /*
            var metalnessA = new THREE.FloatNode(0.3);
            var metalnessB = new THREE.FloatNode(0.5);
            var metalness = new THREE.Math3Node(
                metalnessA,
                metalnessB,
                curvature,
                THREE.Math3Node.MIX
            );
            material.metalness = metalness;
            */
            // var environment = new THREE.CubeTextureNode(textures.env);
            /*
            var environment = new THREE.Math3Node(
                new THREE.ColorNode(0x040404),
                new THREE.CubeTextureNode(textures.env),
                curvature,
                THREE.Math3Node.MIX
            );
            material.environment = environment;
            */
            /*
            var environmentAlpha = new THREE.OperatorNode(
                curvature,
                new THREE.FloatNode(0.1),
                THREE.OperatorNode.MUL
            );
            material.environmentAlpha = environmentAlpha;
            */
            // material.environment = textures.env;
            /*
            addGui('color', material.color.value.getHex(), function (val) {
                material.color.value.setHex(val);
            }, true);
            addGui('roughnessA', roughnessA.number, function (val) {
                roughnessA.number = val;
            }, false, 0, 1);
            */
            material.name = name;
            material.build();
            return material;
        }

        return Library;

    }();

    window.Library = Library;

    var app = angular.module('app');

    app.factory('Library', [function () {
        return Library;
    }]);

}());
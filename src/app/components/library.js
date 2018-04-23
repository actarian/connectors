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
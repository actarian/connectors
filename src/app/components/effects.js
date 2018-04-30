/* global angular, window, document, console, TweenLite */

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

    var app = angular.module('app');

    app.factory('Effects', [function () {
        return Effects;
    }]);

}());
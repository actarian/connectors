/* global angular, window, document, console, TweenLite */

(function () {
    'use strict';

    function calcNormal(normals, normal, angle) {
        var allowed = normals.filter(function (n) {
            return n.angleTo(normal) < angle * THREE.Math.DEG2RAD;
        });
        return allowed.reduce(function (a, b) {
            return a.clone().add(b);
        }).normalize();
    }

    function ThreeUtils() {

        THREE.GeometryUtils.computeVertexNormals = function (geometry, angle) {
            geometry.computeFaceNormals();
            var vertices = geometry.vertices.map(function () {
                return [];
            });
            geometry.faces.map(function (face) {
                vertices[face.a].push(face.normal);
                vertices[face.b].push(face.normal);
                vertices[face.c].push(face.normal);
            });
            geometry.faces.map(function (face) {
                face.vertexNormals[0] = calcNormal(vertices[face.a], face.normal, angle);
                face.vertexNormals[1] = calcNormal(vertices[face.b], face.normal, angle);
                face.vertexNormals[2] = calcNormal(vertices[face.c], face.normal, angle);
            });
            if (geometry.faces.length > 0) geometry.normalsNeedUpdate = true;
        };

        THREE.FaceUtils = {
            computeCentroid: function (face, vertices) {
                var centroid = new THREE.Vector3();
                centroid.add(vertices[face.a]);
                centroid.add(vertices[face.b]);
                centroid.add(vertices[face.c]);
                centroid.divideScalar(3);
                return centroid;
            }
        };

    }

    // ThreeUtils();

    var app = angular.module('app');

    app.service('ThreeUtils', [ThreeUtils]);

}());
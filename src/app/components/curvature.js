/* global angular, window, document, console, TweenLite */

(function () {
    'use strict';

    var Curvature = function () {

        function Curvature() {

        }

        // statics
        Curvature.setGeometry = setGeometry;
        Curvature.setEdges = setEdges;

        function setGeometry(geometry) {
            // geometry.center();
            var i, positions, normals, px, py, pz, nx, ny, nz, sx, sy, sz, pyx, pyz, pzx, nyx, nyz, nzx, yx, yz, zx, xy, zy, xz;
            var dict = {};
            positions = geometry.attributes.position.array;
            normals = geometry.attributes.normal.array;
            for (i = 0; i < geometry.attributes.position.count; i += 3) {
                px = new THREE.Vector3(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]);
                py = new THREE.Vector3(positions[3 * (i + 1)], positions[3 * (i + 1) + 1], positions[3 * (i + 1) + 2]);
                pz = new THREE.Vector3(positions[3 * (i + 2)], positions[3 * (i + 2) + 1], positions[3 * (i + 2) + 2]);
                nx = new THREE.Vector3(normals[3 * i], normals[3 * i + 1], normals[3 * i + 2]).normalize();
                ny = new THREE.Vector3(normals[3 * (i + 1)], normals[3 * (i + 1) + 1], normals[3 * (i + 1) + 2]).normalize();
                nz = new THREE.Vector3(normals[3 * (i + 2)], normals[3 * (i + 2) + 1], normals[3 * (i + 2) + 2]).normalize();
                sx = px.toArray().toString();
                sy = py.toArray().toString();
                sz = pz.toArray().toString();
                pyx = new THREE.Vector3().subVectors(py, px);
                pyz = new THREE.Vector3().subVectors(py, pz);
                pzx = new THREE.Vector3().subVectors(pz, px);
                nyx = new THREE.Vector3().subVectors(ny, nx);
                nyz = new THREE.Vector3().subVectors(ny, nz);
                nzx = new THREE.Vector3().subVectors(nz, nx);
                yx = ny.dot(pyx.normalize());
                yz = ny.dot(pyz.normalize());
                zx = nz.dot(pzx.normalize());
                xy = -nx.dot(pyx.normalize());
                zy = -nz.dot(pyz.normalize());
                xz = -nx.dot(pzx.normalize());
                dict[sx] = dict[sx] || {};
                dict[sx][sy] = xy;
                dict[sx][sz] = xz;
                dict[sy] = dict[sy] || {};
                dict[sy][sx] = yx;
                dict[sy][sz] = yz;
                dict[sz] = dict[sz] || {};
                dict[sz][sx] = zx;
                dict[sz][sy] = zy;
            }

            var curvatures = {};
            var min = 1000,
                max = 0;

            Object.keys(dict).forEach(function (key) {
                curvatures[key] = average(dict[key]);
            });

            /*
            var smoothed = Object.create(curvatures);
            Object.keys(dict).forEach(function (key) {
                var count = 0;
                var sum = 0;
                Object.keys(dict[key]).forEach(function (key2) {
                    sum += smoothed[key2];
                    count++;
                });
                smoothed[key] = sum / count;
            });
            curvatures = smoothed;
            */

            Object.keys(curvatures).forEach(function (key) {
                var val = Math.abs(curvatures[key]);
                if (val < min) min = val;
                if (val > max) max = val;
            });

            var range = (max - min);
            console.log('range', range);

            Object.keys(curvatures).forEach(function (key) {
                var val = Math.abs(curvatures[key]);
                if (curvatures[key] < 0) {
                    curvatures[key] = (min - val) / range;
                } else {
                    curvatures[key] = (val - min) / range;
                }
            });

            var attribute = new Float32Array(geometry.attributes.position.count);

            var p, s, f;
            for (i = 0; i < geometry.attributes.position.count; i++) {
                positions = geometry.attributes.position.array;
                p = new THREE.Vector3(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]);
                s = p.toArray().toString();
                f = curvatures[s];
                f = THREE.Math.clamp(THREE.Math.smoothstep(f, 0.0, 1.0) * 2.0, 0.0, 1.0);
                attribute[i] = f;
            }

            geometry.addAttribute('curvature', new THREE.BufferAttribute(attribute, 1));
        }

        function setEdges(geometry, angleThresold) {
            angleThresold = angleThresold || 50;

            var faces = geometry.faces,
                vertices = geometry.vertices,
                face, centroid;
            geometry = new THREE.BufferGeometry().fromGeometry(geometry);
            var dEdge = {},
                edge, key, i, ia, ib, ic, va, vb, vc, pa, pb, pc, sa, sb, sc, na, nb, nc, ma, mb,
                dot, cross, angle;
            var positions = geometry.attributes.position.array;
            var normals = geometry.attributes.normal.array;
            var colors = geometry.attributes.color.array;

            function addKey(ia, ib, sa, sb, pa, pb, cc) {
                ma = Math.min(ia, ib); // minimun vertex index
                mb = Math.max(ia, ib); // maximum vertex index
                key = ma + '-' + mb;
                if (dEdge[key] === undefined) {
                    dEdge[key] = {
                        sa: sa, // string key vertex a
                        sb: sb, // string key vertex b
                        na: pa, // index normal a
                        ca: cc, // centroid face a
                    };
                } else {
                    dEdge[key].nb = pb; // index normal b
                    dEdge[key].cb = cc; // centroid face b
                }
            }

            var dVert = {},
                hVert = {};

            for (var f = 0; f < faces.length; f++) {
                face = faces[f];
                centroid = THREE.FaceUtils.computeCentroid(face, vertices);
                // vertex indices
                ia = face.a;
                ib = face.b;
                ic = face.c;
                // normals
                na = new THREE.Vector3(normals[9 * f], normals[9 * f + 1], normals[9 * f + 2]);
                nb = new THREE.Vector3(normals[9 * f + 3], normals[9 * f + 3 + 1], normals[9 * f + 3 + 2]);
                nc = new THREE.Vector3(normals[9 * f + 6], normals[9 * f + 6 + 1], normals[9 * f + 6 + 2]);
                // dVert keys
                sa = [positions[9 * f], positions[9 * f + 1], positions[9 * f + 2]].toString();
                sb = [positions[9 * f + 3], positions[9 * f + 3 + 1], positions[9 * f + 3 + 2]].toString();
                sc = [positions[9 * f + 6], positions[9 * f + 6 + 1], positions[9 * f + 6 + 2]].toString();
                //
                dVert[sa] = hVert[sa] = 0;
                dVert[sb] = hVert[sb] = 0;
                dVert[sc] = hVert[sc] = 0;
                // dEdge keys
                addKey(ia, ib, sa, sb, na, nb, centroid); // key edge a-b
                addKey(ib, ic, sb, sc, nb, nc, centroid); // key edge b-c
                addKey(ic, ia, sc, sa, nc, na, centroid); // key edge c-a
            }

            var curvatures = new Array(geometry.attributes.position.count).fill(0.01);
            var hits = new Array(geometry.attributes.position.count).fill(1);
            var edges = Object.keys(dEdge);
            var matches = 0;

            for (key in dEdge) {
                edge = dEdge[key];
                var ab, ac;
                if (edge.nb) {
                    sa = edge.sa;
                    sb = edge.sb;
                    na = edge.na;
                    nb = edge.nb;
                    nc = new THREE.Vector3().subVectors(edge.cb, edge.ca).normalize();
                    var ab = Math.acos(THREE.Math.clamp(na.dot(nb), -1, 1));
                    ab *= THREE.Math.RAD2DEG;
                    var ac = na.dot(nc);
                    // console.log(ac);
                    if (ac <= 0) {
                        ab += 180;
                        // ab = (350 - ab);
                    }
                    // ab = (ab + 180) % 360;
                    // console.log(ac);
                    // console.log('ab', ab);
                    // console.log('ac', ac);
                    /*
                    if (ab < 180) {
                        ab = 0;
                    }
                    */
                    // ab -= 180;
                    if (ab > 0) {
                        matches++;
                    }
                    // console.log(ab);
                    ab /= 180;
                    dVert[sa] += ab;
                    dVert[sb] += ab;
                    hVert[sa]++;
                    hVert[sb]++;
                }
            }
            for (var p in dVert) {
                var hits = hVert[p];
                if (hits > 0) {
                    dVert[p] /= hVert[p];
                }
            }
            for (i = 0; i < curvatures.length; i++) {
                va = new THREE.Vector3(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]);
                sa = va.toArray().toString();
                curvatures[i] = dVert[sa];
                colors[3 * i] = curvatures[i];
                colors[3 * i + 1] = 0.3;
                colors[3 * i + 2] = 0.2;
            }
            curvatures = new Float32Array(curvatures);
            geometry.addAttribute('curvature', new THREE.BufferAttribute(curvatures, 1));
            console.log('faces', faces.length, 'vertex', geometry.attributes.position.count);
            console.log('edges', edges.length, 'matches', matches, (matches / edges.length * 100).toFixed(2) + '%', 'angle', angleThresold + '°');
            return geometry;
        }

        function setEdges1(geometry, minThresholdAngle, maxThresholdAngle) {
            var min = minThresholdAngle || 265,
                max = maxThresholdAngle || 275;
            /*
            var convexMinDot = Math.cos(THREE.Math.DEG2RAD * (minThresholdAngle || 265));
            var convexMaxDot = Math.cos(THREE.Math.DEG2RAD * (maxThresholdAngle || 275));
            var convexMinDotNeg = Math.cos(THREE.Math.DEG2RAD * (minThresholdAngle || 265) - 180);
            var convexMaxDotNeg = Math.cos(THREE.Math.DEG2RAD * (maxThresholdAngle || 275) - 180);
            */

            var faces = geometry.faces,
                vertices = geometry.vertices,
                face, vert;
            geometry = new THREE.BufferGeometry().fromGeometry(geometry);
            var dEdge = {},
                edge, key, i, ia, ib, ic, va, vb, vc, pa, pb, pc, sa, sb, sc, na, nb, nc, ma, mb,
                dot, cross, angle;
            var positions = geometry.attributes.position.array;
            var normals = geometry.attributes.normal.array;

            function addKey(ia, ib, sa, sb, pa, pb, i) {
                ma = Math.min(ia, ib); // minimun vertex index
                mb = Math.max(ia, ib); // maximum vertex index
                key = ma + '-' + mb;
                if (dEdge[key] === undefined) {
                    dEdge[key] = {
                        sa: sa, // string key vertex a
                        sb: sb, // string key vertex b
                        na: pa, // index normal a
                        fa: i, // index face a
                        fb: undefined
                    };
                } else {
                    dEdge[key].nb = pa; // index normal b (pa or pb should be indifferently)
                    dEdge[key].fb = i; // index face b
                }
            }

            for (var f = 0; f < faces.length; f++) {
                face = faces[f];
                // vertex indices
                ia = face.a;
                ib = face.b;
                ic = face.c;
                // vertices
                va = vertices[ia];
                vb = vertices[ib];
                vc = vertices[ic];
                // dVert keys
                sa = va.toArray().toString();
                sb = vb.toArray().toString();
                sc = vc.toArray().toString();
                i = f * 9; // position face index                
                pa = i; // position vert a index
                pb = i + 3; // position vert b index
                pc = i + 6; // position vert c index
                // dEdge keys
                addKey(ia, ib, sa, sb, pa, pb, i); // key edge a-b
                addKey(ib, ic, sb, sc, pb, pc, i); // key edge b-c
                addKey(ic, ia, sc, sa, pc, pa, i); // key edge c-a
            }

            var curvatures = new Array(geometry.attributes.position.count).fill(0.0);
            curvatures = new Float32Array(curvatures);

            var edges = Object.keys(dEdge);
            var matches = 0;

            var dVert = {};

            for (key in dEdge) {
                edge = dEdge[key];
                if (edge.nb) {
                    na = edge.na;
                    nb = edge.nb;
                    va = new THREE.Vector3(normals[na], normals[na + 1], normals[na + 2]);
                    vb = new THREE.Vector3(normals[nb], normals[nb + 1], normals[nb + 2]);
                    dot = va.dot(vb);
                    angle = Math.acos(dot) * THREE.Math.RAD2DEG;
                    cross = new THREE.Vector3().crossVectors(va, vb);
                    if (cross.x < 0 || cross.y < 0 || cross.z < 0) {
                        angle += 180;
                    }
                    if (angle >= min && angle <= max) {
                        sa = edge.sa;
                        sb = edge.sb;
                        dVert[sa] = dot;
                        dVert[sb] = dot;
                    }
                }
            }
            // apply curvature
            for (i = 0; i < curvatures.length; i++) {
                va = new THREE.Vector3(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]);
                sa = va.toArray().toString();
                curvatures[i] = dVert[sa];
            }
            geometry.addAttribute('curvature', new THREE.BufferAttribute(curvatures, 1));
            console.log('faces', faces.length, 'vertex', geometry.attributes.position.count);
            console.log('edges', edges.length, 'matches', matches, (matches / edges.length * 100).toFixed(2) + '%');

            // faces 13754 vertex 41262
            // edges 20368 matches 0 0.00%
            return geometry;
        }

        function setEdges2(geometry, thresholdAngle) {
            thresholdAngle = thresholdAngle || 90;
            var thresholdDot = Math.cos(THREE.Math.DEG2RAD * thresholdAngle);

            var faces = geometry.faces,
                face;
            geometry = new THREE.BufferGeometry().fromGeometry(geometry);
            var dEdge = {},
                edge, key, ea, eb, i, ia, ib, ic, va, vb, vc, na, nb, nc;
            // var positions = geometry.attributes.position.array;
            var normals = geometry.attributes.normal.array;

            function addKey(va, vb, ia, ib, i) {
                ea = Math.min(va, vb);
                eb = Math.max(va, vb);
                key = ea + '-' + eb;
                if (dEdge[key] === undefined) {
                    dEdge[key] = {
                        a: ia,
                        b: ib,
                        c: ia,
                        d: ib,
                        fa: i,
                        fb: undefined
                    };
                } else {
                    dEdge[key].fb = i;
                    dEdge[key].c = ia;
                    dEdge[key].d = ib;
                }
            }
            for (var f = 0; f < faces.length; f++) {
                face = faces[f];
                i = f * 9;
                va = face.a;
                vb = face.b;
                vc = face.c;
                ia = i;
                ib = i + 3;
                ic = i + 6;
                addKey(va, vb, ia, ib, i);
                addKey(vb, vc, ib, ic, i);
                addKey(vc, va, ic, ia, i);
            }

            var attribute = new Float32Array(geometry.attributes.position.count);
            for (i = 0; i < geometry.attributes.position.count; i++) {
                attribute[i] = 1.0;
            }
            var edges = Object.keys(dEdge);
            console.log(edges.length);
            var matches = 0;

            function fillEdge(e) {
                attribute[e.a / 3] = 0.0;
                attribute[e.b / 3] = 0.0;
                attribute[e.c / 3] = 0.0;
                attribute[e.d / 3] = 0.0;
                matches++;
            }
            for (key in dEdge) {
                edge = dEdge[key];
                if (edge.fb === undefined) {
                    fillEdge(edge);
                } else {
                    ia = edge.fa;
                    ib = edge.fb;
                    na = new THREE.Vector3(normals[ia], normals[ia + 1], normals[ia + 2]);
                    nb = new THREE.Vector3(normals[ib], normals[ib + 1], normals[ib + 2]);
                    if (na.dot(nb) <= thresholdDot) {
                        fillEdge(edge);
                    }
                }
            }
            geometry.addAttribute('curvature', new THREE.BufferAttribute(attribute, 1));
            console.log('matches', matches, (matches / edges.length * 100).toFixed(2));
            return geometry;
        }

        function setEdges3(geometry, thresholdAngle) {
            thresholdAngle = thresholdAngle || 90;
            var thresholdDot = Math.cos(THREE.Math.DEG2RAD * thresholdAngle);
            var edge = [0, 0],
                dEdge = {},
                edge1, edge2;
            var key, keys = ['a', 'b', 'c'];
            /*
            var geometry2;
            if (geometry.isBufferGeometry) {
                geometry2 = new THREE.Geometry();
                geometry2.fromBufferGeometry(geometry);
            } else {
                geometry2 = geometry.clone();
            }
            */
            // geometry2.mergeVertices();
            // geometry2.computeFaceNormals();
            var faces = geometry.faces;
            // now create a data structure where each entry represents an edge with its adjoining faces
            for (var i = 0; i < faces.length; i++) {
                var face = faces[i];
                for (var j = 0; j < 3; j++) {
                    edge1 = face[keys[j]];
                    edge2 = face[keys[(j + 1) % 3]];
                    edge[0] = Math.min(edge1, edge2);
                    edge[1] = Math.max(edge1, edge2);
                    key = edge[0] + ',' + edge[1];
                    if (dEdge[key] === undefined) {
                        dEdge[key] = {
                            a: edge[0],
                            b: edge[1],
                            fa: i,
                            fb: undefined
                        };
                    } else {
                        dEdge[key].fb = i;
                    }
                }
            }
            var vertices = geometry.vertices;
            var attribute = new Float32Array(vertices.length * 3);
            for (var i = 0; i < vertices.length * 3; i++) {
                attribute[i] = 1.0;
            }
            var edges = Object.keys(dEdge);
            console.log(edges.length);
            var matches = 0;
            for (key in dEdge) {
                var e = dEdge[key];
                // an edge is only rendered if the angle (in degrees) between the face normals of the adjoining faces exceeds this value. default = 1 degree.
                if (e.fb === undefined || faces[e.fa].normal.dot(faces[e.fb].normal) <= thresholdDot) {
                    /*
                    var vertex = vertices[e.a];
                    vertices.push(vertex.x, vertex.y, vertex.z);
                    vertex = vertices[e.b];
                    vertices.push(vertex.x, vertex.y, vertex.z);
                    */
                    attribute[e.a * 3] = 0.0;
                    attribute[e.a * 3 + 1] = 0.0;
                    attribute[e.a * 3 + 2] = 0.0;
                    attribute[e.b * 3] = 0.0;
                    attribute[e.b * 3 + 1] = 0.0;
                    attribute[e.b * 3 + 2] = 0.0;
                    matches++;
                }
            }
            console.log(geometry.normals.length);
            console.log('matches', matches, (matches / edges.length * 100).toFixed(2));
            geometry = new THREE.BufferGeometry().fromDirectGeometry(geometry);
            geometry.addAttribute('curvature', new THREE.BufferAttribute(attribute, 1));
            console.log('verts', vertices.length, geometry.attributes.position.count);
            // build geometry
            // this.addAttribute('position', new Float32BufferAttribute(vertices, 3));
            return geometry;
        }

        function average(dict) {
            var sum = 0;
            var length = 0;
            Object.keys(dict).forEach(function (key) {
                sum += dict[key];
                length++;
            });
            return sum / length;
        }

        function filterConcave(curvature) {
            for (var i = 0; i < curvature.length; i++) {
                curvature[i] = Math.abs(THREE.Math.clamp(curvature[i], -1, 0));
            }
        }

        function filterConvex(curvature) {
            for (var i = 0; i < curvature.length; i++) {
                curvature[i] = THREE.Math.smoothstep(curvature[i], 0.0, 0.7);
                // curvature[i] = THREE.Math.clamp(curvature[i], 0, 1);
            }
        }

        function filterBoth(curvature) {
            for (var i = 0; i < curvature.length; i++) {
                curvature[i] = Math.abs(curvature[i]);
            }
        }

        return Curvature;

    }();

    window.Curvature = Curvature;

    var app = angular.module('app');

    app.factory('Curvature', [function () {
        return Curvature;
    }]);

}());
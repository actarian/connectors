/* global window, document, console, TweenLite */

(function () {
    'use strict';

    /* 
    <script id="vertexShaderRaw" type="x-shader/x-vertex">
        attribute float curvature;
        varying float vCurvature;
        void main() {
            vec3 p = position;
            vec4 modelViewPosition = modelViewMatrix * vec4( p , 1.0 );
            gl_Position = projectionMatrix * modelViewPosition;
            vCurvature = curvature;
        }
    </script>
    */
    /*
    <script id="fragmentShaderRaw" type="x-shader/x-fragment">
        varying vec3 vViewPosition;
        varying float vCurvature;
        void main() {
            gl_FragColor = vec4( vCurvature * 2.0, 0.0, 0.0, 0.0 );
        }
    </script>
    */

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

            // var filtered = new Float32Array(attribute);
            // filterConvex(filtered);
            geometry.addAttribute('curvature', new THREE.BufferAttribute(attribute, 1));

            /*
            var filtered = new Float32Array(attribute);
            filterConvex(filtered);
            geometry.attributes.curvature.array = filtered;
            geometry.attributes.curvature.needsUpdate = true;
            */

            /*
            var materialRaw = new THREE.ShaderMaterial({
                vertexShader: document.getElementById('vertexShaderRaw').textContent,
                fragmentShader: document.getElementById('fragmentShaderRaw').textContent
            });

            ninjaMeshRaw = new THREE.Mesh(geometry, materialRaw);
            //init GUI
            var filtered = new Float32Array(attribute);
            filterConvex(filtered);
            geometry.attributes.curvature.array = filtered;
            geometry.attributes.curvature.needsUpdate = true;
            */
        }

        function setEdges(geometry, thresholdAngle) {
            thresholdAngle = thresholdAngle || 90;
            var thresholdDot = Math.cos(THREE.Math.DEG2RAD * thresholdAngle);

            var faces = geometry.faces,
                face;
            geometry = new THREE.BufferGeometry().fromGeometry(geometry);
            var edges = {},
                edge, key, ea, eb, i, ia, ib, ic, va, vb, vc, na, nb, nc;
            // var positions = geometry.attributes.position.array;
            var normals = geometry.attributes.normal.array;

            function addKey(va, vb, ia, ib, i) {
                ea = Math.min(va, vb);
                eb = Math.max(va, vb);
                key = ea + '-' + eb;
                if (edges[key] === undefined) {
                    edges[key] = {
                        a: ia,
                        b: ib,
                        c: ia,
                        d: ib,
                        fa: i,
                        fb: undefined
                    };
                } else {
                    edges[key].fb = i;
                    edges[key].c = ia;
                    edges[key].d = ib;
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

            /*
            function addKey(a, b, i) {
                ea = Math.min(a, b);
                eb = Math.max(a, b);
                key = ea + '-' + eb;
                if (edges[key] === undefined) {
                    edges[key] = {
                        a: ea,
                        b: eb,
                        fa: i,
                        fb: undefined
                    };
                } else {
                    edges[key].fb = i;
                    console.log(i);
                }
            }
            for (i = 0; i < positions.length; i += 9) {
                ia = i;
                ib = i + 3;
                ic = i + 6;
                addKey(ia, ib, i);
                addKey(ib, ic, i);
                addKey(ic, ia, i);
            }
            */
            var attribute = new Float32Array(geometry.attributes.position.count);
            for (i = 0; i < geometry.attributes.position.count; i++) {
                attribute[i] = 1.0;
            }
            var edgeKeys = Object.keys(edges);
            console.log(edgeKeys.length);
            var edgeMatches = 0;

            function fillEdge(e) {
                attribute[e.a / 3] = 0.0;
                attribute[e.b / 3] = 0.0;
                attribute[e.c / 3] = 0.0;
                attribute[e.d / 3] = 0.0;
                edgeMatches++;
            }
            for (key in edges) {
                edge = edges[key];
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
            console.log('matches', edgeMatches, (edgeMatches / edgeKeys.length * 100).toFixed(2));
            return geometry;
        }

        function setEdges1(geometry, thresholdAngle) {
            thresholdAngle = thresholdAngle || 90;
            var thresholdDot = Math.cos(THREE.Math.DEG2RAD * thresholdAngle);
            var edge = [0, 0],
                edges = {},
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
                    if (edges[key] === undefined) {
                        edges[key] = {
                            a: edge[0],
                            b: edge[1],
                            fa: i,
                            fb: undefined
                        };
                    } else {
                        edges[key].fb = i;
                    }
                }
            }
            var vertices = geometry.vertices;
            var attribute = new Float32Array(vertices.length * 3);
            for (var i = 0; i < vertices.length * 3; i++) {
                attribute[i] = 1.0;
            }
            var edgeKeys = Object.keys(edges);
            console.log(edgeKeys.length);
            var edgeMatches = 0;
            for (key in edges) {
                var e = edges[key];
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
                    edgeMatches++;
                }
            }
            console.log(geometry.normals.length);
            console.log('matches', edgeMatches, (edgeMatches / edgeKeys.length * 100).toFixed(2));
            geometry = new THREE.BufferGeometry().fromDirectGeometry(geometry);
            geometry.addAttribute('curvature', new THREE.BufferAttribute(attribute, 1));
            console.log('verts', vertices.length, geometry.attributes.position.count);
            // build geometry
            // this.addAttribute('position', new Float32BufferAttribute(vertices, 3));
            return geometry;
        }

        /*   
        fn cMAKgetAngleBetweenFaces normal1 normal2 center1 center2 = (
    	    local faMatrix = translate (matrixFromNormal normal1) center1
	        local fbCoord = (center2 * (inverse faMatrix)).z
	        local normAngle = acos(dot (normalize normal1) (normalize normal2))
	        if fbCoord < 0 do normAngle = 360 - normAngle
	        normAngle 
	    )
        */

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

}());
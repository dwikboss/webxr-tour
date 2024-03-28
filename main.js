import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

let camera;
let scene;
let renderer;
let arbutton;
let controller;
let reticle;

let hitTestSource = null;
let hitTestSourceRequested = false;

let isAudioPlaying = false;
let currentAudio = null;

const audioContext = new AudioContext();
const audioElements = [];
const imageData = [
    {
        imageUrl: 'images/tilburg-1.png',
        audioUrl: 'audio/audio-1.mp3',
        audio: new Audio('audio/audio-1.mp3')
    },
    {
        imageUrl: 'images/tilburg-2.png',
        audioUrl: 'audio/audio-2.mp3',
        audio: new Audio('audio/audio-2.mp3')
    },
    {
        imageUrl: 'images/tilburg-3.png',
        audioUrl: 'audio/audio-3.mp3',
        audio: new Audio('audio/audio-3.mp3')
    },
    {
        imageUrl: 'images/tilburg-4.png',
        audioUrl: 'audio/audio-4.mp3',
        audio: new Audio('audio/audio-4.mp3')
    },
    {
        imageUrl: 'images/tilburg-5.png',
        audioUrl: 'audio/audio-5.mp3',
        audio: new Audio('audio/audio-5.mp3')
    },
];

let currentIndex = 0;

init();
animate();

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}


function animate() {
    renderer.setAnimationLoop(render);
}

function init() {
    const textureLoader = new THREE.TextureLoader();
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    arbutton = ARButton.createButton(renderer, { 
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.getElementById('arOverlay') } 
    })
    document.body.appendChild(arbutton);

    const geometry = new THREE.PlaneGeometry(1, 1);
    function onSelect() {    
        const data = imageData[currentIndex];
        const texture = textureLoader.load(data.imageUrl);
        if (reticle.visible) {
            const material = new THREE.MeshBasicMaterial({ 
                map: texture,
                transparent: true,
                alphaTest: 0.1
            });
            const mesh = new THREE.Mesh(geometry, material);
            const rotationMatrix = new THREE.Matrix4();

            rotationMatrix.extractRotation(reticle.matrix);
            mesh.applyMatrix4(rotationMatrix);
            mesh.position.setFromMatrixPosition(reticle.matrix);
            reticle.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
            mesh.scale.set(3, 2, 2);
            scene.add(mesh);
            currentIndex = (currentIndex + 1) % imageData.length;

            const audio = data.audio;
            audio.play();
        }
    }

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    let light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    reticle = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial());
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    reticle.add(new THREE.AxesHelper(0.5));
    reticle.add(new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshBasicMaterial()))
    scene.add(reticle);

    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    scene.add(new THREE.AxesHelper(1));

    window.addEventListener( 'resize', onWindowResize );
}


function render(timestamp, frame) {
    if(frame){
        let referenceSpace = renderer.xr.getReferenceSpace();
        let session = renderer.xr.getSession();

        if (hitTestSourceRequested === false) {
            session.requestReferenceSpace('viewer').then(function (referenceSpace) {
                session.requestHitTestSource({ space: referenceSpace }).then(function (source) {
                    hitTestSource = source;
                });
            });
            session.addEventListener('end', function () {
                hitTestSourceRequested = false;
                hitTestSource = null;
            });
            hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            let hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length) {
                let hit = hitTestResults[0];
                reticle.visible = true;
                reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);

            } else {
                reticle.visible = false;
            }
        }
    
    }
    renderer.render(scene, camera);
}
if (nw.App.argv.length < 2) {
    process.stdout.write('Call with node client.js [address] [name]\n');
    process.exit();
}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.CubeTextureLoader().setPath('textures/skybox/').load(['Daylight Box_Right.bmp', 'Daylight Box_Left.bmp', 'Daylight Box_Top.bmp', 'Daylight Box_Bottom.bmp', 'Daylight Box_Front.bmp', 'Daylight Box_Back.bmp']);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.autoClear = false;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const c = new OrbitControls(camera, renderer.domElement);

const loader = new GLTFLoader();
const gltf = await loader.loadAsync('./models/player.glb');
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
const playerScene = new THREE.Scene();
playerScene.add(light);
playerScene.add(ambient);
playerScene.add(gltf.scene);
scene.add(light.clone(true));
scene.add(ambient.clone(true));


const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({map: new THREE.TextureLoader().load('textures/ground.jpg'), side: THREE.DoubleSide});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.setRotationFromEuler(new THREE.Euler(-Math.PI/2, 0, 0));
scene.add(ground);

camera.position.z = 5;

const speed = 0.33;
const controls = {fwd: false, back: false, up: false, down: false, left: false, right: false};
function animate() {
    if (!players[myid]) {
        return;
    }

    // client-side prediction
    for (let id in players) {
        if (players[id].controls.up) {
            players[id].position.y += speed;
        }
        if (players[id].controls.down) {
            players[id].position.y -= speed;
        }
        if (players[id].controls.fwd) {
            players[id].position.x += speed * Math.sin(players[id].rotation.y);
            players[id].position.z += speed * Math.cos(players[id].rotation.y);
        }
        if (players[id].controls.back) {
            players[id].position.x -= speed * Math.sin(players[id].rotation.y);
            players[id].position.z -= speed * Math.cos(players[id].rotation.y);
        }
        if (players[id].controls.left) {
            players[id].position.x += speed * Math.cos(players[id].rotation.y);
            players[id].position.z -= speed * Math.sin(players[id].rotation.y);
        }
        if (players[id].controls.right) {
            players[id].position.x -= speed * Math.cos(players[id].rotation.y);
            players[id].position.z += speed * Math.sin(players[id].rotation.y);
        }
    }

    camera.position.sub(c.target)
    c.target.copy(players[myid].position);
    camera.position.add(c.target);
    c.update();
    renderer.render(scene, camera);
    // we render the players separate from the rest of the scene so that we don't have to deal with adding/removing meshes from a scene object as players join/leave
    // (the server doesn't notify us of changes to no. players, so we just render the player list each frame)
    for (let id in players) {
        gltf.scene.position.copy(players[id].position);
        gltf.scene.rotation.set(players[id].rotation.x, players[id].rotation.y, players[id].rotation.z);
        renderer.render(playerScene, camera);
    }
}
renderer.setAnimationLoop(animate);

const net = require('net');
const readline = require('readline');

const socket = net.connect(12345, nw.App.argv[0]);
socket.on('connect', function() {
    socket.write(JSON.stringify({method: 'join', name: nw.App.argv[1]}) + '\n');
});
socket.on('error', function() {});

let players = {};
let myid;
const rl = readline.createInterface({input: socket, crlfDelay: Infinity});
rl.on('line', function(line) {
    const event = JSON.parse(line);
    switch (event.event) {
        case 'update':
            players = event.players;
        break;
        case 'message':
            console.log(event.content);
        break;
        case 'informid':
            myid = event.id;
        break;
    }
});

document.onkeydown = function(event) {
    switch(event.code) {
        case 'KeyT':
            socket.write(JSON.stringify({method: 'message', message: prompt("Enter a chat message")}) + '\n');
        break;
        case 'KeyW':
            controls.fwd = true;
            updateControls();
        break;
        case 'KeyS':
            controls.back = true;
            updateControls();
        break;
        case 'KeyA':
            controls.left = true;
            updateControls();
        break;
        case 'KeyD':
            controls.right = true;
            updateControls();
        break;
        case 'Space':
            controls.up = true;
            updateControls();
            //socket.write(JSON.stringify({method: 'jump'}) + '\n');
        break;
        case 'ShiftLeft':
            controls.down = true;
            updateControls();
            //socket.write(JSON.stringify({method: 'crouch'}) + '\n');
        break;
    }
}

document.onkeyup = function(event) {
    switch(event.code) {
        case 'KeyW':
            controls.fwd = false;
            updateControls();
        break;
        case 'KeyS':
            controls.back = false;
            updateControls();
        break;
        case 'KeyA':
            controls.left = false;
            updateControls();
        break;
        case 'KeyD':
            controls.right = false;
            updateControls();
        break;
        case 'Space':
            controls.up = false;
            updateControls();
        break;
        case 'ShiftLeft':
            controls.down = false;
            updateControls();
        break;
    }
}

function updateControls() {
    socket.write(JSON.stringify({method: 'setControls', fwd: controls.fwd, back: controls.back, up: controls.up, down: controls.down, left: controls.left, right: controls.right}) + '\n');
}

const chat = readline.createInterface({input: process.stdin, crlfDelay: Infinity});
chat.on('line', function(line) {
    console.log(line);
    socket.write(JSON.stringify({method: 'message', message: line}) + '\n');
});

window.onresize = function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

c.addEventListener('change', function() {
    const v = new THREE.Vector3();
    camera.getWorldDirection(v);
    const yRotation = Math.atan2(v.x, v.z);
    if (Math.abs(yRotation - players[myid].rotation.y) > 0.001) {
        players[myid].rotation.y = yRotation;
        socket.write(JSON.stringify({method: 'setRotation', x: 0, y: yRotation, z: 0}) + '\n');
    }
});
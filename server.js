const net = require('net');
const players = {};
const sockets = {};
const readline = require('readline');

const server = net.createServer(function(socket) {
    let joined = false; // false - connected but not joined, true - connected and joined
    let id;
    console.log('Connection from', socket.remoteAddress);
    const rl = readline.createInterface({input: socket, crlfDelay: Infinity});
    rl.on('line', function(line) {
        const request = JSON.parse(line);
        if (!joined) {
            if (request.method !== 'join') {
                console.log(socket.remoteAddress, 'made request without joining.');
                return;
            }
            if (typeof request.name === 'undefined' || request.name === '') {
                console.log('Bad join request from', socket.remoteAddress);
                return;
            }
            id = socket.remoteAddress + ':' + socket.remotePort; // unique id based on address+port. Pretty sure this can't be duplicated...
            players[id] = new Player(request.name);
            sockets[id] = socket;
            joined = true;
            console.log(socket.remoteAddress, 'joined with name', request.name);
            socket.write(JSON.stringify({event: 'informid', id: id}) + '\n');
            return;
        }
        if (request.method === 'setControls') {
            players[id].controls.fwd = request.fwd;
            players[id].controls.back = request.back;
            players[id].controls.up = request.up;
            players[id].controls.down = request.down;
            players[id].controls.left = request.left;
            players[id].controls.right = request.right;
            return;
        }
        if (request.method === 'setRotation') {
            players[id].rotation.x = request.x;
            players[id].rotation.y = request.y;
            players[id].rotation.z = request.z;
            return;
        }
        if (request.method === 'message') {
            console.log('[' + players[id].name + ']: ' + request.message);
            for (const sendid in players) {
                sockets[sendid].write(JSON.stringify({event: 'message', content: '[' + players[id].name + ']: ' + request.message}) + '\n');
            }
        }
    });
    rl.on('error', function() {});
    socket.on('close', function() {
        console.log(socket.remoteAddress, 'disconnected.');
        if (joined) {
            delete players[id];
            delete sockets[id];
        }
    });
    
}).listen(12345);
console.log('MPServer is running.');

let tps = 0;
const speed = 1;
function tick() {
    tps++;
    for (const id in players) {
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
        players[id].position.addVector(players[id].velocity);
        sockets[id].write(JSON.stringify({event: 'update', players: players}) + '\n'); // UNCOMMENT THIS!
    }
}

setInterval(tick, 50);
setInterval(function() {
    process.stdout.write('TPS: ' + tps + '\r');
    tps = 0;
}, 1000);

function Vector3(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.addVector = function(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
    }
}

function Player(name) {
    this.name = name;
    this.position = new Vector3(0, 0, 0);
    this.rotation = new Vector3(0, 0, 0);
    this.velocity = new Vector3(0, 0, 0);
    this.controls = {fwd: false, back: false, up: false, down: false, left: false, right: false};
}

process.stdin.on('data', function() {
    console.log(players);
});
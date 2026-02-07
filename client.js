if (process.argv.length < 4) {
    console.log('Call with node client.js [address] [name]');
    process.exit();
}

const net = require('net');
const xgfx = require('xgfx');
const readline = require('readline');

const socket = net.connect(12345, process.argv[2]);
socket.on('connect', function() {
    socket.write(JSON.stringify({method: 'join', name: process.argv[3]}) + '\n');
});
socket.on('error', function() {});

let players = {};
const rl = readline.createInterface({input: socket, crlfDelay: Infinity});
rl.on('line', function(line) {
    const event = JSON.parse(line);
    if (event.event === 'update') {
        players = event.players;
        return;
    }
    if (event.event === 'message') {
        console.log(event.content);
        return;
    }
});

xgfx.initWindow(640, 480, "MPClient");

const speed = 0.6;
const controls = {fwd: false, back: false, up: false, down: false, left: false, right: false};
setInterval(function() {
    const event = xgfx.allocEvent();
    while(xgfx.checkWindowEvent(event) > 0) {
        if (event.type == xgfx.WINDOW_CLOSE) {
            process.exit();
        }
        else if (event.type == xgfx.KEY_CHANGE) {
            console.log(event.keychange.key);
            switch (event.keychange.key) {
                case 17:
                    if (controls.fwd !== !!event.keychange.state) {
                        controls.fwd = !!event.keychange.state;
                        updateControls();
                    }
                break;
                case 31:
                    if (controls.back !== !!event.keychange.state) {
                        controls.back = !!event.keychange.state;
                        updateControls();
                    }
                break;
                case 30:
                    if (controls.left !== !!event.keychange.state) {
                        controls.left = !!event.keychange.state;
                        updateControls();
                    }
                break;
                case 32:
                    if (controls.right !== !!event.keychange.state) {
                        controls.right = !!event.keychange.state;
                        updateControls();
                    }
                break;
            }
        }
    }
    xgfx.clear();
    for (const id in players) {
        // client-side prediction
        if (players[id].controls.fwd) {
            players[id].position.z -= speed;
        }
        if (players[id].controls.back) {
            players[id].position.z += speed;
        }
        if (players[id].controls.left) {
            players[id].position.x -= speed;
        }
        if (players[id].controls.right) {
            players[id].position.x += speed;
        }
        xgfx.circle(players[id].position.x + 320, players[id].position.z + 240, 10, 0xffff0000);
    }
    xgfx.updateWindow();
});

function updateControls() {
    socket.write(JSON.stringify({method: 'setControls', fwd: controls.fwd, back: controls.back, up: controls.up, down: controls.down, left: controls.left, right: controls.right}) + '\n');
}

const chat = readline.createInterface({input: process.stdin, crlfDelay: Infinity});
chat.on('line', function(line) {
    socket.write(JSON.stringify({method: 'message', message: line}) + '\n');
});
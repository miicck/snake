var http = require('http'),
    fs = require('fs'),
    index = fs.readFileSync(__dirname + '/index.html');

// Send index.html to all requests
var app = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(index);
});

// Socket.io server listens to our app
var io = require('socket.io').listen(app);

// Initialize the grid
var SIZE = 50;
var grid = [];
for (x = 0; x < SIZE; ++x)
    grid[x] = [];

for (x = 0; x < SIZE; ++x)
    for (y = 0; y < SIZE; ++y)
        grid[x][y] = { id: 0, xdir: 1, ydir: 0, isHead: false };

var currentID = 0;

io.on('connection', function (socket) {

    // Send initial grid information
    for (x = 0; x < SIZE; ++x)
        for (y = 0; y < SIZE; ++y)
            io.emit('update', { x: x, y: y, id: grid[x][y].id });

    // Send the client it's unique id
    io.emit('welcome', { id: ++currentID });
    spawn(currentID);

    socket.on('steer', function (data) {
        console.log("steer" + data.xdir + "," + data.ydir);
        for (x = 0; x < SIZE; ++x)
            for (y = 0; y < SIZE; ++y)
                if (grid[x][y].id == data.id)
                    if (grid[x][y].isHead) {
                        grid[x][y].xdir = data.xdir;
                        grid[x][y].ydir = data.ydir;
                    }
    });
});

setInterval(tick, 100);

function tick() {

    //debugPrint();

    var tempGrid = [];
    for (x = 0; x < SIZE; ++x)
        tempGrid[x] = [];

    for (x = 0; x < SIZE; ++x)
        for (y = 0; y < SIZE; ++y)
            tempGrid[x][y] = { update: false, id: 0, xdir: 0, ydir: 0, isHead: false };

    for (x = 0; x < SIZE; ++x)
        for (y = 0; y < SIZE; ++y)
            if (grid[x][y].isHead) {

                // Get the direction of travel
                var xdir = grid[x][y].xdir;
                var ydir = grid[x][y].ydir;

                // Moved into a wall
                if (!inRange(x + xdir, y + ydir)) {
                    killSnake(grid[x][y].id, "oor");
                    continue;
                }

                // Moved into a snake
                if (grid[x + xdir][y + ydir].id != 0) {
                    killSnake(grid[x][y].id, "snake hit " + (x + xdir) + ", " + (y + ydir));
                    continue;
                }
                else {
                    // Move this snake square into open space
                    tempGrid[x + xdir][y + ydir].isHead = true;
                    tempGrid[x + xdir][y + ydir].update = true;
                    tempGrid[x + xdir][y + ydir].xdir = grid[x][y].xdir;
                    tempGrid[x + xdir][y + ydir].ydir = grid[x][y].ydir;
                    tempGrid[x + xdir][y + ydir].id = grid[x][y].id;
                    tempGrid[x][y].isHead = false;
                    tempGrid[x][y].update = true;
                }
            }

    for (x = 0; x < SIZE; ++x)
        for (y = 0; y < SIZE; ++y)
            if (tempGrid[x][y].update) {

                if (tempGrid[x][y].isHead) {
                    grid[x][y].isHead = true;
                    grid[x][y].id = tempGrid[x][y].id;
                    grid[x][y].xdir = tempGrid[x][y].xdir;
                    grid[x][y].ydir = tempGrid[x][y].ydir;
                }
                else {
                    grid[x][y].isHead = false;
                }

                update(x, y);
            }
}

function spawn(n)
{
    var xNew = Math.floor(Math.random()*SIZE);
    var yNew = Math.floor(Math.random()*SIZE);
    grid[xNew][yNew].id = n;
    grid[xNew][yNew].isHead = true;
    update(xNew,yNew);
}

function killSnake(n, message) {
    console.log("killed snake " + n + ", " + message);

    for (x = 0; x < SIZE; ++x)
        for (y = 0; y < SIZE; ++y)
            if (grid[x][y].id == n) {
                grid[x][y] = { id: 0, xdir: 1, ydir: 0, isHead: false };
                update(x,y);
            }
}

function debugPrint() {
    console.log("\n\n");
    for (x = 0; x < SIZE; ++x) {
        var line = "";
        for (y = 0; y < SIZE; ++y) {

            if (grid[x][y].isHead)
                line = line + "#";
            else if (grid[x][y].id != 0)
                line = line + grid[x][y].id;
            else
                line = line + " ";
        }
        console.log(line);
    }
}

function update(x, y) {
    console.log("Updating " + x + ", " + y);
    io.emit('update', { x: x, y: y, id: grid[x][y].id });
}

function inRange(x, y) {
    return (x >= 0) && (y >= 0) && (x < SIZE) && (y < SIZE);
}

console.log("Server started");
app.listen(3000);
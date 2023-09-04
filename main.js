const config = require("./config.json");
const { App, SSLApp } = require("uWebSockets.js");
const { Server } = require("socket.io");


// 创建 Socket.IO 服务器
const io = new Server();
const app = config.ssl.enable ? new SSLApp({
    key_file_name: config.ssl.key_file_name,
    cert_file_name: config.ssl.cert_file_name
}) : new App();


// 监听路由
for (const path of config.routes) {
    io.of(path).on("connection", (socket) => {
        // 加入房间
        const { room } = socket.handshake.query;
        const rooms = ["server", "client"];
        if (rooms.includes(room)) {
            socket.join(room);
            socket.on("error", () => socket.leave(room));
            socket.on("disconnect", () => socket.leave(room));
        }
        else {
            socket.disconnect(true)
        }
        // 转发消息
        socket.onAny((event, ...args) => {
            if (socket.rooms.has("server")) {
                socket.to("client").emit(event, ...args);
            }
            if (socket.rooms.has("client")) {
                socket.to("server").emit(event, ...args);
            }
        });
    });
}


// 开启 Socket.IO 服务器
io.attachApp(app);
app.listen(config.address.port, (listenSocket) => {
    if (listenSocket) {
        console.info(`listening to port ${config.address.port}`);
    }
    else {
        console.warn("port already in use");
    }
});

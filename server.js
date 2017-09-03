var express = require("express");
var path = require("path");
var app = express();

app.use(express.static(path.join(__dirname,"/static")));
app.set("views",path.join(__dirname,"/views"));
app.set("view engine", "ejs");

app.get('/',function(req,res){
    // 这里我们使用ejs引擎啦
    res.render("index");
    // res.sendFile(__dirname+'/views/index.html');
});

app.get('/vue',function(request,response){
    response.render('index-vue');
});
app.get('/onlineusers',function(request,response){
    console.log(io.sockets.adapter.rooms);
    response.send(io.sockets.adapter.rooms);
});

var port = process.env.PORT || 8000;

var server = app.listen(port,function(){
    console.log("listen on port *:"+port);
});

// 监听位置好像跟listen() 方法出现位置无关！
app.get('/test',function(request,response){
    console.log(io.sockets.adapter.rooms);
    response.send('hi test');
});
/**
 * -------------------------------------------------------- +|
 *             下面集成 socket-io
 * -------------------------------------------------------- +|
 */
var io = require("socket.io").listen(server);

/**
 * + +++++++++++++++++++++++++++++++++++++++++++++++++++ |
 * 
 */

 
// for vue 页面
function  VUEChatHandler(io ,socket){
   this.io = io ;
   this.socket = socket ;

}
VUEChatHandler.prototype.handleConnection = function(){
   // tell all clients that someone connected
    this.io.emit('user joined',this.socket.id) ;
};
VUEChatHandler.prototype.handleDisConnecte = function(){
    console.log('user left :'+this.socket.id);
    // tell all clients that someone disconnected
     this.socket.broadcast.emit('user left',this.socket.id) ;
 };
 VUEChatHandler.prototype.handleChatMessage = function(){
    // the client sends 'chat.message' event to server
    this.socket.on('chat.message',function(message){
        // emit this event to all clients connected to it
       this.io.emit('chat.message',message);
    }.bind(this));
};
VUEChatHandler.prototype.handleUserTyping = function(){
    // the client sends 'user typing' event to server
    this.socket.on('user typing',function(username){
        // emit this event to all clients connected to it
       this.io.emit('user typing',username);
    }.bind(this));
};

VUEChatHandler.prototype.handleStoppedTyping = function(){
    this.socket.on('stopped typing',function(username){
       this.io.emit('stopped typing',username);
    }.bind(this));
};
/**
 *              end for vue
 * --------------------------------------   +|
 */

var messages = ["Chatroom started"];

io.sockets.on('connection',function(socket){
    // 所有的逻辑将发生在这个代码块
    console.log("new connection on socket id "+socket.id);
   

    // ------------------------------------- + |
    // 仅对vue页面管用
     var vueHandler = new VUEChatHandler(io,socket);
     vueHandler.handleConnection() ;
     vueHandler.handleChatMessage() ;
     vueHandler.handleUserTyping() ;
     vueHandler.handleStoppedTyping() ;
     // ------------------------------------- + |

    // 相对当前socket的 次级全局变量
    var user ; 

    // socket 本身 可以作为变量寄宿根  
   
    socket.on("got_new_user",function(data){
        console.log(data) ;
        // var user = data.name;
        user = data ;

        socket.emit("added_user",{
            messages:messages
        });

        var joined = data.name + "has joined ";
        messages.push(joined);
        // 广播除自己以外的人
        socket.broadcast.emit("update_chat",{
           message: joined
        });
    });

    socket.on("new_message",function(data){
        console.log(data);
        messages.push(data.message);
        // 广播给所有的连接者 包括发送消息的客户端
        io.emit("update_chat",{
            message: data.message
        });
    });

    socket.on("disconnect",function(){
        if(user){
            console.log(user.name+" disconnected from socket id " + socket.id);
        }else{
            console.log(" disconnected from socket id " + socket.id);
        }
        // 独立的vue处理
        vueHandler.handleDisConnecte();
    });
});


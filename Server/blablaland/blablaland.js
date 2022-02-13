var bsplit = require('buffer-split');
var zlib = require('zlib');
var net = require('net');
var fs = require('fs');

var GlobalProperties = require("./bbl/GlobalProperties.js");
var variables = require("./maps/variables.js");
var SocketMessage = require("./client/SocketMessage");
var ByteArray = new require("./client/ByteArray.js");
var respawn = require("./maps/respawn.js");
var rawdata = fs.readFileSync('config.json');
var config = JSON.parse(rawdata);

var powerInfo = {
    10000: [2, 1, 99999, 5, 5, new SocketMessage()],
    10001: [2, 2, 99999, 5, 5, new SocketMessage()],
    10002: [2, 3, 99999, 5, 5, new SocketMessage()],
    10003: [2, 4, 0, 5, 5, new SocketMessage()],
    10004: [2, 5, 0, 5, 5, new SocketMessage()],
    10005: [2, 6, 0, 5, 5, new SocketMessage()]
};

function modulo(a, b) {
    return a - Math.floor(a/b)*b;
}
function ToUint32(x) {
    return modulo(parseInt(x), Math.pow(2, 32));
}

class BblCamera {
    constructor() {
        this.mapId = 9;
        this.cameraId = 1;
        this.serverId = 1;
        this.methodeId = 3;
        this.mapLoaded = false;
        this.mort = false;
        this.allowChat = false;
        this.transportToPlanete = 0;
    }
    getUserByUid(uid) {
        for(var i in this.server.userList) {
            if(this.server.userList[i].uid == uid) return this.server.userList[i];
        }
        return null;
    }
    userSmileyEvent(param1) {
        for (var i in Array(14).keys()) {
            param1.bitWriteBoolean(true);
            param1.bitWriteUnsignedInt(8, 0);
            param1.bitWriteUnsignedInt(GlobalProperties.BIT_SMILEY_PACK_ID, i);
        }
        param1.bitWriteBoolean(false);
    }
    userObjectEvent(packet, data) {
        packet.bitWriteBoolean(true);
        packet.bitWriteUnsignedInt(8, data.type);
        if(data.type == 0) {
            packet.bitWriteUnsignedInt(32, data.id);
            packet.bitWriteUnsignedInt(GlobalProperties.BIT_FX_ID, data.fxFileId);
            packet.bitWriteUnsignedInt(GlobalProperties.BIT_FX_SID, data.objectId);
            packet.bitWriteUnsignedInt(32, data.count);
            packet.bitWriteUnsignedInt(32, data.expire);
            packet.bitWriteUnsignedInt(3, data.visibility);
            packet.bitWriteUnsignedInt(5, data.genre);
            packet.bitWriteBinaryData(data.data);
        } else if(data.type == 1) {
            packet.bitWriteUnsignedInt(32, data.id);
            packet.bitWriteUnsignedInt(32, data.count);
            packet.bitWriteUnsignedInt(32, data.expire);
            packet.bitWriteBinaryData(data.data);
        }
        return packet;
    }
    teleportToMap(camera_id, map_id, server_id, methode_id) {
        var errorId = map_id == this.mapId ? 1: 0;
        if(!this.mapLoaded) return;
        if(!(map_id in this.server.variable.maps) || (map_id == 355 && !this.transportToPlanete)) {
            this.parsedEventMessage(1, 10, new SocketMessage());
            return;
        }
        if((this.server.variable.maps[map_id][8] != this.server.variable.maps[this.mapId][8]) && !this.transportToPlanete) {
            this.sendMsg("Impossible de se téléporter vers une autre planete !!");
            return;
        }
        if(!errorId) {
            this.mapLoaded = false;
            this.methodeId = methode_id;
            this.map.leaveMap(this.mapId, this);
            if(methode_id >= 2) {
                if(map_id in respawn) {
                    this.mainUser.position.x = respawn[map_id][0];
                    this.mainUser.position.y = respawn[map_id][1];
                }
                this.mainUser.underWater = false;
                this.mainUser.grimpe = false;
                this.mainUser.accroche = false;
                this.mainUser.speed.x = 0;
                this.mainUser.speed.y = 0;
            }
        }
        var packet = new SocketMessage(3, 5);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_CAMERA_ID, camera_id);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_MAP_ID, map_id);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_SERVER_ID, server_id);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_MAP_FILEID, map_id);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_METHODE_ID, methode_id);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_ERROR_ID, errorId);
        this.send(packet);
    }
    die(msg = "", methode=7) {
        if(!([55, 446, 264, 251, 252, 253, 254, 255, 256].includes(this.mapId))) {
            if(this.mainUser.skinId != 405) {
                const old = this.mainUser.skinId;
                this.mainUser.skinId = 405;
                var _this = this;
                setTimeout(function () {
                    _this.mainUser.skinId = old;
                    _this.reloadPlayerState(0, 0);
                }, 10000);
            }
            this.sendMsg(msg, {ALL:true})
            this.mort = true;
            var mapId = 253;
            if(this.server.variable.maps[this.mapId].length > 9) mapId = this.server.variable.maps[this.mapId][9];
            this.teleportToMap(this.cameraId, mapId, this.serverId, methode);
        }
    }
    sendError(text) {
        var packet = new SocketMessage(1, 2);
        packet.bitWriteString(text);
        this.send(packet);
        this.connectionLost();
        this.socket.end();
    }
    parsedEventMessage(type, stype, loc5) {
        var packet;
        if (type == 3) {
            if (stype == 3) {
                if(config.allowTouriste == "false") {
                    if(this.isTouriste) {
                        this.sendError(config.msgErrorTouriste);
                        return;
                    }
                }
                this.server.addClient(this);
                var token = loc5.bitReadUnsignedInt(32);
                packet = new SocketMessage(3, 2);
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_ERROR_ID, 0);
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_CAMERA_ID, this.cameraId);
                packet.bitWriteString(this.mainUser.chatColor);
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_MAP_ID, this.mapId);
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_MAP_FILEID, this.mapId);
                this.userSmileyEvent(packet);
                packet.bitWriteBoolean(false);
                packet.bitWriteBoolean(false);
                for(var i in powerInfo) {
                    packet = this.userObjectEvent(packet, {
                        type: 0,
                        id: i,
                        fxFileId: powerInfo[i][0],
                        objectId: powerInfo[i][1],
                        count: 999,
                        expire: powerInfo[i][2],
                        visibility: powerInfo[i][3],
                        genre: powerInfo[i][4],
                        data: powerInfo[i][5]
                    });
                }
                packet.bitWriteBoolean(false);
                this.send(packet);
                this.chatBuffer = {
                    id: parseInt(Math.random() * 64),
                    position: 680000,
                    size: parseInt(Math.random() * 15000)
                }
                packet = new SocketMessage(1, 18);
                packet.bitWriteUnsignedInt(32, this.chatBuffer.id); // id
                packet.bitWriteUnsignedInt(32, this.chatBuffer.position); // position
                packet.bitWriteUnsignedInt(32, this.chatBuffer.size); //size
                this.send(packet);
                this.connected = true;
            } else if (stype == 5) {
                var methode_id = loc5.bitReadUnsignedInt(GlobalProperties.BIT_METHODE_ID);
                var camera_id = loc5.bitReadUnsignedInt(GlobalProperties.BIT_CAMERA_ID);
                var map_id = loc5.bitReadUnsignedInt(GlobalProperties.BIT_MAP_ID);
                var server_id = loc5.bitReadUnsignedInt(GlobalProperties.BIT_SERVER_ID);
                this.readPlayerState(loc5);
                this.teleportToMap(camera_id, map_id, server_id, methode_id);
            } else if (stype == 6) {
                var camera_id = loc5.bitReadUnsignedInt(GlobalProperties.BIT_CAMERA_ID);
                var map_id = loc5.bitReadUnsignedInt(GlobalProperties.BIT_MAP_ID);
                this.mapLoaded = true;
                this.mapId = map_id;
                this.map.joinMap(map_id, this);
                packet = new SocketMessage(4, 1);
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_CAMERA_ID, this.cameraId);
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_ERROR_ID, 0);
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_METHODE_ID, this.methodeId);
                packet.bitWriteSignedInt(17, this.server.variable.maps[this.mapId][3]);
                packet.bitWriteSignedInt(17, this.server.variable.maps[this.mapId][4]);
                packet.bitWriteUnsignedInt(5, this.server.variable.maps[this.mapId][5]);
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_TRANSPORT_ID, this.server.variable.maps[this.mapId][2]);
                packet.bitWriteUnsignedInt(16, this.server.variable.maps[this.mapId][6]);
                for (var client in this.map.maps[map_id].userList) {
                    client = this.map.maps[map_id].userList[client];
                    packet.bitWriteBoolean(true);
                    packet.bitWriteUnsignedInt(GlobalProperties.BIT_USER_ID, client.uid);
                    packet.bitWriteUnsignedInt(GlobalProperties.BIT_USER_PID, client.pid);
                    packet.bitWriteString(client.pseudo);
                    packet.bitWriteUnsignedInt(3, client.sex);
                    packet.bitWriteUnsignedInt(32, 0);
                    var p = new SocketMessage();
                    p = client.writePlayerState(p, true, true, true);
                    packet.bitWriteBinaryData(p)
                }
                packet.bitWriteBoolean(false);
                for(var i in this.map.maps[map_id].objectList) {
                    var obj = this.map.maps[map_id].objectList[i];
                    if(Object.keys(obj).length >= 2) {
                        packet.bitWriteBoolean(true);
                        packet.bitWriteUnsignedInt(GlobalProperties.BIT_FX_ID, obj[0]);
                        packet.bitWriteUnsignedInt(GlobalProperties.BIT_FX_SID, obj[1]);
                        packet.bitWriteBinaryData(obj[2]);
                    }
                }
                packet.bitWriteBoolean(false);
                this.send(packet);
                this.methodeId = 0;
                if (this.firstmap) {
                    this.firstmap = false;
                    packet = new SocketMessage(5, 11, this);
                    packet.bitWriteBoolean(true); //html
                    packet.bitWriteBoolean(false); //alerte
                    packet.bitWriteString(`\n<font color=\'#022ebf\'>Bienvenue sur <font color=\'#bf0202\'><a href="https://github.com/GregVido/blablaland.js" target="_blank">blablaland.js</a></font> ! [v0.0.2] \
                    \nDévelopper : <font color=\'#bf0202\'><a href="https://www.youtube.com/gregvido" target="_blank" >GregVido</a></font></font>`);
                    this.send(packet);
                }
            }
        }
    }
}

class BblLogged extends BblCamera {
    constructor() {
        super();
        this.uid = 0;
        this.pid = 1;
        this.sex = 0;
        this.pseudo = "Greg";
        this.grade = 0;
        this.xp = 300;
        this.GPTimer = 0;
        this.firstmap = true;
        this.mainUser = {
            skinId: 7,
            skinColor: [0, 0, 88, 44, 44, 58, 0, 0, 0, 0],
            oldSkinColor: [],
            jump: 0,
            walk: 0,
            shiftKey: false,
            direction: true,
            onFloor: false,
            underWater: false,
            grimpe: false,
            accroche: false,
            dodo: false,
            position: { x: respawn[this.mapId][0], y: respawn[this.mapId][1] },
            speed: { x: 0, y: 0 },
            surfaceBody: 0,
            dodoSid:0,
            chatColor:"0129402a0a20333334"
        };
        this.bbl = 0;
        this.isTouriste = true;
        this.fxUser = {};
    }
    sendMsg(text, data={}) {
        var packet = new SocketMessage(5, 11, this);
        packet.bitWriteBoolean(data.HTML ? data.HTML : false); //html
        packet.bitWriteBoolean(data.ALERTE ? data.ALERTE : false); //alerte
        packet.bitWriteString(text);
        data.ALL ? this.map.maps[this.mapId].sendAll(packet) : this.send(packet);
    }
    reloadPlayerState(methode=4, position=true) {
        var packet = new SocketMessage(5, 9, this);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_USER_PID, this.pid);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_METHODE_ID, methode);
        packet = this.writePlayerState(packet, position, true, true);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_METHODE_ID, methode);
        this.map.maps[this.mapId].sendAll(packet);
    }
    updateDodo(activ) {
        if(activ != this.mainUser.dodo) {
            var packet = new SocketMessage(5, 5, this);
            packet.bitWriteUnsignedInt(GlobalProperties.BIT_USER_PID, this.pid)
            packet.bitWriteBoolean(activ)
            this.map.maps[this.mapId].sendAll(packet);
            this.mainUser.dodo = activ;
        }
        if(!activ) {
            this.mainUser.dodoSid++;
            const last_id = this.mainUser.dodoSid;
            var _this = this;
            setTimeout(function () {
                if(_this.mainUser.dodoSid == last_id) {
                    _this.updateDodo(true);
                }
            }, 60000);
        }
    }
    parsedEventMessage(type, stype, loc5) {
        super.parsedEventMessage(type, stype, loc5);
        var packet;
        if (type == 1) {
            if (stype == 2) {
                var sessionUser = loc5.bitReadString();
                for (var id in this.server.database) {
                    if (this.server.database[id].session == sessionUser) {
                        this.pseudo = this.server.database[id].pseudo;
                        this.mainUser.skinColor = this.server.database[id].skin.color;
                        this.mainUser.skinId = this.server.database[id].skin.id;
                        this.mapId = this.server.database[id].map.id;
                        this.mainUser.position.x = this.server.database[id].skin.posX;
                        this.mainUser.position.y = this.server.database[id].skin.posY;
                        this.mainUser.direction = this.server.database[id].skin.direction;
                        this.xp = this.server.database[id].xp;
                        this.sex = this.server.database[id].sexe;
                        this.uid = id;
                        this.bbl = this.server.database[id].bbl;
                        this.mainUser.chatColor = this.server.database[id].chatColor;
                        if(this.server.database[id].role == "Admin") this.grade = 1000;
                        this.isTouriste = false;
                    }
                }
                packet = new SocketMessage(2, 1);
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_USER_ID, this.uid);
                packet.bitWriteString(this.pseudo);
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_GRADE, this.grade);
                packet.bitWriteUnsignedInt(32, this.xp);
                this.send(packet);
            } else if (stype == 4) {
                var text = loc5.bitReadString();
                var action = loc5.bitReadUnsignedInt(3);
                var commandes = text.split(" ");
                if(text == "!info") {
                    packet = new SocketMessage(5, 11, this);
                    packet.bitWriteBoolean(true); //html
                    packet.bitWriteBoolean(false); //alerte
                    packet.bitWriteString(`${this.mapId}: [${this.mainUser.position.x}, ${this.mainUser.position.y}],`);
                    this.send(packet);
                    return;
                } else if(commandes[0] == "!tp") {
                    this.teleportToMap(this.cameraId, parseInt(commandes[1]), this.serverId, 4);
                    return;
                }
                packet = new SocketMessage(5, 7, this);
                packet.bitWriteBoolean(true); //html
                packet.bitWriteBoolean(false); //modo
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_USER_PID, this.pid);
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_USER_ID, this.uid);
                packet.bitWriteUnsignedInt(3, this.sex);
                packet.bitWriteString(this.pseudo);
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_SERVER_ID, this.serverId);
                packet.bitWriteString(text);
                packet.bitWriteUnsignedInt(3, action);
                this.map.maps[this.mapId].sendAll(packet);
                this.updateDodo(false);
            } else if (stype == 8) {
                var packId = loc5.bitReadUnsignedInt(GlobalProperties.BIT_SMILEY_PACK_ID);
                var smileId = loc5.bitReadUnsignedInt(GlobalProperties.BIT_SMILEY_ID);
                var data = loc5.bitReadBinaryData();
                var playcallback = loc5.bitReadBoolean();
                packet = new SocketMessage(5, 8, this);
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_USER_PID, this.pid);
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_SMILEY_PACK_ID, packId);
                packet.bitWriteUnsignedInt(GlobalProperties.BIT_SMILEY_ID, smileId);
                packet.bitWriteBinaryData(data);
                this.map.maps[this.mapId].sendAll(packet, this);
                this.updateDodo(false);
            } else if (stype == 7) {
                this.updateDodo(true);
            } else if (stype == 9) {
                var msg = loc5.bitReadString();
                var methode = loc5.bitReadUnsignedInt(8);
                this.die(msg, methode);
            } else if (stype == 10) {
                this.mainUser.position.y = 5000;
                this.mainUser.position.x = 35000;
                if(this.mapId in respawn) {
                    this.mainUser.position.x = respawn[this.mapId][0];
                    this.mainUser.position.y = respawn[this.mapId][1];
                }
                this.mainUser.underWater = false;
                this.mainUser.grimpe = false;
                this.mainUser.accroche = false;
                this.mainUser.speed.x = 0;
                this.mainUser.speed.y = 0;
                this.reloadPlayerState();
            } else if (stype == 16) {
                const folder = ["skin", "fx", "map", "smiley"];
                const name = ["skin.swf", "fx.swf", "map.swf", "SmileyPack.swf"]
                const type = loc5.bitReadUnsignedInt(4) - 1;
                const id = loc5.bitReadUnsignedInt(16);
                const byteReceveid = loc5.bitReadUnsignedInt(32);
                if(!fs.existsSync(`site-web/data/${folder[type]}/${id}/`)) {
                    this.sendError("Les fichiers clients ne sont pas valide.");
                    return;
                }
                const file = fs.readFileSync(`site-web/data/${folder[type]}/${id}/${name[type]}`);
                var _this = this;
                zlib.inflate(file.slice(8), function(err, buf) {
                    var data = Buffer.from(file.slice(0, 8)); 
                    const unzip = Buffer.concat([data, buf]);
                    var byte = 0;
                    for (var loc4 = 0; loc4 < unzip.length - 8; loc4 += 5) {
                        byte = byte + loc4 * unzip[loc4 + 8];
                    }
                    byte = ToUint32(byte);
                    if(byte != byteReceveid) _this.sendError("Les fichiers clients ne sont pas valide.");
                });
            } else if (stype == 18) {
                var id = loc5.bitReadUnsignedInt(32);
                if(id == this.chatBuffer.id) {
                    const chat = fs.readFileSync(`site-web/chat/chat.swf`);
                    var _this = this;
                    zlib.inflate(chat.slice(8), function(err, buf) {
                        var data = Buffer.from(chat.slice(0, 8)); 
                        const unzip = Buffer.concat([data, buf]);
                        for(var loc19 = 0; loc19 < _this.chatBuffer.size; loc19++) {
                            const loc20 = (loc19 + _this.chatBuffer.position) % (unzip.length - 8);
                            _this.allowChat = true;
                            if(unzip[loc20 + 8] != loc5.bitReadUnsignedInt(8)){
                                _this.sendError("Les fichiers clients ne sont pas valide.");
                                return;
                            }
                        }
                    });
                } else _this.sendError("Les fichiers clients ne sont pas valide.");
            }
        } else if (type == 2) {
            if(!this.mapLoaded) return;
            if (stype == 2 || stype == 1) {
                var mapId = loc5.bitReadUnsignedInt(GlobalProperties.BIT_MAP_ID);
                var GP_Timer = loc5.bitReadUnsignedInt(32);
                this.GPTimer = GP_Timer;
                this.readPlayerState(loc5);
                if (stype == 2) {
                    packet = new SocketMessage(5, 4, this);
                    packet.bitWriteUnsignedInt(GlobalProperties.BIT_USER_PID, this.pid);
                    packet.bitWriteUnsignedInt(32, GP_Timer);
                    packet = this.writePlayerState(packet, true, true, true);
                    packet.bitWriteUnsignedInt(2, loc5.bitReadUnsignedInt(2));
                    packet.bitWriteUnsignedInt(24, loc5.bitReadUnsignedInt(24));
                    packet.bitWriteUnsignedInt(8, loc5.bitReadUnsignedInt(8));
                    packet.bitWriteSignedInt(18, loc5.bitReadSignedInt(18));
                    packet.bitWriteSignedInt(18, loc5.bitReadSignedInt(18));
                } else {
                    this.updateDodo(false);
                    packet = new SocketMessage(5, 3, this);
                    packet.bitWriteUnsignedInt(GlobalProperties.BIT_USER_PID, this.pid);
                    packet.bitWriteUnsignedInt(32, GP_Timer);
                    packet = this.writePlayerState(packet, true, true, true);
                }
                this.map.maps[this.mapId].sendAll(packet, this);
                this.socketUnlock();
                if(!this.allowChat)this.sendError("");
            } else if (stype == 4) {
                const app_id = loc5.bitReadUnsignedInt(5);
                if(app_id == 1) {
                    this.saveData("chatColor", loc5.bitReadString());
                    this.sendMsg("Les couleurs du chat on correctement été modifié.");
                }
            }
        }
        else if (type == 6) {
            var skinColor = [];
            if (stype == 1) {
                for(const x of Array(10).keys()) {
                    skinColor.push(loc5.bitReadUnsignedInt(8));
                }
                this.writeUserFXChange(7600, {
                    loc17: true,
                    id: 3,
                    sid: 7600,
                    active: true,
                    data: skinColor,
                    map: true
                });
            } else if (stype == 6 || stype == 7) {
                var activ = (stype == 6) ? 1 : 0;
                var fxSid = loc5.bitReadUnsignedInt(GlobalProperties.BIT_FX_SID);
                var skinByte = loc5.bitReadUnsignedInt(32);
                var delay = loc5.bitReadBoolean();
                var latence = loc5.bitReadBoolean();
                var userActivity = loc5.bitReadBoolean();
                var transmitSelfEvent = loc5.bitReadBoolean();
                if (activ) {
                    var persistant = loc5.bitReadBoolean();
                    var uniq = loc5.bitReadBoolean();
                    var durationBlend = loc5.bitReadUnsignedInt(2);
                    var hasDuration = loc5.bitReadBoolean();
                    if (hasDuration) var duration = loc5.bitReadUnsignedInt(16);
                }
                var hasData = loc5.bitReadBoolean();
                var data = null;
                if (hasData) {
                    data = loc5.bitReadBinaryData();
                }
                var skinAction = loc5.bitReadUnsignedInt(GlobalProperties.BIT_SKIN_ACTION);
                this.fxUser[fxSid] = this.fxManager.writeUserFXChange(this, {
                    loc17: true,
                    id: 5,
                    sid: fxSid,
                    active: activ,
                    data: hasData ? [skinByte, delay, data] : [skinByte, delay],
                    map: true
                });
                if(!activ) this.fxUser[fxSid] = {};
            } else if (stype == 12) {
                const fx_id = loc5.bitReadUnsignedInt(4);
                const fx_sid = loc5.bitReadUnsignedInt(16);
                const user_id = loc5.bitReadUnsignedInt(GlobalProperties.BIT_USER_ID);
                const activ = loc5.bitReadBoolean();
                const floor = loc5.bitReadUnsignedInt(8);
                var user = this.getUserByUid(user_id);
                if(user_id == this.uid) {
                    this.die(this.pseudo + " a été tué par sa propre bobombe :)");
                } else if(user) {
                    this.die(this.pseudo + " a été tué par une bobombe placé par " + user.pseudo);
                } else {
                    this.die(this.pseudo + " a été tué par une bobombe placé par un blablateur.");
                }
            } else if (stype == 8) {
                var objectId = loc5.bitReadUnsignedInt(32);
                var hasData = loc5.bitReadBoolean();
                var binaryData = null;
                if(hasData) binaryData = loc5.bitReadBinaryData();
                if(objectId == 10000) {
                    var p = new SocketMessage();
                    p.bitWriteUnsignedInt(32, GlobalProperties.getServerTime()[0]);
                    var id = this.writeMapFXChange({
                        id: 5,
                        sid: objectId,
                        active: true,
                        data: [2, 1, p],
                        map: true
                    });
                    var map = this.map.maps[this.mapId];
                    setTimeout(function () {
                        map.delete(id);
                    }, 10000);
                } else if(objectId == 10001) {
                    var p = new SocketMessage();
                    p.bitWriteUnsignedInt(32, GlobalProperties.getServerTime()[0]);
                    this.writeUserFXChange(objectId, {
                        loc17: true,
                        id: 6,
                        sid: objectId,
                        active: true,
                        data: [2, 2, p],
                        map: true
                    });
                    var _this = this;
                    setTimeout(function () {
                        _this.fxUser[objectId] = {};
                    }, 10000);
                } else if(objectId == 10002) {
                    if(hasData) {
                        const tpId = binaryData.bitReadUnsignedInt(GlobalProperties.BIT_MAP_ID);
                        if(!([55, 446, 264, 251, 252, 253, 254, 255, 256].includes(tpId))) {
                            this.teleportToMap(this.cameraId, tpId, this.serverId, 4);
                        }
                    }
                } else if(objectId == 10003) {
                    this.writeUserFXChange(7600, {
                        loc17: true,
                        id: 3,
                        sid: 7600,
                        active: false,
                        data: skinColor,
                        map: true
                    });
                    this.fxManager.writeUserFXChange(this, {
                        loc17: true,
                        id: 6,
                        sid: objectId,
                        active: true,
                        data: [2, 4],
                        map: false
                    });
                } else if(objectId == 10004) {
                    if(hasData) {
                        if(this.server.variable.maps[this.mapId][6] == 3) {
                            this.sendMsg("Cette map est protégée contre les bombes ^^");
                            return;
                        }
                        const posX = binaryData.bitReadSignedInt(16);
                        const posY = binaryData.bitReadSignedInt(16);
                        const surface = binaryData.bitReadUnsignedInt(8);
                        const name = binaryData.bitReadString();
                        var p = new SocketMessage();
                        p.bitWriteSignedInt(16, posX);
                        p.bitWriteSignedInt(16, posY);
                        p.bitWriteUnsignedInt(8, surface);
                        p.bitWriteString(name);
                        p.bitWriteUnsignedInt(GlobalProperties.BIT_USER_ID, this.uid);
                        var data = {
                            id: 5,
                            sid: objectId,
                            active: true,
                            data: [2, 5, p],
                            map: true,
                            close: 1
                        };
                        var id = this.writeMapFXChange(data);
                        var map = this.map.maps[this.mapId];
                        var _this = this;
                        setTimeout(function () {
                            data.active = false;
                            _this.fxManager.writeMapFXChange(_this, data);
                            map.delete(id);
                        }, parseInt(Math.random() * 15) * 1000);
                    }
                }
                console.log(objectId);
            } else if(stype == 15) {
                const fx_id = loc5.bitReadUnsignedInt(GlobalProperties.BIT_FX_ID);
                if(fx_id == 14) {
                    if(loc5.bitReadBoolean()) {
                        const new_server = loc5.bitReadUnsignedInt(GlobalProperties.BIT_SERVER_ID);
                        if(new_server != this.serverId) {
                            var packet = new SocketMessage(4, 2, this);
                            packet.bitWriteUnsignedInt(GlobalProperties.BIT_MAP_ID, this.mapId);
                            packet.bitWriteUnsignedInt(GlobalProperties.BIT_SERVER_ID, new_server);
                            packet.bitWriteUnsignedInt(GlobalProperties.BIT_MAP_FILEID, this.mapId);
                            packet.bitWriteUnsignedInt(GlobalProperties.BIT_METHODE_ID, 4);
                            this.send(packet);
                        }
                    }
                }
            }
        }
        else if(type == 9) {
            if(stype == 1) {
                const s_type = loc5.bitReadUnsignedInt(3);
                if(this.mapId == 445 || this.mapId == 408) {
                    const planete = loc5.bitReadUnsignedInt(GlobalProperties.BIT_MAP_PLANETID);
                    console.log(planete);
                    if(planete == 1) {
                        this.transportToPlanete = 408;
                    } else if(planete == 0) {
                        this.transportToPlanete = 445;
                    }
                    this.teleportToMap(this.cameraId, 355, this.serverId, 0);
                } else if(this.mapId == 355) {
                    if(this.transportToPlanete != 0) this.teleportToMap(this.cameraId, this.transportToPlanete, this.serverId, 0);
                    this.transportToPlanete = 0;
                } else if(this.mapId == 343) {
                    var loc1 = true;
                    var p = new SocketMessage();
                    p.bitWriteUnsignedInt(3, 0);
                    if(s_type == 1 && this.sex == 1) {
                        loc1 = false;
                        this.mainUser.position.x = 94900;
                        this.teleportToMap(this.cameraId, 342, this.serverId, 0);
                    } else if(s_type == 0 && this.sex == 2) {
                        loc1 = false;
                        this.mainUser.position.x = 100;
                        this.teleportToMap(this.cameraId, 344, this.serverId, 0);
                    } else if(s_type == 2) {
                        loc1 = false;
                    } else if(s_type == 3) {
                        if(this.bbl < 1) loc1 = false;
                        p = new SocketMessage();
                        p.bitWriteUnsignedInt(3, 1);
                        p.bitWriteBoolean(true); // true = animation buy
                        p.bitWriteBoolean(false); // true = gagné
                        p.bitWriteUnsignedInt(GlobalProperties.BIT_SKIN_ID, 4); //kdo, voir swf (343)
                        if(loc1) this.bbl--;
                    }
                    if(loc1) {
                        this.fxManager.writeUserFXChange(this, {
                            loc17: true,
                            id: 8,
                            sid: 0,
                            active: true,
                            data: [p],
                            map: false
                        });
                    }
                } else if(this.mapId == 11) {
                    var code = "";
                    for(var i = 0; i < 4; i++) {
                        code += loc5.bitReadUnsignedInt(4).toString();
                    }
                    if(code == "7641") {
                        this.teleportToMap(this.cameraId, 354, this.serverId, 0);
                    }
                    var p = new SocketMessage();
                    p.bitWriteUnsignedInt(3, 0);
                    p.bitWriteBoolean(code == "7641");
                    this.fxManager.writeUserFXChange(this, {
                        loc17: true,
                        id: 8,
                        sid: 0,
                        active: true,
                        data: [p],
                        map: false
                    });
                }
            }
            if(stype == 2) {
                const id = loc5.bitReadUnsignedInt(16);
                if(id == 1) {
                    const camera = loc5.bitReadUnsignedInt(GlobalProperties.BIT_CAMERA_ID)
                    var p = new SocketMessage();
                    p.bitWriteUnsignedInt(32, GlobalProperties.getServerTime()[0]);
                    p.bitWriteUnsignedInt(10, GlobalProperties.getServerTime()[1]);
                    this.writeUserFXChange(this.fxManager.fxsid, {
                        loc17: false,
                        id: 6,
                        sid: this.fxManager.fxsid,
                        active: true,
                        data: [24, 0, p],
                        map: false
                    });
                }
            }
        }
    }
    writeMapFXChange(data) {
        var mapObject = this.fxManager.writeMapFXChange(this, data);
        var map = this.map.maps[this.mapId];
        var id = map.addObject(mapObject);
        return id;
    }
    writeUserFXChange(objectId, data) {
        this.fxUser[objectId] = this.fxManager.writeUserFXChange(this, data);
        if(!data.active) this.fxUser[objectId] = {};
        this.fxManager.fxsid++;
    }
    writePlayerState(param1, position = false, skin = false, power=false) {
        param1.bitWriteSignedInt(2, this.mainUser.jump);
        param1.bitWriteSignedInt(2, this.mainUser.walk);
        param1.bitWriteBoolean(this.mainUser.shiftKey);
        param1.bitWriteBoolean(this.mainUser.direction);
        param1.bitWriteBoolean(this.mainUser.onFloor);
        param1.bitWriteBoolean(this.mainUser.underWater);
        param1.bitWriteBoolean(this.mainUser.grimpe);
        param1.bitWriteBoolean(this.mainUser.accroche);
        param1.bitWriteBoolean(position);
        if (position) {
            param1.bitWriteSignedInt(21, this.mainUser.position.x);
            param1.bitWriteSignedInt(21, this.mainUser.position.y);
            param1.bitWriteUnsignedInt(8, this.mainUser.surfaceBody);
            param1.bitWriteSignedInt(18, this.mainUser.speed.x);
            param1.bitWriteSignedInt(18, this.mainUser.speed.y);
        }
        param1.bitWriteBoolean(skin);
        if (skin) {
            param1.bitWriteUnsignedInt(GlobalProperties.BIT_SKIN_ID, this.mainUser.skinId);
            for (var i in this.mainUser.skinColor) {
                param1.bitWriteUnsignedInt(8, this.mainUser.skinColor[i]);
            }
            param1.bitWriteBoolean(this.mainUser.dodo);
        }
        if(power) {
            for(var i in this.fxUser) {
                if(Object.keys(this.fxUser[i]).length >= 2) {
                    param1.bitWriteBoolean(true);
                    param1.bitWriteUnsignedInt(GlobalProperties.BIT_FX_ID, this.fxUser[i][0])
                    param1.bitWriteUnsignedInt(GlobalProperties.BIT_FX_SID, this.fxUser[i][1])
                    param1.bitWriteBinaryData(this.fxUser[i][2])
                }
            }
        }
        param1.bitWriteBoolean(false);
        return param1;
    }
    readPlayerState(p) {
        this.mainUser.jump = p.bitReadSignedInt(2);
        this.mainUser.walk = p.bitReadSignedInt(2);
        this.mainUser.shiftKey = p.bitReadBoolean();
        this.mainUser.direction = p.bitReadBoolean();
        this.mainUser.onFloor = p.bitReadBoolean();
        this.mainUser.underWater = p.bitReadBoolean();
        this.mainUser.grimpe = p.bitReadBoolean();
        this.mainUser.accroche = p.bitReadBoolean();
        if (p.bitReadBoolean()) {
            this.mainUser.position.x = p.bitReadSignedInt(21);
            this.mainUser.position.y = p.bitReadSignedInt(21);
            this.mainUser.surfaceBody = p.bitReadUnsignedInt(8);
            this.mainUser.speed.x = p.bitReadSignedInt(18);
            this.mainUser.speed.y = p.bitReadSignedInt(18);
        }
        if (p.bitReadBoolean()) {
            this.mainUser.skinColor = {};
            for (var i in Array(10).keys()) {
                this.mainUser.skinColor[i] = p.bitReadUnsignedInt(8);
            }
        }
    }
}

class Client extends BblLogged {
    constructor(socket, map, server, fxManager) {
        super();
        this.connected = false;
        this.map = map;
        this.mapPid = 0;
        this.socket = socket;
        this.server = server;
        this.serverId = server.id;
        this.fxManager = fxManager;
        this.inCmpt = 12;
        this.outCmpt = 12;
        socket.on('data', this.socketData.bind(this));
        socket.on('error', this.errorClient.bind(this));
        socket.on('close', this.connectionLost.bind(this));
    }
    errorClient(err) {
        this.socket.destroy();
        this.connectionLost();
    }
    saveData(type, value) {
        const stype = type.split(".");
        if(stype.length > 1) {
            this.server.database[this.uid][stype[0]][stype[1]] = value;
        } else {
            this.server.database[this.uid][type] = value;
        }
        fs.writeFileSync("database.json", JSON.stringify(this.server.database, null, 4), "utf8");
    }
    connectionLost() {
        if (this.connected) {
            this.methodeId = 3;
            if(this.uid) {
                this.saveData("map.id", this.mapId);
                this.saveData("skin.posX", this.mainUser.position.x);
                this.saveData("skin.posY", this.mainUser.position.y);
                this.saveData("skin.direction", this.mainUser.direction);
                fs.writeFileSync("database.json", JSON.stringify(this.server.database, null, 4), "utf8");
            }
            if (this.mapId in this.map.maps) this.map.leaveMap(this.mapId, this);
            this.server.delClient(this);
        }
    }
    socketData(data) {
        var str_data = data.toString();
        if (str_data == "<policy-file-request/>\x00") {
            this.socket.write("<?xml version=\"1.0\"?><cross-domain-policy><allow-access-from domain=\"*\" to-ports=\"*\" /></cross-domain-policy>\x00");
            return;
        }
        var data_split = bsplit(data, new Buffer.from("\x00"));
        data_split.pop();
        for (var i in data_split) {
            this.inCmpt++;
            if (this.inCmpt >= 65530) this.inCmpt = 12;
            var loc5 = new SocketMessage();
            loc5.readMessage(data_split[i]);
            var loc4 = loc5.bitReadUnsignedInt(16);
            var type = loc5.bitReadUnsignedInt(GlobalProperties.BIT_TYPE),
                stype = loc5.bitReadUnsignedInt(GlobalProperties.BIT_STYPE);
            this.parsedEventMessage(type, stype, loc5);
        }
    }
    parsedEventMessage(type, stype, loc5) {
        var packet;
        if(config.showPacketsType == "true") console.log(type, stype);
        super.parsedEventMessage(type, stype, loc5);
        if (type == 1) {
            if (stype == 1) {
                packet = new SocketMessage(1, 1);
                packet.bitWriteUnsignedInt(32, GlobalProperties.getServerTime()[0]);
                packet.bitWriteUnsignedInt(10, GlobalProperties.getServerTime()[1]);
                this.send(packet);
            } else if (stype == 3) {
                this.pid = this.server.pid;
                packet = new SocketMessage(1, 3);
                packet.bitWriteUnsignedInt(24, this.pid);
                this.pseudo = "Touriste_" + this.pid;
                this.send(packet);
            } else if (stype == 6) {
                packet = new SocketMessage();
                this.send(this.server.variable.variables);
            } else if (stype == 19) {
                packet = new SocketMessage();
                packet.readMessage(loc5.bitReadString(), this);
                this.send(packet);
            } else if (stype == 13) {
                packet = new SocketMessage(1, 8);
                const serverid = loc5.bitReadUnsignedInt(GlobalProperties.BIT_SERVER_ID);
                while (loc5.bitReadBoolean()) {
                    const mapid = loc5.bitReadUnsignedInt(GlobalProperties.BIT_MAP_ID);
                    packet.bitWriteBoolean(true);
                    packet.bitWriteUnsignedInt(GlobalProperties.BIT_MAP_ID, mapid);
                    if(mapid in this.server.map.maps) packet.bitWriteUnsignedInt(10, Object.keys(this.server.map.maps[mapid].userList).length);
                    else packet.bitWriteUnsignedInt(10, 0);
                }
                packet.bitWriteBoolean(false);
                this.send(packet);
            }
        }
    }
    socketUnlock() {
        this.send(new SocketMessage(1, 11));
    }
    send(param1, param2 = false) {
        this.outCmpt++;
        if (this.outCmpt >= 65530) this.outCmpt = 12;
        var loc3 = new SocketMessage();
        loc3.bitWriteUnsignedInt(16, this.outCmpt);
        var loc4 = loc3.exportMessage();
        var socket = new ByteArray();
        socket.writeByte(loc4);
        loc4 = param1.exportMessage();
        socket.writeByte(loc4);
        socket.writeByte(0);
        try {
            this.socket.write(socket.getBuffer());
        } catch(e) {}
    }
}

class Map {
    constructor() {
        this.userList = {};
        this.objectList = {};
        this.objectPid = 140;
        this.pid = 0;
    }
    addObject(mapObject) {
        this.objectList[this.objectPid] = mapObject;
        this.objectPid++;
        return this.objectPid - 1;
    }
    delete(id) {
        this.objectList[id] = {};
    }
    addUser(user) {
        this.userList[this.pid] = user;
        user.mapPid = this.pid;
        this.pid++;
        var packet = new SocketMessage(5, 1, user);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_USER_ID, user.uid);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_USER_PID, user.pid);
        packet.bitWriteString(user.pseudo);
        packet.bitWriteUnsignedInt(3, user.sex);
        packet.bitWriteUnsignedInt(32, 0);
        packet = user.writePlayerState(packet, true, true, true);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_METHODE_ID, user.methodeId);
        this.sendAll(packet, user);
    }
    deleteUser(user) {
        delete this.userList[user.mapPid];
        var packet = new SocketMessage(5, 2, user);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_USER_PID, user.pid);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_METHODE_ID, user.methodeId);
        this.sendAll(packet);
    }
    sendAll(packet, me = false) {
        for (var i in this.userList) {
            if (this.userList[i] != me) this.userList[i].send(packet);
        }
    }
}

class MapManager {
    constructor() {
        this.maps = {};
    }
    createMap(id) {
        if (!(id in this.maps)) this.maps[id] = new Map();
    }
    joinMap(id, user) {
        this.createMap(id);
        this.maps[id].addUser(user);
    }
    leaveMap(id, user) {
        this.maps[id].deleteUser(user);
    }
}

class FxManager {
    constructor() {
        this.fxsid = 4000;
    }
    writeUserFXChange(user, data) {
        var packet = new SocketMessage(5, 6, user);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_USER_PID, user.pid);
        packet.bitWriteBoolean(data.loc17);
        packet.bitWriteBoolean(data.active);
        if (!data.active) {
            if(!data.close) data.close = 0;
            packet.bitWriteUnsignedInt(2, data.close);
        }
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_FX_ID, data.id);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_FX_SID, data.sid);
        var p = this.executeFXUserMessage(data);
        packet.bitWriteBinaryData(p);
        if(data.map) user.map.maps[user.mapId].sendAll(packet);
        else user.send(packet);
        return [data.id, data.sid, p];
    }
    executeFXUserMessage(data) {
        var p = new SocketMessage();
        if (data.id == 1) {
            p.bitWriteUnsignedInt(24, data.lightEffectColor);
        } else if (data.id == 2) {
            p.bitWriteBoolean(data.active);
        } else if (data.id == 3) {
            for(var i in data.data) {
                p.bitWriteUnsignedInt(8, data.data[i]);
             }
        } else if (data.id == 4) {
            // a retravailler
            p.bitWriteBoolean(true);
            p.bitWriteUnsignedInt(6, data.data[0]);
            if(data.data[0] == 5) p.bitWriteUnsignedInt(GlobalProperties.BIT_SKIN_ID, data[1]);
            p.bitWriteBoolean(false);
        } else if (data.id == 5) {
            p.bitWriteUnsignedInt(32, data.data[0]);
            p.bitWriteBoolean(data.data[1]);
            if (data.data.length > 2) {
                p.bitWriteBoolean(true);
                p.bitWriteBinaryData(data.data[2]);
            } else {
                p.bitWriteBoolean(false);
            }
        } else if (data.id == 6) {
            p.bitWriteUnsignedInt(GlobalProperties.BIT_FX_ID, data.data[0]);
            p.bitWriteUnsignedInt(GlobalProperties.BIT_FX_SID, data.data[1]);
            if (data.data.length > 2) {
                p.bitWriteBoolean(true);
                p.bitWriteBinaryData(data.data[2]);
            } else {
                p.bitWriteBoolean(false);
            }
        } else if (data.id == 8) {
            p = data.data[0];
        }
        return p;
    }
    writeMapFXChange(user, data) {
        var packet = new SocketMessage(5, 10, user);
        packet.bitWriteBoolean(data.active);
        if (!data.active) {
            if(!data.close) data.close = 0;
            packet.bitWriteUnsignedInt(2, data.close);
        }
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_FX_ID, data.id);
        packet.bitWriteUnsignedInt(GlobalProperties.BIT_FX_SID, data.sid);
        var p = this.executeFXMapMessage(data);
        packet.bitWriteBinaryData(p);
        if(data.map) user.map.maps[user.mapId].sendAll(packet);
        else user.send(packet);
        return [data.id, data.sid, p];
    }
    executeFXMapMessage(data) {
        var p = new SocketMessage();
        if(data.id == 5) {
            p.bitWriteUnsignedInt(GlobalProperties.BIT_FX_ID, data.data[0]);
            p.bitWriteUnsignedInt(GlobalProperties.BIT_FX_SID, data.data[1]);
            if (data.data.length > 2) {
                p.bitWriteBoolean(true);
                p.bitWriteBinaryData(data.data[2]);
            } else {
                p.bitWriteBoolean(false);
            }
        }
        return p;
    }
}

var fxManager = new FxManager();

class ServerBBL {
    constructor(port) {
        this.map = new MapManager();
        var server = net.createServer(this.getNewUser.bind(this));
        server.listen(port);
        this.variable = new variables(port - 12301);
        this.userList = {};
        this.database = null;
        this.id = 12301 - port;
        this.pid = 1;
    }
    addClient(user) {
        this.userList[user.pid] = user;
        var packet = new SocketMessage(1, 7);
        packet.bitWriteUnsignedInt(16, Object.keys(this.userList).length); //origine
        packet.bitWriteUnsignedInt(16, Object.keys(this.userList).length); //total
        packet.bitWriteUnsignedInt(16, 0); //legende
        packet.bitWriteUnsignedInt(16, 0); //fury
        this.sendAll(packet);
    }
    delClient(user) {
        delete this.userList[user.pid];
    }
    sendAll(packet, me = false) {
        for (var i in this.userList) {
            if (this.userList[i] != me) this.userList[i].send(packet);
        }
    }
    getNewUser(socket) {
        new Client(socket, this.map, this, fxManager);
        this.pid++;
    }
}

module.exports = ServerBBL;
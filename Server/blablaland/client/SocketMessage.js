
var GlobalProperties = require("../bbl/GlobalProperties.js");
var Binary = new require("./Binary.js");
var ByteArray = new require("./ByteArray.js");

class SocketMessage extends Binary {
    constructor(type = null, stype = null, users = null) {
        super();
        if (type != null && stype != null) {
            this.bitWriteUnsignedInt(GlobalProperties.BIT_TYPE, type);
            this.bitWriteUnsignedInt(GlobalProperties.BIT_STYPE, stype);
            if (users != null) {
                if (type == 4) this.bitWriteUnsignedInt(GlobalProperties.BIT_CAMERA_ID, users.cameraId);
                if (type == 5) {
                    this.bitWriteUnsignedInt(GlobalProperties.BIT_MAP_ID, users.mapId);
                    this.bitWriteUnsignedInt(GlobalProperties.BIT_SERVER_ID, users.serverId);
                }
            }

        }
    }
    readMessage(param1, param2=null) {
        if (typeof param1 == "string") return eval(param1);
        for (var loc2 = 0; loc2 < param1.length; loc2++) {
            if (param1[loc2] == 1) {
                loc2++;
                this.writeByte(param1[loc2] == 2 ? 1 : 0);
            } else this.writeByte(param1[loc2]);
        }
        this.bitLength = this.length * 8;
    }
    exportMessage() {
        var loc1 = new ByteArray();
        for (var loc2 = 0; loc2 < this.length; loc2++) {
            if (this[loc2] == 0) {
                loc1.writeByte(1);
                loc1.writeByte(3);
            } else if (this[loc2] == 1) {
                loc1.writeByte(1);
                loc1.writeByte(2);
            }
            else {
                loc1.writeByte(this[loc2]);
            }
        }
        return loc1;
    }
}

module.exports = SocketMessage;
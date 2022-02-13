var fs = require('fs');
var bsplit = require('buffer-split');
var data = fs.readFileSync('variables.bin');
var GlobalProperties = require("../blablaland/bbl/GlobalProperties.js");
var SocketMessage = require("../blablaland/client/SocketMessage");
var result = {};
var data_split = bsplit(data, new Buffer("\x00"));
for (var i in data_split) {
    this.inCmpt++;
    if (this.inCmpt >= 65530) this.inCmpt = 12;
    var param1 = new SocketMessage();
    param1.readMessage(data_split[i]);
    var loc4 = param1.bitReadUnsignedInt(16);
    var type = param1.bitReadUnsignedInt(GlobalProperties.BIT_TYPE),
        stype = param1.bitReadUnsignedInt(GlobalProperties.BIT_STYPE);
    while(param1.bitReadBoolean()) {
        readBinary(param1);
    }
    while(param1.bitReadBoolean()) {
        const mapId = param1.bitReadUnsignedInt(GlobalProperties.BIT_MAP_ID);
        const map_file_id = param1.bitReadUnsignedInt(GlobalProperties.BIT_MAP_FILEID);
        const name = param1.bitReadString();
        const transportId = param1.bitReadUnsignedInt(GlobalProperties.BIT_TRANSPORT_ID);
        const mapXpos = param1.bitReadSignedInt(17);
        const mapYpos = param1.bitReadSignedInt(17);
        const meteoId = param1.bitReadUnsignedInt(5);
        const peace = param1.bitReadUnsignedInt(2);
        const regionId = param1.bitReadUnsignedInt(GlobalProperties.BIT_MAP_REGIONID);
        const planetId = param1.bitReadUnsignedInt(GlobalProperties.BIT_MAP_PLANETID);
        result[mapId] = [mapId, map_file_id, name, transportId, mapXpos, mapYpos, meteoId, peace, regionId, planetId];
    }
    fs.writeFileSync("variable.json", JSON.stringify(result), "utf8");
}

function readBinary(param1) {
    this.id = param1.bitReadUnsignedInt(GlobalProperties.BIT_TRANSPORT_ID);
    var loc2 = 0;
    while(param1.bitReadBoolean()) {
        var loc3 = param1.bitReadUnsignedInt(4);
        if(loc3 == 0) {
            while(param1.bitReadBoolean()) {
                const map_id = param1.bitReadUnsignedInt(GlobalProperties.BIT_MAP_ID);
                console.log(map_id);
            }
        } else if(loc3 == 1) {
            while(param1.bitReadBoolean()) {
                loc2 += param1.bitReadUnsignedInt(10) * 1000;
                const value = param1.bitReadUnsignedInt(5);
            }
        }
    }
}
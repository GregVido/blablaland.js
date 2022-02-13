var SocketMessage = require("../client/SocketMessage");
var GlobalProperties = require("../bbl/GlobalProperties.js");
var maps = require("./maps.js");

class variables {
    constructor(server_id) {
        this.serverList = [];

        this.binary = [
            [
                [0,
                    [104, 167, 176, 27]
                ],
                [1, [
                    [0, 0],
                    [5, 0],
                    [20, 1],
                    [5, 1],
                    [20, 2],
                    [5, 2],
                    [20, 3],
                    [5, 3],
                    [20, 2],
                    [5, 2],
                    [20, 1],
                    [5, 1],
                    [20, 0]
                ]
                ]
            ]
        ];
        this.maps = maps;
        this.servers = {
            12301: "Origine",
            12302: "Legende",
            12303: "Fury"
        };
        this.writeVariables(server_id);
    }
    writeVariables(serverId) {
        var p = new SocketMessage(1, 4);
        for (var binary in this.binary) {
            binary = this.binary[binary];
            p.bitWriteBoolean(true);
            this.writeBinary(p, 1, binary);
        }
        p.bitWriteBoolean(false);

        for (var id in this.maps) {
            p.bitWriteBoolean(true);
            var data = this.maps[id];
            p.bitWriteUnsignedInt(GlobalProperties.BIT_MAP_ID, id);
            p.bitWriteUnsignedInt(GlobalProperties.BIT_MAP_FILEID, data[0]);
            p.bitWriteString(data[1]);
            p.bitWriteUnsignedInt(GlobalProperties.BIT_TRANSPORT_ID, data[2]);
            p.bitWriteSignedInt(17, data[3]);
            p.bitWriteSignedInt(17, data[4]);
            p.bitWriteUnsignedInt(5, data[5]);
            p.bitWriteUnsignedInt(2, data[6]);
            p.bitWriteUnsignedInt(GlobalProperties.BIT_MAP_REGIONID, data[7]);
            p.bitWriteUnsignedInt(GlobalProperties.BIT_MAP_PLANETID, data[8]);
        }
        p.bitWriteBoolean(false);
        this.serverList.splice(0, this.serverList.length);
        for (var port in this.servers) {
            p.bitWriteBoolean(true)
            var name = this.servers[port];
            p.bitWriteString(name);
            p.bitWriteUnsignedInt(16, port);
            this.serverList.push(port);
        }
        p.bitWriteBoolean(false);
        p.bitWriteUnsignedInt(GlobalProperties.BIT_SERVER_ID, serverId);
        p.bitWriteUnsignedInt(8, 0);
        this.variables = p;
    }

    writeBinary(p, transport, liste) {
        p.bitWriteUnsignedInt(GlobalProperties.BIT_TRANSPORT_ID, transport);
        for (var data in liste) {
            data = liste[data];
            p.bitWriteBoolean(true);
            p.bitWriteUnsignedInt(4, data[0]);
            if (data[0] == 0) {
                for (var map_id in data[1]) {
                    map_id = data[1][map_id];
                    p.bitWriteBoolean(true);
                    p.bitWriteUnsignedInt(GlobalProperties.BIT_MAP_ID, map_id);
                }
                p.bitWriteBoolean(false);
            }
            else if (data[0] == 1) {
                for (var data2 in data[1]) {
                    data2 = data[1][data2];
                    p.bitWriteBoolean(true);
                    p.bitWriteUnsignedInt(10, data2[0]);
                    p.bitWriteUnsignedInt(5, data2[1]);
                }
                p.bitWriteBoolean(false);
            }
        }
        p.bitWriteBoolean(false);
    }
}

module.exports = variables;
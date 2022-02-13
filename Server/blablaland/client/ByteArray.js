class ByteArray extends Array {
    constructor() { super(); }
    writeByte(byte) {
        this.push(byte);
    }
    writeBoolean(bool) {
        this.writeByte(bool ? 1 : 0);
    }
    getBuffer() {
        var loc1 = new Array();
        for (var i in this) {
            if (typeof this[i] == "object") for (var a in this[i]) loc1.push(this[i][a]);
            else loc1.push(this[i]);
        }
        return Buffer.from(loc1);
    }
}

module.exports = ByteArray;
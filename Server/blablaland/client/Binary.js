var ByteArray = new require("./ByteArray.js");

class Binary extends ByteArray {
    constructor() {
        super();
        this.powList = new Array();
        var _loc1_ = 0;
        while (_loc1_ <= 32) {
            this.powList.push(Math.pow(2, _loc1_));
            _loc1_++;
        }
        this.bitLength = 0;
        this.bitPosition = 0;
    }
    bitReadString() {
        var _loc4_ = 0;
        var _loc1_ = "";
        var _loc2_ = this.bitReadUnsignedInt(16);
        var _loc3_ = 0;
        while (_loc3_ < _loc2_) {
            _loc4_ = this.bitReadUnsignedInt(8);
            if (_loc4_ == 255) {
                _loc4_ = 8364;
            }
            _loc1_ = _loc1_ + String.fromCharCode(_loc4_);
            _loc3_++;
        }
        return _loc1_;
    }
    bitReadBoolean() {
        if (this.bitPosition == this.bitLength) {
            return false;
        }
        var _loc1_ = Math.floor(this.bitPosition / 8);
        var _loc2_ = this.bitPosition % 8;
        this.bitPosition++;
        return (this[_loc1_] >> 7 - _loc2_ & 1) == 1;
    }
    bitReadUnsignedInt(param1) {
        var _loc4_ = NaN;
        var _loc5_ = NaN;
        var _loc6_ = undefined;
        var _loc7_ = undefined;
        var _loc8_ = NaN;
        if (this.bitPosition + param1 > this.bitLength) {
            this.bitPosition = this.bitLength;
            return 0;
        }
        var _loc2_ = 0;
        var _loc3_ = param1;
        while (_loc3_ > 0) {
            _loc4_ = Math.floor(this.bitPosition / 8);
            _loc5_ = this.bitPosition % 8;
            _loc6_ = 8 - _loc5_;
            _loc7_ = Math.min(_loc6_, _loc3_);
            _loc8_ = this[_loc4_] >> _loc6_ - _loc7_ & this.powList[_loc7_] - 1;
            _loc2_ = _loc2_ + _loc8_ * this.powList[_loc3_ - _loc7_];
            _loc3_ = _loc3_ - _loc7_;
            this.bitPosition = this.bitPosition + _loc7_;
        }
        return _loc2_;
    }
    bitReadSignedInt(param1) {
        var _loc2_ = this.bitReadBoolean();
        return this.bitReadUnsignedInt(param1 - 1) * (!!_loc2_ ? 1 : -1);
    }
    bitReadBinaryData() {
        var _loc1_ = this.bitReadUnsignedInt(16);
        return this.bitReadBinary(_loc1_);
    }
    bitReadBinary(param1) {
        var _loc4_ = 0;
        var _loc5_ = 0;
        var _loc2_ = new Binary();
        var _loc3_ = this.bitPosition;
        while (this.bitPosition - _loc3_ < param1) {
            if (this.bitPosition == this.bitLength) {
                return _loc2_;
            }
            _loc5_ = Math.min(8, param1 - this.bitPosition + _loc3_);
            _loc2_.bitWriteUnsignedInt(_loc5_, this.bitReadUnsignedInt(_loc5_));
        }
        return _loc2_;
    }
    bitWriteString(param1) {
        var _loc4_ = 0;
        var _loc2_ = Math.min(param1.length, this.powList[16] - 1);
        this.bitWriteUnsignedInt(16, _loc2_);
        var _loc3_ = 0;
        while (_loc3_ < _loc2_) {
            _loc4_ = param1.charCodeAt(_loc3_);
            if (_loc4_ == 8364) {
                _loc4_ = 255;
            }
            this.bitWriteUnsignedInt(8, _loc4_);
            _loc3_++;
        }
    }
    bitWriteSignedInt(param1, param2) {
        this.bitWriteBoolean(param2 >= 0);
        this.bitWriteUnsignedInt(param1 - 1, Math.abs(param2));
    }
    bitWriteUnsignedInt(param1, param2) {
        var _loc4_ = NaN;
        var _loc5_ = undefined;
        var _loc6_ = undefined;
        var _loc7_ = NaN;
        param2 = Math.min(this.powList[param1] - 1, param2);
        var _loc3_ = param1;
        while (_loc3_ > 0) {
            _loc4_ = this.bitLength % 8;
            if (_loc4_ == 0) {
                this.writeBoolean(false);
            }
            _loc5_ = 8 - _loc4_;
            _loc6_ = Math.min(_loc5_, _loc3_);
            _loc7_ = this.Rshift(param2, Number(_loc3_ - _loc6_));
            this[this.length - 1] = this[this.length - 1] + _loc7_ * this.powList[_loc5_ - _loc6_];
            param2 = param2 - _loc7_ * this.powList[_loc3_ - _loc6_];
            _loc3_ = _loc3_ - _loc6_;
            this.bitLength = this.bitLength + _loc6_;
        }
    }
    bitWriteBoolean(param1) {
        var _loc2_ = this.bitLength % 8;
        if (_loc2_ == 0) {
            this.writeBoolean(false);
        }
        if (param1) {
            this[this.length - 1] = this[this.length - 1] + this.powList[7 - _loc2_];
        }
        this.bitLength++;
    }
    bitWriteBinaryData(param1) {
        var _loc2_ = Math.min(param1.bitLength, this.powList[16] - 1);
        this.bitWriteUnsignedInt(16, _loc2_);
        this.bitWriteBinary(param1);
    }
    bitWriteBinary(param1) {
        var _loc3_ = 0;
        var _loc4_ = 0;
        param1.bitPosition = 0;
        var _loc2_ = param1.bitLength;
        while (_loc2_) {
            _loc3_ = Math.min(8, _loc2_);
            _loc4_ = param1.bitReadUnsignedInt(_loc3_);
            this.bitWriteUnsignedInt(_loc3_, _loc4_);
            _loc2_ = _loc2_ - _loc3_;
        }
    }
    bitCopyObject(param1) {
        this.bitPosition = param1.bitPosition;
        this.bitLength = param1.bitLength;
        param1.position = 0;
        var _loc2_ = 0;
        while (_loc2_ < param1.length) {
            this.writeByte(param1.readByte());
            _loc2_++;
        }
    }
    Rshift(param1, param2) {
        return Math.floor(param1 / this.powList[param2]);
    }
    Lshift(param1, param2) {
        return param1 * this.powList[param2];
    }
}

module.exports = Binary;
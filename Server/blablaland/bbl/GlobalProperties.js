module.exports = {
    BIT_TYPE: 5,
    BIT_STYPE: 5,
    BIT_MAP_ID: 12,
    BIT_MAP_FILEID: 12,
    BIT_MAP_REGIONID: 4,
    BIT_MAP_PLANETID: 4,
    BIT_SWF_TYPE: 2,
    BIT_ERROR_ID: 5,
    BIT_CAMERA_ID: 9,
    BIT_USER_ID: 24,
    BIT_USER_PID: 24,
    BIT_METHODE_ID: 6,
    BIT_FX_ID: 6,
    BIT_FX_SID: 16,
    BIT_FX_OID: 2,
    BIT_SKIN_ID: 10,
    BIT_TRANSPORT_ID: 10,
    BIT_SMILEY_ID: 6,
    BIT_SMILEY_PACK_ID: 5,
    BIT_GRADE: 10,
    BIT_SKIN_ACTION: 3,
    BIT_SERVER_ID: 2,
    BIT_CHANNEL_ID: 16,
    getServerTime: function () {
        return (new Date().getTime() / 1000).toString().split(".");
    }
};
/**
 * Webm-writer uses for merge any webp images with ogg vorbis audio file. First, you need to add your webp images
 * as base64 encoded strings in writer. Second you need to add buffer with ogg vorbis audio in writer. Then call compile
 * and enjoy your video.
 * First, writer creates matroska ebml file structure. Then writer push frames in sorted order by timecode in cluster.
 * Then we save cue points position in embl and then generate final buffer with webm file data.
 */

//todo: support only video
//todo: support only audio
//todo: cue points
//todo: write by add
Array.prototype.insert = function (index, item) {
    this.splice(index, 0, item);
};

var MS_IN_SECOND = 1000;
var CLUSTER_MAX_DURATION_MS = 30 * MS_IN_SECOND;
var FRAME_TYPE_VIDEO = 0;
var VIDEO_TRACK_NUMBER = 1;
var AUDIO_TRACK_NUMBER = 2;
var SIMPLE_BLOCK_ID = 0xa3;
var EBML_HEADER_ID = 0x1a45dfa3;
var EBML_VERSION_ID = 0x4286;
var EBML_READ_VERSION_ID = 0x42f7;
var EBML_MAX_LENGTH_ID = 0x42f2;
var EBML_MAX_SIZE_ID = 0x42f3;
var EBML_DOC_TYPE_ID = 0x4282;
var EBML_DOC_TYPE_VERSION_ID = 0x4287;
var EBML_DOC_TYPE_READ_VERSION_ID = 0x4285;
var SEGMENT_ID = 0x18538067;
var SEGMENT_HEADER_INFO_ID = 0x1549a966;
var SEGMENT_HEADER_SCALE_ID = 0x2ad7b1;
var SEGMENT_HEADER_MUXING_APP_ID = 0x4d80;
var SEGMENT_HEADER_WRITING_APP_ID = 0x5741;
var SEGMENT_HEADER_DURATION_ID = 0x4489;
var TRACKS_ID = 0x1654ae6b;
var TRACK_ENTRY_ID = 0xae;
var TRACK_NUMBER_ID = 0xd7;
var TRACK_UID_ID = 0x73c5;
var TRACK_FLAG_LACING_ID = 0x9c;
var TRACK_LANG_ID = 0x22b59c;
var TRACK_CODEC_ID = 0x86;
var TRACK_CODEC_NAME_ID = 0x258688;
var TRACK_TYPE_ID = 0x83;
var VIDEO_ID = 0xe0;
var AUDIO_ID = 0xe1;
var VIDEO_WIDTH_ID = 0xb0;
var VIDEO_HEIGHT_ID = 0xba;
var CODEC_PRIVATE_ID = 0x63A2;
var RATE_ID = 0xB5;
var CLUSTER_ID = 0x1f43b675;
var CLUSTER_TIMECODE_ID = 0xe7;

function write(resultBuffer, duration, width, height, privateData, rate, frames) {
    writeEbmlHeader(resultBuffer);
    executeAndWriteIdAndSize(resultBuffer, writeSegment, SEGMENT_ID, [duration, width, height, privateData, rate, frames]);
    return resultBuffer;
}

function writeSegment(resultBuffer, params) {
    var duration = params[0];
    var width = params[1];
    var height = params[2];
    var privateData = params[3];
    var rate = params[4];
    var frames = params[5];
    writeSegmentHeader(resultBuffer, duration);
    executeAndWriteIdAndSize(resultBuffer, writeTracks, TRACKS_ID, [width, height, privateData, rate]);
    writeClusters(resultBuffer, frames);
   // writeCues(resultBuffer); //todo
}

function writeClusters(resultBuffer, frames) {
    var clusterTimecode = 0;
    var frameNumber = 0;
    while (frameNumber < frames.length) {
        var clusterFrames = [];
        var clusterDuration = 0;

        do {
            clusterFrames.push(frames[frameNumber]);
        } while (++frameNumber < frames.length && frames[frameNumber].timecode - clusterTimecode < CLUSTER_MAX_DURATION_MS);

        clusterDuration = frames[frameNumber - 1].timecode - clusterTimecode;
        executeAndWriteIdAndSize(resultBuffer, writeCluster, CLUSTER_ID, [Math.round(clusterTimecode), clusterFrames]);
        clusterTimecode += clusterDuration;
    }
}

function writeCluster(resultBuffer, params) {
    var timecode = params[0];
    var frames = params[1];
    pushAll(resultBuffer, createSimpleBuffer(CLUSTER_TIMECODE_ID, timecode));
    for (var i = 0; i < frames.length; i++) {
        pushAll(resultBuffer, createSimpleBuffer(SIMPLE_BLOCK_ID, createFrame(frames[i].type == FRAME_TYPE_VIDEO ? frames[i].data.slice(4) : frames[i].data, Math.round(frames[i].timecode - timecode), frames[i].type == FRAME_TYPE_VIDEO ? VIDEO_TRACK_NUMBER : AUDIO_TRACK_NUMBER)));
    }
}

function writeTracks(resultBuffer, params) {
    var width = params[0];
    var height = params[1];
    var codecPrivate = params[2];
    var rate = params[3];
    writeVideoTrack(resultBuffer, width, height);
    writeAudioTrack(resultBuffer, codecPrivate, rate);
}

function writeVideoTrack(resultBuffer, width, height) {
    executeAndWriteIdAndSize(resultBuffer, writeVideoTrackData, TRACK_ENTRY_ID, [width, height]);
}

function writeVideoTrackData(resultBuffer, params) {
    pushAll(resultBuffer, createSimpleBuffer(TRACK_NUMBER_ID, VIDEO_TRACK_NUMBER));
    pushAll(resultBuffer, createSimpleBuffer(TRACK_UID_ID, 1));
    pushAll(resultBuffer, createSimpleBuffer(TRACK_FLAG_LACING_ID, 0));
    pushAll(resultBuffer, createSimpleBuffer(TRACK_LANG_ID, "und"));
    pushAll(resultBuffer, createSimpleBuffer(TRACK_CODEC_ID, "V_VP8"));
    pushAll(resultBuffer, createSimpleBuffer(TRACK_CODEC_NAME_ID, "VP8"));
    pushAll(resultBuffer, createSimpleBuffer(TRACK_TYPE_ID, 1));
    executeAndWriteIdAndSize(resultBuffer, writeVideoEntry, VIDEO_ID, params);
}

function writeVideoEntry(resultBuffer, params) {
    var width = params[0];
    var height = params[0];
    pushAll(resultBuffer, createSimpleBuffer(VIDEO_WIDTH_ID, width));
    pushAll(resultBuffer, createSimpleBuffer(VIDEO_HEIGHT_ID, height));
}

function writeAudioTrack(resultBuffer, privateData, rate) {
    executeAndWriteIdAndSize(resultBuffer, writeAudioTrackData, TRACK_ENTRY_ID, [privateData, rate]);
}

function writeAudioTrackData(resultBuffer, params) {
    var codecPrivate = params[0];
    pushAll(resultBuffer, createSimpleBuffer(TRACK_NUMBER_ID, AUDIO_TRACK_NUMBER));
    pushAll(resultBuffer, createSimpleBuffer(TRACK_UID_ID, 2));
    pushAll(resultBuffer, createSimpleBuffer(TRACK_FLAG_LACING_ID, 0));
    pushAll(resultBuffer, createSimpleBuffer(TRACK_LANG_ID, "und"));
    pushAll(resultBuffer, createSimpleBuffer(TRACK_CODEC_ID, "A_VORBIS"));
    pushAll(resultBuffer, createSimpleBuffer(TRACK_CODEC_NAME_ID, "Vorbis"));
    pushAll(resultBuffer, createSimpleBuffer(CODEC_PRIVATE_ID, codecPrivate));
    pushAll(resultBuffer, createSimpleBuffer(TRACK_TYPE_ID, 2));
    executeAndWriteIdAndSize(resultBuffer, writeAudioEntry, AUDIO_ID, [params[1]]);
}

function writeAudioEntry(resultBuffer, params) {
    var rate = params[0];
    pushAll(resultBuffer, createSimpleBuffer(RATE_ID, doubleToString32(rate)));
};

function writeSegmentHeader(resultBuffer, duration) {
    //writeSegmentHeaderData(resultBuffer, [duration]);
    executeAndWriteIdAndSize(resultBuffer, writeSegmentHeaderData, SEGMENT_HEADER_INFO_ID, [duration]);
}

function writeSegmentHeaderData(resultBuffer, params) {
    var duration = params[0];
    pushAll(resultBuffer, createSimpleBuffer(SEGMENT_HEADER_SCALE_ID, 1e6));
    pushAll(resultBuffer, createSimpleBuffer(SEGMENT_HEADER_MUXING_APP_ID, "webm-writer"));
    pushAll(resultBuffer, createSimpleBuffer(SEGMENT_HEADER_WRITING_APP_ID, "webm-writer"));
    pushAll(resultBuffer, createSimpleBuffer(SEGMENT_HEADER_DURATION_ID, doubleToString64(duration)));
}

function writeEbmlHeader(resultBuffer) {
    executeAndWriteIdAndSize(resultBuffer, writeEbmlHeaderData, EBML_HEADER_ID);
    return resultBuffer;
}

function executeAndWriteIdAndSize(resultBuffer, func, id, params) {
    var position = resultBuffer.length;
    func(resultBuffer, params);
    var len = resultBuffer.length - position;
    writeSizeToBuffer(position, resultBuffer, len);
    writeId(position, resultBuffer, id);
}

function writeEbmlHeaderData(result) {
    pushAll(result, createSimpleBuffer(EBML_VERSION_ID, 1));
    pushAll(result, createSimpleBuffer(EBML_READ_VERSION_ID, 1));
    pushAll(result, createSimpleBuffer(EBML_MAX_LENGTH_ID, 4));
    pushAll(result, createSimpleBuffer(EBML_MAX_SIZE_ID, 8));
    pushAll(result, createSimpleBuffer(EBML_DOC_TYPE_ID, "webm"));
    pushAll(result, createSimpleBuffer(EBML_DOC_TYPE_VERSION_ID, 2));
    pushAll(result, createSimpleBuffer(EBML_DOC_TYPE_READ_VERSION_ID, 2));
    return result;
}

function createSimpleBuffer(id, data, len) {
    var result = [];
    var dataBuffer = toBuffer(data);
    pushAll(result, numToBuffer(id));
    pushAll(result, getSizeBuffer(len ? len : dataBuffer.length));
    pushAll(result, dataBuffer);
    return result;
}

function getSizeBuffer(length) {
    return bitsToBuffer(calculateSize(length));
}

function toBuffer(data) {
    if (typeof data == 'string') {
        return strToBuffer(data);
    } else if (typeof data == 'number') {
        return bitsToBuffer(data.toString(2));
    }
    return data;
}

function createFrame(buffer, timecode, trackNum) {
    var flags = 0;
    flags |= 128;
    var blockData = [trackNum | 0x80, timecode >> 8, timecode & 0xff, flags];
    pushAll(blockData, buffer);
    return new Uint8Array(blockData);
};

/**
 * @param {Array} buffer
 * @returns {Object}
 */
function parseWebP(buffer) {
    var withOutHeader = buffer.slice(12);
    var index = 0;
    while (String.fromCharCode(withOutHeader[index]) != ' ')
        index++;
    return { data : withOutHeader.slice(index+1) }; //todo: add extended file type support
};

/**
 * @param {Number} num
 * @returns {string}
 */
function doubleToString64(num) {
    return [].slice.call(
        new Uint8Array(
            (
                new Float64Array([num])
            ).buffer)
        , 0)
        .map(function (e) {
            return String.fromCharCode(e)
        })
        .reverse()
        .join('')
};

/**
 * @param {Number} num
 * @returns {string}
 */
function doubleToString32(num) {
    return [].slice.call(
        new Uint8Array(
            (
                new Float32Array([num])
            ).buffer)
        , 0)
        .map(function (e) {
            return String.fromCharCode(e)
        })
        .reverse()
        .join('')
};

/**
 * @param num
 * @returns {Uint8Array}
 */
function numToBuffer(num) {
    var parts = [];
    while (num > 0) {
        parts.push(num & 0xff);
        num = num >> 8;
    }
    return new Uint8Array(parts.reverse());
};

/**
 * @param {Number} num
 * @param {Number} size
 * @returns {Uint8Array}
 */
function numToFixedBuffer(num, size) {
    var parts = new Uint8Array(size);
    for (var i = size - 1; i >= 0; i--) {
        parts[i] = num & 0xff;
        num = num >> 8;
    }
    return parts;
};

/**
 * @param {String} str
 * @returns {Uint8Array}
 */
function strToBuffer(str) {
    var arr = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i)
    }
    return arr;
};

/**
 * @param {String} bits
 * @returns {Uint8Array}
 */
function bitsToBuffer(bits) {
    var data = [];
    var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : '';
    bits = pad + bits;
    for (var i = 0; i < bits.length; i += 8) {
        data.push(parseInt(bits.substr(i, 8), 2))
    }
    return new Uint8Array(data);
};

function writeSizeToBuffer(position, buffer, len) {
    var bits = calculateSize(len);
    var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : '';
    bits = pad + bits;
    for (var i = 0; i < bits.length; i += 8) {
        buffer.insert(position++, parseInt(bits.substr(i, 8), 2))
    }
}

function writeId(position, buffer, id) {
    var posBuffer = numToBuffer(id);
    insertAll(buffer, posBuffer, position);
}

function insertAll(array, toInsert, position) {
    for (var i = 0; i < toInsert.length; i++) {
        array.insert(position++, toInsert[i]);
    }
}

function pushAll(array, toPush) {
    for (var i = 0; i < toPush.length; i++) {
        array.push(toPush[i]);
    }
    return toPush.length;
}

function calculateSize(len) {
    var zeroes = Math.ceil(Math.ceil(Math.log(len) / Math.log(2)) / 8);
    var size_str = len.toString(2);
    var padded = (new Array((zeroes * 7 + 7 + 1) - size_str.length)).join('0') + size_str;
    return (new Array(zeroes)).join('0') + '1' + padded;
}


/**
 * @param {Array} videoFrames
 * @param {Array} audioFrames
 * @returns {Array}
 */
function mergeSortedLists(videoFrames, audioFrames) { // merge frames by timecode
    var i = 0;
    var j = 0;
    var result = [];
    if (!audioFrames) {
        return videoFrames;
    }
    if (videoFrames.length == 0)
        return audioFrames;
    while (i < videoFrames.length || j < audioFrames.length) {
        if (j == audioFrames.length) {
            result.push(videoFrames[i++]);
            continue;
        }
        if (i == videoFrames.length) {
            result.push(audioFrames[j++]);
            continue;
        }
        if (videoFrames[i].timecode > audioFrames[j].timecode) {
            result.push(audioFrames[j++]);
        } else if (videoFrames[i].timecode < audioFrames[j].timecode) {
            result.push(videoFrames[i++]);
        } else {
            result.push(audioFrames[j++]);
        }
    }
    return result;
};

/**
 * @param {Number} width
 * @param {Number} height
 * @constructor
 */
function Video(width, height) {
    this.frames = [];
    this.videoFrames = [];
    this.duration = 0;
    this.height = height;
    this.width = width;
    /**
     * @param {String} frame String widthin encoded in base64 webp image
     * @param {Number} duration
     */
    this.addVideoFrame = function (frame, duration) {
        var webp = parseWebP(frame);
        webp.timecode = this.duration;
        webp.type = FRAME_TYPE_VIDEO;
        this.duration += duration;
        this.videoFrames.push(webp);
    };
    /**
     * Make video
     * @returns {Array}
     */
    this.compile = function () {
        this.frames = mergeSortedLists(this.videoFrames, this.audioFrames);
        this.resultArray = this._toWebM();
        return this.resultArray;
    };
    /**
     * @param {Array} buffer
     * @param {Number} duration
     */
    this.addAudioTrack = function (buffer, duration) {
        var Parser = require('./vorbis-parser');
        var parser = new Parser(buffer);
        var vorbisFile = parser.parse();
        var privateData = vorbisFile.getCodecPrivateForMatroska();
        this.audioFrames = vorbisFile.getWebMSpecificAudioPackets(duration);
        this.rate = vorbisFile.infoPacket.rate;
        this.codecPrivate = privateData;
        this.audioDuration = duration || vorbisFile.getDuration() * MS_IN_SECOND;
    };
    /**
     * @param {String} file
     */
    this.save = function (file) {
        var fs = require('fs');
        var buffer = new Buffer(this.resultArray.length);
        for (var i = 0; i < buffer.length; i++) {
            buffer[i] = this.resultArray[i];
        }
        fs.writeFile(file, buffer);
    };
    this._toWebM = function() {
        return write(new Array(), Math.max(this.duration, this.audioDuration), this.width, this.height, this.codecPrivate, this.rate, this.frames);
    }
};

module.exports = Video;
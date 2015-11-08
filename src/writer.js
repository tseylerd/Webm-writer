/**
 * Webm-writer uses for merge any webp images with ogg vorbis audio file. First, you need to add your webp images
 * as base64 encoded strings in writer. Second you need to add buffer with ogg vorbis audio in writer. Then call compile
 * and enjoy your video.
 * First, writer creates matroska ebml file structure. Then writer push frames in sorted order by timecode in cluster.
 * Then we save cue points position in embl and then generate final buffer with webm file data.
 */

var atob = require('atob');

var heapdump = require('heapdump');
var snapshotNumber = 0;
var test = true;
var saveMemoryUsage = function () {
    if (!test)
        return;
    snapshotNumber++;
    heapdump.writeSnapshot(__dirname + "/../test/snapshots/" + Date.now() + '.heapsnapshot');
    //var usage = process.memoryUsage();
    //usages.push(usage['heapUsed']);
};

var MS_IN_SECOND = 1000;
var CLUSTER_MAX_DURATION_MS = 30 * MS_IN_SECOND;
var SEGMENT_INDEX = 1;
var CUES_INDEX = 2;
var FRAME_TYPE_VIDEO = 0;
var VIDEO_TRACK_NUMBER = 1;
var AUDIO_TRACK_NUMBER = 2;
var EBML_HEADER = {
    "id": 0x1a45dfa3, // EBML
    "data": [
        {
            "data": 1,
            "id": 0x4286 // EBMLVersion
        },
        {
            "data": 1,
            "id": 0x42f7 // EBMLReadVersion
        },
        {
            "data": 4,
            "id": 0x42f2 // EBMLMaxIDLength
        },
        {
            "data": 8,
            "id": 0x42f3 // EBMLMaxSizeLength
        },
        {
            "data": "webm",
            "id": 0x4282 // DocType
        },
        {
            "data": 2,
            "id": 0x4287 // DocTypeVersion
        },
        {
            "data": 2,
            "id": 0x4285 // DocTypeReadVersion
        }
    ]
};

/**
 * @param {Array} arr
 * @param {Array} outBuffer
 * @returns {Array}
 */
var toFlatArray = function (arr, outBuffer) {
    if (outBuffer == null) {
        outBuffer = [];
    }
    //saveMemoryUsage();
    for (var i = 0; i < arr.length; i++) {
        if (typeof arr[i] == 'object') {
            toFlatArray(arr[i], outBuffer)
        } else {
            outBuffer.push(arr[i]);
        }
    }
    //saveMemoryUsage();
    return outBuffer;
};

/**
 * @param {Object} data
 * @returns {String}
 */
var makeSimpleBlock = function (data) {
    var flags = 0;
    if (data.keyframe) flags |= 128;
    if (data.invisible) flags |= 8;
    if (data.lacing) flags |= (data.lacing << 1);
    if (data.discardable) flags |= 1;
    if (data.trackNum > 127) {
        throw "TrackNumber > 127 not supported";
    }
    return [data.trackNum | 0x80, data.timecode >> 8, data.timecode & 0xff, flags].map(function (e) {
            return String.fromCharCode(e)
        }).join('') + data.frame;
};

/**
 * @param {String} riff
 * @returns {Object}
 */
var parseWebP = function (riff) {
    var VP8 = riff.RIFF[0].WEBP[0];

    var frame_start = VP8.indexOf('\x9d\x01\x2a');
    for (var i = 0, c = []; i < 4; i++) {
        c[i] = VP8.charCodeAt(frame_start + 3 + i);
    }

    var width, height, tmp;
    tmp = (c[1] << 8) | c[0];
    width = tmp & 0x3FFF;
    tmp = (c[3] << 8) | c[2];
    height = tmp & 0x3FFF;
    return {
        width: width,
        height: height,
        data: VP8,
        riff: riff
    }
};

/**
 * @param {String} string
 * @returns {Object}
 */
var parseRIFF = function (string) {
    var offset = 0;
    var chunks = new Object();

    while (offset < string.length) {
        var id = string.substr(offset, 4);
        chunks[id] = chunks[id] || [];
        if (id == 'RIFF' || id == 'LIST') {
            var len = parseInt(string.substr(offset + 4, 4).split('').map(function (i) {
                var unpadded = i.charCodeAt(0).toString(2);
                return (new Array(8 - unpadded.length + 1)).join('0') + unpadded
            }).join(''), 2);
            var data = string.substr(offset + 4 + 4, len);
            offset += 4 + 4 + len;
            chunks[id].push(parseRIFF(data));
        } else if (id == 'WEBP') {
            chunks[id].push(string.substr(offset + 8));
            offset = string.length;
        } else {
            chunks[id].push(string.substr(offset + 4));
            offset = string.length;
        }
    }
    return chunks;
};

/**
 * @param {Number} num
 * @returns {string}
 */
var doubleToString64 = function (num) {
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
var doubleToString32 = function (num) {
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
var numToBuffer = function (num) {
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
var numToFixedBuffer = function (num, size) {
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
var strToBuffer = function (str) {
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
var bitsToBuffer = function (bits) {
    var data = [];
    var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : '';
    bits = pad + bits;
    for (var i = 0; i < bits.length; i += 8) {
        data.push(parseInt(bits.substr(i, 8), 2))
    }
    return new Uint8Array(data);
};

/**
 * @param {Object} ebmlObject
 * @returns {Uint8Array}
 */
var generateEBML = function (ebmlObject) {
    var ebml = [];
    for (var i = 0; i < ebmlObject.length; i++) {
        if (!('id' in ebmlObject[i])) {
            ebml.push(ebmlObject[i]);
            continue;
        }
        var data = ebmlObject[i].data;
        if (typeof data == 'object') data = generateEBML(data);
        if (typeof data == 'number') data = ('size' in ebmlObject[i]) ? numToFixedBuffer(data, ebmlObject[i].size) : bitsToBuffer(data.toString(2));
        if (typeof data == 'string') data = strToBuffer(data);
        var len = data.size || data.byteLength || data.length;
        var zeroes = Math.ceil(Math.ceil(Math.log(len) / Math.log(2)) / 8);
        var size_str = len.toString(2);
        var padded = (new Array((zeroes * 7 + 7 + 1) - size_str.length)).join('0') + size_str;
        var size = (new Array(zeroes)).join('0') + '1' + padded;
        ebml.push(numToBuffer(ebmlObject[i].id));
        ebml.push(bitsToBuffer(size));
        ebml.push(data);
        //saveMemoryUsage();
    }
    var buffer = toFlatArray(ebml);
    saveMemoryUsage();
    return new Uint8Array(buffer);
};

/**
 * @param {Number} width
 * @param {Number} height
 * @param {Number} rate
 * @param {String} privateData
 * @returns {Object}
 */
var getTracks = function (width, height, rate, privateData) { // because video may contain only video or audio frames
    if (rate && width) {
        return {
            "id": 0x1654ae6b, // Tracks
            "data": [
                {
                    "id": 0xae, // TrackEntry
                    "data": [
                        {
                            "data": VIDEO_TRACK_NUMBER,
                            "id": 0xd7 // TrackNumber
                        },
                        {
                            "data": 1,
                            "id": 0x73c5 // TrackUID
                        },
                        {
                            "data": 0,
                            "id": 0x9c // FlagLacing
                        },
                        {
                            "data": "und",
                            "id": 0x22b59c // Language
                        },
                        {
                            "data": "V_VP8",
                            "id": 0x86 // CodecID
                        },
                        {
                            "data": "VP8",
                            "id": 0x258688 // CodecName
                        },
                        {
                            "data": 1,
                            "id": 0x83 // TrackType
                        },
                        {
                            "id": 0xe0,  // Video
                            "data": [
                                {
                                    "data": width,
                                    "id": 0xb0 // PixelWidth
                                },
                                {
                                    "data": height,
                                    "id": 0xba // PixelHeight
                                }
                            ]
                        }
                    ]
                },
                {
                    "id": 0xae, // TrackEntry
                    "data": [
                        {
                            "data": AUDIO_TRACK_NUMBER,
                            "id": 0xd7 // TrackNumber
                        },
                        {
                            "data": 2,
                            "id": 0x73c5 // TrackUID
                        },
                        {
                            "data": 0,
                            "id": 0x9c // FlagLacing
                        },
                        {
                            "data": "und",
                            "id": 0x22b59c // Language
                        },
                        {
                            "data": "A_VORBIS",
                            "id": 0x86 // CodecID
                        },
                        {
                            "data": "Vorbis",
                            "id": 0x258688 // CodecName
                        },
                        {
                            "data": privateData,
                            "id": 0x63A2 //CodecPrivate
                        },
                        {
                            "data": 2,
                            "id": 0x83 // TrackType
                        },
                        {
                            "id": 0xe1,  // Audio
                            "data": [
                                {
                                    "data": doubleToString32(rate),
                                    "id": 0xB5 //rate
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    } else if (width) {
        return {
            "id": 0x1654ae6b, // Tracks
            "data": [
                {
                    "id": 0xae, // TrackEntry
                    "data": [
                        {
                            "data": 1,
                            "id": 0xd7 // TrackNumber
                        },
                        {
                            "data": 1,
                            "id": 0x73c5 // TrackUID
                        },
                        {
                            "data": 0,
                            "id": 0x9c // FlagLacing
                        },
                        {
                            "data": "und",
                            "id": 0x22b59c // Language
                        },
                        {
                            "data": "V_VP8",
                            "id": 0x86 // CodecID
                        },
                        {
                            "data": "VP8",
                            "id": 0x258688 // CodecName
                        },
                        {
                            "data": 1,
                            "id": 0x83 // TrackType
                        },
                        {
                            "id": 0xe0,  // Video
                            "data": [
                                {
                                    "data": width,
                                    "id": 0xb0 // PixelWidth
                                },
                                {
                                    "data": height,
                                    "id": 0xba // PixelHeight
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    } else if (rate) {
        return {
            "id": 0x1654ae6b, // Tracks
            "data": [
                {
                    "id": 0xae, // TrackEntry
                    "data": [
                        {
                            "data": 2,
                            "id": 0xd7 // TrackNumber
                        },
                        {
                            "data": 2,
                            "id": 0x73c5 // TrackUID
                        },
                        {
                            "data": 0,
                            "id": 0x9c // FlagLacing
                        },
                        {
                            "data": "und",
                            "id": 0x22b59c // Language
                        },
                        {
                            "data": "A_VORBIS",
                            "id": 0x86 // CodecID
                        },
                        {
                            "data": "Vorbis",
                            "id": 0x258688 // CodecName
                        },
                        {
                            "data": privateData,
                            "id": 0x63A2 //CodecPrivate
                        },
                        {
                            "data": 2,
                            "id": 0x83 // TrackType
                        },
                        {
                            "id": 0xe1,  // Audio
                            "data": [
                                {
                                    "data": doubleToString32(rate),
                                    "id": 0xB5 //rate
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    }
};
/**
 * @param {Number} duration
 * @returns {Object}
 */
var getSegmentHeader = function(duration) {
    return {
        "id": 0x1549a966, // Info
        "data": [
            {
                "data": 1e6, //do things in millisecs (num of nanosecs for duration scale)
                "id": 0x2ad7b1 // TimecodeScale
            },
            {
                "data": "webm-writer",
                "id": 0x4d80 // MuxingApp
            },
            {
                "data": "webm-writer",
                "id": 0x5741 // WritingApp
            },
            {
                "data": doubleToString64(duration),
                "id": 0x4489 // Duration
            }
        ]
    };
};

/**
 * @param {Number} duration
 * @param {String} privateData
 * @param {Number} rate
 * @returns {Object}
 */
var getStructureWithoutVideo = function(duration, privateData, rate) {
    return[
        EBML_HEADER,
        {
            "id": 0x18538067, // Segment
            "data": [
                getSegmentHeader(duration),
                getTracks(undefined, undefined, rate, privateData),
                //cluster insertion point
            ]
        }
    ];
};

/**
 * @param {Number} width
 * @param {Number} height
 * @param {Number} duration
 * @param {String} privateData
 * @param {Number} rate
 * @returns {Object}
 */
var getStructureWithVideo = function(width, height, duration, rate, privateData) {
    return [
        EBML_HEADER,
        {
            "id": 0x18538067, // Segment
            "data": [
                getSegmentHeader(duration),
                getTracks(width, height, rate, privateData),
                {
                    "id": 0x1c53bb6b, // Cues
                    "data": [
                        //cue insertion point
                    ]
                }

                //cluster insertion point
            ]
        }
    ];
};

/**
 * @param {Number} width
 * @param {Number} height
 * @param {Number} duration
 * @param {String} privateData
 * @param {Number} rate
 * @returns {Object}
 */
var getEbmlStructure = function (width, height, duration, privateData, rate) { // create mkv-specific ebml structure
    if (width && height) {
        return getStructureWithVideo(width, height, duration, rate, privateData);
    } else {
        return getStructureWithoutVideo(duration, privateData, rate)
    }
};
/**
 * @param {Array} videoFrames
 * @param {Array} audioFrames
 * @returns {Array}
 */
var mergeSortedLists = function (videoFrames, audioFrames) { // merge frames by timecode
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
var Video = function (width, height) {
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
        var webp = parseWebP(parseRIFF(atob(frame)));
        webp.timecode = this.duration;
        webp.type = FRAME_TYPE_VIDEO;
        this.duration += duration;
        this.videoFrames.push(webp);
        //saveMemoryUsage();
    };
    /**
     * Make video
     * @returns {Array}
     */
    this.compile = function () {
        this.frames = mergeSortedLists(this.videoFrames, this.audioFrames);
        saveMemoryUsage();
        this.resultArray = this._toWebM();
        saveMemoryUsage();
        return this.resultArray;
    };
    /**
     * @param {Buffer} buffer
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
        //saveMemoryUsage();
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
        saveMemoryUsage();
    };
    this._toWebM = function () {

        var ebml = getEbmlStructure(this.width, this.height, Math.max(this.duration, this.audioDuration), this.codecPrivate, this.rate);
        var segment = ebml[SEGMENT_INDEX];
        var cues = segment.data[CUES_INDEX];

        var frameNumber = 0;
        var clusterTimecode = 0;
        var firstVideoFrameInClusterTimecode = [];
        var clusterNumber = 0;

        while (frameNumber < this.frames.length) {
            var clusterFrames = [];
            var clusterDuration = 0;

            do {
                clusterFrames.push(this.frames[frameNumber]);
                if (this.frames[frameNumber].type == 0 && !firstVideoFrameInClusterTimecode[clusterNumber]) {
                    firstVideoFrameInClusterTimecode[clusterNumber] = this.frames[frameNumber].timecode;
                }
            } while (++frameNumber < this.frames.length && this.frames[frameNumber].timecode - clusterTimecode < CLUSTER_MAX_DURATION_MS);

            if (firstVideoFrameInClusterTimecode[clusterNumber] >= 0) {
                var cuePoint = {
                    "id": 0xbb, // CuePoint
                    "data": [
                        {
                            "data": Math.round(firstVideoFrameInClusterTimecode[clusterNumber]),
                            "id": 0xb3 // CueTime
                        },
                        {
                            "id": 0xb7, // CueTrackPositions
                            "data": [
                                {
                                    "data": VIDEO_TRACK_NUMBER, //
                                    "id": 0xf7 // CueTrack
                                },
                                {
                                    "data": 0, // to be filled in when we know it
                                    "size": 8,
                                    "id": 0xf1 // CueClusterPosition
                                }
                            ]
                        }
                    ]
                };
                cues.data.push(cuePoint);
            }

            clusterNumber++;
            clusterDuration = this.frames[frameNumber - 1].timecode - clusterTimecode;
            //saveMemoryUsage();
            var cluster = {
                "id": 0x1f43b675, // Cluster
                "data": [
                    {
                        "data": Math.round(clusterTimecode),
                        "id": 0xe7 // Timecode
                    }
                ].concat(clusterFrames.map(function (frame) {
                        var block = makeSimpleBlock({
                            discardable: 0,
                            frame: frame.type == FRAME_TYPE_VIDEO ? frame.data.slice(4) : frame.data,
                            invisible: 0,
                            keyframe: 1,
                            lacing: 0,
                            trackNum: frame.type == FRAME_TYPE_VIDEO ? VIDEO_TRACK_NUMBER : AUDIO_TRACK_NUMBER,
                            timecode: Math.round(frame.timecode - clusterTimecode)
                        });
                        return {
                            data: block,
                            id: 0xa3
                        };
                    }))
            };
            //saveMemoryUsage();
            segment.data.push(cluster);
            clusterTimecode += clusterDuration;
        }
        saveMemoryUsage();
        var position = 0;
        var cueNumber = 0;
        for (var i = 0; i < segment.data.length; i++) {
            var haveCues = this.width && i >= (CUES_INDEX + 1) && cues.data[cueNumber];
            var haveVideoFrameInCluster = firstVideoFrameInClusterTimecode[i - (CUES_INDEX + 1)] >= 0;
            if (haveCues && haveVideoFrameInCluster) {
                cues.data[cueNumber++].data[1].data[1].data = position;
            }
            var data = generateEBML([segment.data[i]]);
            position += data.size || data.byteLength || data.length;
            if (i != 2) {
                segment.data[i] = data;
            }
        }
        return generateEBML(ebml)
    };
};

module.exports = Video;
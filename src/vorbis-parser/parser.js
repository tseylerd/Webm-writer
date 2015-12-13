/**
 * Vorbis parser parse ogg-vorbis audio file.
 * First, it reads first three packages which contains some meta-information. Info package contains information about chanels,
 * bitrate, rate, version and block size. Next, comments package may contains information about artist, name of the track
 * and other comments. Setup package contains number of codeblocks. Then parser reads all audio packages.
 * You can use this parser in your code like "var parser = new Parser(file); parser.parse();"
 * Parse function returns VorbisFile.
 */

var MS_IN_SECOND = 1000;
/**
 * Returns integer from 4 Numbers in reverse order
 * @param {Number} x0
 * @param {Number} x1
 * @param {Number} x2
 * @param {Number} x3
 * @returns {int}
 */
var getInt = function(x0, x1, x2, x3) {
    return ((x3 << 24) + (x2 << 16) + (x1 << 8) + x0);
}

/**
 * Returns Number from 8 Numbers in reverse order
 * @param {Number} x0
 * @param {Number} x1
 * @param {Number} x2
 * @param {Number} x3
 * @param {Number} x4
 * @param {Number} x5
 * @param {Number} x6
 * @param {Number} x7
 * @returns {Number}
 */
var getLong = function(x0, x1, x2, x3, x4, x5, x6, x7) {
    return ((x7 << 56) + (x6 << 48) + (x5 << 40) + (x4 << 32) + (x3 << 24) + (x2 << 16) + (x1 << 8) + x0)
}

var getLongFromBuffer = function(dataIterator) {
    return getLong(dataIterator.getNext(), dataIterator.getNext(), dataIterator.getNext(), dataIterator.getNext(),
        dataIterator.getNext(), dataIterator.getNext(), dataIterator.getNext(), dataIterator.getNext());
};

/**
 * Returns int from buffer
 * @param {DataIterator} dataIterator
 * @returns {int}
 */
var getIntFromBuffer = function(dataIterator) {
    return getInt(dataIterator.getNext(), dataIterator.getNext(), dataIterator.getNext(), dataIterator.getNext());
};
var log = function(data) {
    console.log(data);
};
var logArray = function(data, i) {
    for (var i = 0; i < data.length; i++) {
        log(data[i]);
    }
};

/**
 * Returns int from given buffer
 * @param {Buffer} data
 * @param {Number} start
 * @returns {Number}
 */
var getIntFrom = function(data, start) {
    return getInt(data[start++], data[start++], data[start++], data[start++]);
};
/**
 * Returns string from given buffer
 * @param {Buffer} data
 * @param {Number} offset
 * @param {Number} len
 * @returns {String}
 */

function arrayToBinaryString(array, start, end) {
    var str = "";
    for (var i=start; i<end; i++) {
        str += String.fromCharCode(array[i]);
    }
    return str;
}

var getString = function(data, offset, len) {
    return arrayToBinaryString(data, offset, offset + len);
};

/**
 * Returns data size
 * @param {Buffer} buffer
 * @returns {Number}
 */
var getDataSize = function(buffer) {
    var result = 0;
    for (var i = 0; i < buffer.length; i++) {
        result += buffer[i];
    }
    return result;
};

/**
 * Reads fixed count of Numbers from DataIterator
 * @param {DataIterator} dataIterator
 * @param {Number} length
 * @returns {Buffer}
 */
var readAllBytes = function(dataIterator, length) {
    var result = new Uint8Array(length);
    for (var i = 0; i < length; i++) {
        result[i] = dataIterator.getNext();
    }
    return result;
};

/**
 * Reads next page from file
 * @param {DataIterator} dataIterator
 * @returns {Page}
 */
var readPage = function(dataIterator) {
    for (var i = 0; i < 4; i++) {
        dataIterator.getNext(); // skip "OggS"
    }
    var page = new Page();
    page.version = dataIterator.getNext();
    page.flags = dataIterator.getNext();
    page.granulePosition = getLongFromBuffer(dataIterator);
    page.sid = getIntFromBuffer(dataIterator);
    page.sequenceNum = getIntFromBuffer(dataIterator);
    page.checkSum = getIntFromBuffer(dataIterator);
    page.segmentsNumber = dataIterator.getNext();
    page.segments = readAllBytes(dataIterator, page.segmentsNumber);
    page.dataSize = getDataSize(page.segments);
    page.data = readAllBytes(dataIterator, page.dataSize);
    return page;
};

/**
 * @param {Buffer} buffer
 * @param {Number} position
 * @constructor
 */
function DataIterator(buffer, position) {
    this._buffer = buffer;
    this._position = position;
    this.getNext = function() {
        return this._buffer[this._position++];
    };
    this.hasNext = function() {
        return this._buffer[this._position+1] != undefined;
    }
};

/**
 * Help to reads packets from file
 * @param {DataIterator} dataIterator
 * @constructor
 */
function PacketReader(dataIterator) {
    this._dataIterator = dataIterator;
    this._page = readPage(this._dataIterator);
    this.hasNextPacket = function () {
        return (this._page.hasNextPacket() || this._dataIterator.hasNext());
    };
    this.getNextPacket = function () {
        if (!this._page.hasNextPacket()) {
            this._page = readPage(this._dataIterator);
        }
        var packet = this._page.getNextPacket();
        packet.parent = this._page;
        var data = packet.data;
        while (packet.continueOnNextPage) {
            this._page = readPage(this._dataIterator);
            var newPacket = this._page.getNextPacket();
            var newData = new Uint8Array(data.length + newPacket.data.length);
            for (var j = 0; j < data.length; j++){
                newData[j] = data[j];
            }
            for (var j = data.length; j < data.length + newPacket.data.length; j++){
                newData[j] = newPacket.data[j - data.length];
            }
            data = newData;
            packet.continueOnNextPage = newPacket.continueOnNextPage;
        }
        packet.data = data;
        return packet;
    }
}

/**
 * Vorbis file page
 * @constructor
 */
function Page() {
    this.currentOffset = 0;
    this.currentSegment = 0;
    this.hasNextPacket = function() {
        if (this.currentSegment < this.segmentsNumber) {
            return true;
        }

        if (this.currentSegment == 0 && this.segmentsNumber == 0) {
            return true;
        }

        return false;
    };
    this.getNextPacket = function() {
        var packetSize = 0;
        var packetSegments = 0;
        var continueOnNextPage = false;
        for (var i = this.currentSegment; i < this.segmentsNumber; i++) {
            var size = this.segments[i];
            packetSize += size;
            packetSegments++;

            if (size < 255)
                break;

            if (i === this.segmentsNumber - 1 && size === 255)
                continueOnNextPage = true;
        }

        var packetData = new Uint8Array(packetSize);
        for (var i = this.currentSegment; i < this.currentSegment + packetSegments; i++) {
            var size = this.segments[i];
            var offset = (i - this.currentSegment) * 255;
            for (var j = offset; j < offset + size; j++ ) {
                packetData[j] = this.data[this.currentOffset + j];
            }
        }

        var packet = new Object();
        packet.data = packetData;
        packet.continueOnNextPage = continueOnNextPage;
        this.currentSegment += packetSegments;
        this.currentOffset += packetSize;
        return packet;
    }
}

/**
 * Vorbis file
 * @constructor
 */
var VorbisFile = function() {
    this.lastGranulePosition = -1;
    this.audioPackages = [];
    this.i = 0;
    this.addAudioPacket = function(audioData) {
        this.audioSize += audioData.data.length;
        if (audioData.parent.granulePosition > this.lastGranulePosition)
            this.lastGranulePosition = audioData.parent.granulePosition;
        this.audioPackages[this.i++] = audioData;
    };
    this.setInfoPacket = function(infoData) {
        this.infoPacket = infoData;
    };
    this.setCommentsPacket = function(commentsData) {
        this.commentsPacket = commentsData;
    };
    this.setSetupPacket = function(setupData) {
        this.setupPacket = setupData;
    };
    this.getDuration = function() {
        return (this.lastGranulePosition/this.infoPacket.rate);
    };
    this.getComments = function() {
        return (this.commentsPacket.comments);
    };
    this.getBitrate = function() {
        return (this.infoPacket.bitrate);
    };
    this.getCodecPrivateForMatroska = function() {
        var length = this.commentsPacket.data.length + this.infoPacket.data.length + this.setupPacket.data.length + 3;
        var buffer = new Uint8Array(length);
        var position = 0;
        buffer[position++] = 2;
        buffer[position++] = this.infoPacket.data.length;
        buffer[position++] = this.commentsPacket.data.length;
        for (var i = 0; i < this.infoPacket.data.length; i++) {
            buffer[position++] = this.infoPacket.data[i];
        }
        for (var i = 0; i < this.commentsPacket.data.length; i++) {
            buffer[position++] = this.commentsPacket.data[i];
        }
        for (var i = 0; i < this.setupPacket.data.length; i++) {
            buffer[position++] = this.setupPacket.data[i];
        }
        return arrayToBinaryString(buffer, 0, buffer.length);
    };
    this._checkDuration = function(currentDuration, maxDuration) {
        if (maxDuration) {
            return currentDuration < maxDuration;
        }
        return true;
    }
    this.getWebMSpecificAudioPackets = function(duration) {
        var packages = this.audioPackages;
        var result = [];
        var currentPackage = 0;
        var currentTime = 0;
        while (currentPackage < packages.length) {
            var beginTime = packages[currentPackage].parent.granulePosition;
            var beginIndex = currentPackage;
            var size = 0;
            while (currentPackage < packages.length) {
                var isTheSameTimecode = beginTime == packages[currentPackage].parent.granulePosition;
                if (isTheSameTimecode) {
                    size += packages[currentPackage].data.length;
                    currentPackage++;
                } else {
                    break;
                }
            }
            var diff = beginTime - currentTime;
            var bytesInTime = diff / size;
            for (var i = beginIndex; i < currentPackage; i++) {
                packages[i].timecode = (currentTime += bytesInTime * packages[i].data.length);
            }
        }
        for (var j = 0; j < packages.length; j++) {
            var timecodeSmallerThanMax = this._checkDuration(packages[j].timecode/this.infoPacket.rate * MS_IN_SECOND, duration);
            if (!timecodeSmallerThanMax)
                break;
            result.push({
                data : arrayToBinaryString(packages[j].data, 0, packages[j].data.length),
                timecode : packages[j].timecode/this.infoPacket.rate * MS_IN_SECOND
            });
        }
        return result;
    }
};

/**
 * Creates new parser.
 * @param {Buffer} buffer
 * @constructor
 */
var Parser = function (buffer) {
    /** @private */ this._dataIterator = new DataIterator(buffer, 0);
    /** @private */ this._packetReader = new PacketReader(this._dataIterator);
    /** @private */ this._vorbisFile = new VorbisFile();
    this.parse = function() {
        //info
        var infoPacket = this._packetReader.getNextPacket();
        infoPacket.type = "Info";
        infoPacket.version = getIntFrom(infoPacket.data, 7);
        infoPacket.chanels = infoPacket.data[11];
        infoPacket.rate = getIntFrom(infoPacket.data, 12);
        infoPacket.bitrateUpper = getIntFrom(infoPacket.data, 16);
        infoPacket.bitrate = getIntFrom(infoPacket.data, 20);
        infoPacket.bitrateLower = getIntFrom(infoPacket.data, 24);
        infoPacket.blockSize = infoPacket.data[28];
        this._vorbisFile.setInfoPacket(infoPacket);
        //Comments packet
        var commentsPacket = this._packetReader.getNextPacket();
        var dataBegins = 7;
        var len = getIntFrom(commentsPacket.data, dataBegins);
        commentsPacket.vendor = getString(commentsPacket.data, dataBegins + 4, len);
        commentsPacket.comments = [];
        var currentComment = 0;
        var currentPointer = dataBegins + 4 + len;
        var commentsNumber = getIntFrom(commentsPacket.data, currentPointer);
        currentPointer += 4;
        for (var i = 0; i < commentsNumber; i++) {
            len = getIntFrom(commentsPacket.data, currentPointer);
            currentPointer += 4;
            var comment = getString(commentsPacket.data, currentPointer, len);
            currentPointer += len;
            if (comment.indexOf('=') == -1) {
                continue;
            } else {
                commentsPacket.comments[currentComment++] = comment;
            }
        }
        this._vorbisFile.setCommentsPacket(commentsPacket);
        //setup packet
        var setupPacket = this._packetReader.getNextPacket();
        setupPacket.numberOfCodeblocks = setupPacket.data[8];
        console.log(setupPacket.data)
        this._vorbisFile.setSetupPacket(setupPacket);
        //audio
        while (this._packetReader.hasNextPacket()) {
            audioData = this._packetReader.getNextPacket();
            this._vorbisFile.addAudioPacket(audioData);
        }
        return this._vorbisFile;
    };
};
/**
 * reading file
 */
    /*
var file = process.argv[2]
var parser = new Parser(file);
var vorbisFile = parser.parse();
log(vorbisFile.getDuration());
logArray(vorbisFile.getComments());
log(vorbisFile.getBitrate());
*/


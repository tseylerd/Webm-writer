var duration = parseInt(process.argv[2]) * 1000;
var fs = require('fs');

var Video = require('../src/writer.js'); // load module
var video = new Video();

var audioBuffer = fs.readFileSync(__dirname + "/sources/1.ogg");
video.addAudioTrack(audioBuffer, duration);

var usages = video.compile(); //make video and save
video.save(__dirname + "/videos/" + duration / 1000 + "SecAudio.webm");

/*var max = 0;
usages.map(function (e) {
    if (parseInt(e) > max)
        max = e;
});

fs.openSync(__dirname + "/results/" + duration / 1000 + "AMemory.txt", "w");
fs.writeFile(__dirname + "/results/" + duration / 1000 + "AMemory.txt", "Max heap size (bytes): " + max);*/



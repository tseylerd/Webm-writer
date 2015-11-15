var duration = parseInt(process.argv[2]) * 1000;
var fs = require('fs');

var Video = require('../src/writer.js'); // load module
var video = new Video();

var audioBuffer = fs.readFileSync(__dirname + "/sources/1.ogg");
video.addAudioTrack(audioBuffer, duration);

video.compile(); //make video and save
video.save(__dirname + "/videos/" + duration / 1000 + "SecAudio.webm");

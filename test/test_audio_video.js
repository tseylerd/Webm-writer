var duration = parseInt(process.argv[2]) * 1000;
var frames = duration / 40;
var fs = require('fs');

var Video = require('../src/writer.js'); // load module
var video = new Video(400, 400);
var image1 = fs.readFileSync(__dirname + "/sources/1.webp");
var image2 = fs.readFileSync(__dirname + "/sources/2.webp");
var images = [image1.toString('base64'), image2.toString('base64')];

for (var j = 0; j < frames / 2; j++) { // add frames
    video.addVideoFrame(images[0], 40);
    video.addVideoFrame(images[1], 40);
}
var audioBuffer = fs.readFileSync(__dirname + "/sources/1.ogg");
video.addAudioTrack(audioBuffer, duration);
video.compile(); //make video and save
video.save(__dirname + "/videos/" + duration / 1000 + "SecAudioVideo.webm");

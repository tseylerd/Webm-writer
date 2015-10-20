# Webm-writer
Merge WebP images and ogg vorbis audio in WebM video file.

Run build.sh first.

Example:
var fs = require('fs');
var Video = require('webm-writer');
var video = new Video();
video.addAudioTrack("1.ogg"); //file name
var image1 = fs.readFileSync("1.webp");
var image2 = fs.readFileSync("2.webp");
var images = [image1.toString('base64'), image2.toString('base64')];
video.addVideoFrame(images[0], 30000); //duration in millis
video.addVideoFrame(images[1], 30000);
video.addAudioTrack("1.ogg");
var buffer = video.compile() //result buffer
video.save("resultVideo.webm")

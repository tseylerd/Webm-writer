var Parser = require('t-vorbis-parser');
var file = process.argv[2]
var parser = new Parser(file);
var vorbisFile = parser.parse();
console.log(vorbisFile.getDuration());
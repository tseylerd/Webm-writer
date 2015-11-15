Files:
heap.heapsnapshot
cpu.cpuprofile

Problems:
Memory usage can be two times less if we do "this.frames = null" when we don't need frames more. In heap snapshot we can see
that js arrays with video and strings with video uses the same amount of place.
If we run writer with force garbage collection, it doesn't terminated with error, but takes a lot of time.
If we initialize outBuffer like "outBuffer = []", then writer terminated with error on video bigger then 20 seconds.
If we initialize outBuffer lile "outBuffer = new Array()", then writer terminated with error on video bigger then 41 seconds.
CPU:
For about 36% of all time we spent in processObject(...). I don't understand, what is the reason. May be garbage collection?
Because in cpu profile log we can see stack trace like "usr/local/bin/node".

Snapshots can be opened in Chrome dev-tools.
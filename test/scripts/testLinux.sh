#!/bin/bash
time -f "Time: %e secs \nMaybe memory: %M (?)KB" sh testAudioVideo.sh 8 2> ../results/8AVTime.txt
echo "Audio and video time-test for 8 seconds done"
time -f "Time: %e secs \nMaybe memory: %M (?)KB" sh testVideo.sh 8 2> ../results/8VTime.txt
echo "Video time-test for 8 seconds done"
time -f "Time: %e secs \nMaybe memory: %M (?)KB" sh testAudioVideo.sh 4 2> ../results/4AVTime.txt
echo "Audio and video time-test for 4 seconds done"
time -f "Time: %e secs \nMaybe memory: %M (?)KB" sh testVideo.sh 4 2> ../results/4VTime.txt
echo "Video time-test for 4 seconds done"
time -f "Time: %e secs \nMaybe memory: %M (?)KB" sh testAudioVideo.sh 2 2> ../results/2AVTime.txt
echo "Audio and video time-test for 2 seconds done"
time -f "Time: %e secs \nMaybe memory: %M (?)KB" sh testVideo.sh 2 2> ../results/2VTime.txt
echo "Video time-test for 2 seconds done"
time -f "Time: %e secs \nMaybe memory: %M (?)KB" sh testAudioVideo.sh 1 2> ../results/1AVTime.txt
echo "Audio and video time-test for 1 second done"
time -f "Time: %e secs \nMaybe memory: %M (?)KB" sh testVideo.sh 1 2> ../results/1VTime.txt
echo "Video time-test for 1 second done"
valgrind --tool=massif --massif-out-file="../results/8AVMemory.txt" sh testAudioVideo.sh 8 2> /dev/null
ms_print "../results/8AVMemory.txt" 2> "../results/8AVMemory.txt"
echo "Audio and video memory-test for 8 seconds done"
valgrind --tool=massif --massif-out-file="../results/8VMemory.txt" sh testVideo.sh 8 2> /dev/null
ms_print "../results/8VMemory.txt" 2> "../results/8VMemory.txt"
echo "Video memory-test for 8 seconds done"
valgrind --tool=massif --massif-out-file="../results/4AVMemory.txt" sh testAudioVideo.sh 4 2> /dev/null
ms_print "../results/4AVMemory.txt" 2> "../results/4AVMemory.txt"
echo "Audio and video memory-test for 4 seconds done"
valgrind --tool=massif --massif-out-file="../results/4VMemory.txt" sh testVideo.sh 4 2> /dev/null
ms_print "../results/4VMemory.txt" 2> "../results/4VMemory.txt"
echo "Video memory-test for 4 seconds done"
valgrind --tool=massif --massif-out-file="../results/2AVMemory.txt" sh testAudioVideo.sh 2 2> /dev/null
ms_print "../results/2AVMemory.txt" 2> "../results/2AVMemory.txt"
echo "Audio and video memory-test for 2 seconds done"
valgrind --tool=massif --massif-out-file="../results/2VMemory.txt" sh testVideo.sh 2 2> /dev/null
ms_print "../results/2VMemory.txt" 2> "../results/2VMemory.txt"
echo "Video memory-test for 2 seconds done"
valgrind --tool=massif --massif-out-file="../results/1AVMemory.txt" sh testAudioVideo.sh 1 2> /dev/null
ms_print "../results/1AVMemory.txt" 2> "../results/1AVMemory.txt"
echo "Audio and video memory-test for 1 seconds done"
valgrind --tool=massif --massif-out-file="../results/1VMemory.txt" sh testVideo.sh 1 2> /dev/null
ms_print "../results/1VMemory.txt" 2> "../results/1VMemory.txt"
echo "Video memory-test for 1 seconds done"
echo "All done"
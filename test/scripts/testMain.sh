#!/bin/bash
{ time sh testAudioVideo.sh 8 ; } 2> ../results/8AVTime.txt
echo "Audio and video time-test for 8 seconds done"
{ time sh testVideo.sh 8 ; } 2> ../results/8VTime.txt
echo "Video time-test for 8 seconds done"
{ time sh testAudioVideo.sh 4 ; } 2> ../results/4AVTime.txt
echo "Audio and video time-test for 4 seconds done"
{ time sh testVideo.sh 4 ; } 2> ../results/4VTime.txt
echo "Video time-test for 4 seconds done"
{ time sh testAudioVideo.sh 2 ; } 2> ../results/2AVTime.txt
echo "Audio and video time-test for 2 seconds done"
{ time sh testVideo.sh 2 ; } 2> ../results/2VTime.txt
echo "Video time-test for 2 seconds done"
{ time sh testAudioVideo.sh 1 ; } 2> ../results/1AVTime.txt
echo "Audio and video time-test for 1 second done"
{ time sh testVideo.sh 1 ; } 2> ../results/1VTime.txt
echo "Video time-test for 1 second done"
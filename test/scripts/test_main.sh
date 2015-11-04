#!/bin/bash
{ time sh test_audio_video.sh 8 ; } 2> ../results/8AVTime.txt
echo "Audio and video time-test for 8 seconds done"
{ time sh test_video.sh 8 ; } 2> ../results/8VTime.txt
echo "Video time-test for 8 seconds done"
{ time sh test_audio.sh 8 ; } 2> ../results/8ATime.txt
echo "Audio time-test for 8 seconds done"
{ time sh test_audio_video.sh 4 ; } 2> ../results/4AVTime.txt
echo "Audio and video time-test for 4 seconds done"
{ time sh test_video.sh 4 ; } 2> ../results/4VTime.txt
echo "Video time-test for 4 seconds done"
{ time sh test_audio.sh 4 ; } 2> ../results/4ATime.txt
echo "Audio time-test for 4 seconds done"
{ time sh test_audio_video.sh 2 ; } 2> ../results/2AVTime.txt
echo "Audio and video time-test for 2 seconds done"
{ time sh test_video.sh 2 ; } 2> ../results/2VTime.txt
echo "Video time-test for 2 seconds done"
{ time sh test_audio.sh 2 ; } 2> ../results/2ATime.txt
echo "Audio time-test for 2 seconds done"
{ time sh test_audio_video.sh 1 ; } 2> ../results/1AVTime.txt
echo "Audio and video time-test for 1 second done"
{ time sh test_video.sh 1 ; } 2> ../results/1VTime.txt
echo "Video time-test for 1 second done"
{ time sh test_audio.sh 1 ; } 2> ../results/1ATime.txt
echo "Audio time-test for 1 second done"
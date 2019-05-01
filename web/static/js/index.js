let video = document.querySelector('#videoElement');
let canvas = document.querySelector('#canvas');
let ctx = canvas.getContext('2d');

let videoWidth = 0;
let videoHeight = 0;
let timerPID = null;
let temporaryImage = null;
let initialName = "Unknown";
let rectangleCoordinates = null;
let lastGeneratedFrame = 0;
let socket = io.connect(location.origin, { 'timeout': 120000 });


function initializeSocketIO() {
    socket.on('connect', function() {
        console.log("Connected");
    });

    socket.on('disconnect', function() {
        console.log("Connection closed");
    });
    
    socket.on('person_name', function(message) {
        if(message !== initialName) {
            speak(generateGreetingMessage(message));
            initialName = message;
        }
    });
    
    socket.on('face_coordinates', function(coordinates) {
        if (coordinates.status == 'SUCCESS') {
            let left = coordinates.left;
            let top = coordinates.top;
            let width = coordinates.right - coordinates.left;
            let height = coordinates.bottom - coordinates.top;
            rectangleCoordinates = { left, top, width, height };
            lastGeneratedFrame = 0;
        } else {
            rectangleCoordinates = null;
        }
    });
}


function setupMediaDevices() {
    if (navigator.mediaDevices.getUserMedia) {
        let grabUserMedia = navigator.mediaDevices.getUserMedia({ 
            audio: false,
            video: {
                width: { min: 640, ideal: 640, max: 1920 },
                height: { min: 480, ideal: 480, max: 1080 },
                frameRate: { ideal: 25, max: 30 }
            }
        });
    
        grabUserMedia.then(function(stream) {
            video.srcObject = stream;
    
            let getVideoSize = function() {
                videoWidth = video.videoWidth;
                videoHeight = video.videoHeight;
    
                canvas.setAttribute('width', videoWidth);
                canvas.setAttribute('height', videoHeight);
    
                video.removeEventListener('playing', getVideoSize, false);
            };
    
            video.addEventListener('playing', getVideoSize, false);
        });
    
        grabUserMedia.catch(function(error) {
            console.log('Something went wrong!', error);
        });
    }
}


function drawRectangle(coordinates) {
    if(coordinates) {
        let { left, top, width, height } = coordinates;

        ctx.beginPath();
        ctx.lineWidth = "4";
        ctx.strokeStyle = "green";

        ctx.rect(left, top, width, height);
        ctx.stroke();

        ctx.font = "bold 18px Arial";
        ctx.fillStyle = "green";
        ctx.fillText(initialName, left + 5, top + height + 25);
    }
}


let frameCounter = 0;
function sendDataFrames() {
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    if ((frameCounter % 25) === 0) {
        let data = canvas.toDataURL('image/jpeg');
        socket.emit('stream', data);
    }

    if(lastGeneratedFrame <= 25) {
        drawRectangle(rectangleCoordinates);
    }

    frameCounter += 1;
    lastGeneratedFrame += 1;
}


function startStreaming() {
    console.log('[INFO] STARTING STREAMING');
    timerPID = window.setInterval(sendDataFrames, 40);
}


function stopStreaming() {
	if(timerPID) {
        console.log("[CLEARING]");
		window.clearInterval(timerPID);
        socket.disconnect();
    }
}


function speak(text, callback) {
    let u = new SpeechSynthesisUtterance();
    u.text = text;
    u.lang = 'en-US';
 
    u.onend = function () {
        if (callback) {
            callback();
        }
    };
 
    u.onerror = function (e) {
        if (callback) {
            callback(e);
        }
    };
 
    speechSynthesis.speak(u);
}


function generateGreetingMessage(name) {
    let hours = new Date().getHours();
    console.log(hours);
    let message = 'Hello';

    if (hours > 5) {
        message = 'Good Morning';
    } if (hours >= 12 && hours < 16) {
        message = 'Good Afternoon';
    } if (hours >= 16 && hours < 19) {
        message = 'Good Evening';
    }

	if (name === 'Unknown'){
        name = 'Stranger'
    }

    message += ', ' + name + ' !';
    return message;
}

(function(){
    initializeSocketIO();
    setupMediaDevices();
}())
let video = document.querySelector('#videoElement');
let canvas = document.querySelector('#canvas');
let imageElement = document.querySelector('#live');
let ctx = canvas.getContext('2d');

let videoWidth, videoHeight;

let socket = null;
let temporaryImage;
let initialName = "Unknown";

if (navigator.mediaDevices.getUserMedia) {
	navigator.mediaDevices
		.getUserMedia({ 
            audio: false,
            video: {
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                frameRate: { ideal: 25, max: 30 }
            }
        })
		.then(function(stream) {
            video.srcObject = stream;

            let getVideoSize = function() {
                videoWidth = video.videoWidth;
                videoHeight = video.videoHeight;

                imageElement.setAttribute('width', videoWidth);
                imageElement.setAttribute('height', videoHeight);

                canvas.setAttribute('width', videoWidth);
                canvas.setAttribute('height', videoHeight);

                video.removeEventListener('playing', getVideoSize, false);
            };

            video.addEventListener('playing', getVideoSize, false);
		})
		.catch(function(err0r) {
			console.log('Something went wrong!');
		});
}

let timerPID = null;
function startStreaming() {
    console.log('[INFO] STARTING STREAMING')
    video.classList.add('hide');
    imageElement.classList.remove('hide');

    socket = io.connect(location.origin, {
        'timeout': 120000
    });

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
    
    socket.on('restreaming', function(message) {
        let bytes = new Uint8Array(message);
        let dataURI = 'data:image/jpeg;base64,'+ encode(bytes);
        
        imageElement.setAttribute('src', dataURI);
        // drawDataURIOnCanvas(dataURI, liveCanvas);
        // updateImageElement(dataURI);
    });


	timerPID = setInterval(() => {
		ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        let data = canvas.toDataURL('image/jpeg');
        
		// let blob = dataURItoBlob(data);
		socket.emit('stream', data);
    }, 40);
}


function stopStreaming() {
    imageElement.classList.add('hide');
    video.classList.remove('hide');
    
	if(timerPID) {
        console.log("[CLEARING]");
		clearInterval(timerPID);
    }
}


function dataURItoBlob(dataURI) {
    var binary = atob(dataURI.split(',')[1]);
    var array = [];
    for(var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], {type: 'image/jpeg'});
}


function encode (input) {
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;

    while (i < input.length) {
        chr1 = input[i++];
        chr2 = i < input.length ? input[i++] : Number.NaN; // Not sure if the index 
        chr3 = i < input.length ? input[i++] : Number.NaN; // checks are needed here

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;

        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
            enc4 = 64;
        }
        output += keyStr.charAt(enc1) + keyStr.charAt(enc2) +
                  keyStr.charAt(enc3) + keyStr.charAt(enc4);
    }
    return output;
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


function updateImageElement(base64Image) {
    let BASE64_MARKER = ';base64,';
    let objectURL = window.URL || window.webkitURL;

    function convertDataURIToBlob(dataURI) {
        if(!dataURI) {
            return;
        }
        
        let base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
        let base64 = dataURI.substring(base64Index);
        let raw = window.atob(base64);
        let rawLength = raw.length;
        let array = new Uint8Array(new ArrayBuffer(rawLength));

        for (let i = 0; i < rawLength; i++) {
            array[i] = raw.charCodeAt(i);
        }

        return new Blob([array], {type: "image/jpeg"});
    }

    if (temporaryImage) {
        objectURL.revokeObjectURL(temporaryImage);
    }
    
    let imageDataBlob = convertDataURIToBlob(base64Image);
    temporaryImage = objectURL.createObjectURL(imageDataBlob);
    imageElement.src = temporaryImage;
}


function drawDataURIOnCanvas(strDataURI, canvas) {
    let img = new window.Image();
    img.addEventListener("load", function () {
        canvas.getContext("2d").drawImage(img, 0, 0);
    });
    img.setAttribute("src", strDataURI);
}

function generateGreetingMessage(name) {
    let hours = new Date().getHours();
    console.log(hours);
    let message = 'Hello';

    if (hours > 5) {
        message = 'Good Morning';
    } if (hours >= 12) {
        message = 'Good Afternoon';
    } if (hours >= 16 && hours < 19) {
        message = 'Good Evening';
    }
	if(name==='Unknown'){
        name='Stranger'
    }

    message += ', ' + name + ' !';
    return message;
}

let userInput = document.querySelector('#username')
let connectButton = document.querySelector('#connectButton')
let divMsg = document.querySelector('#div_message')
let btnCreateChat = document.querySelector('#btnCreateChat')
let chatLog = document.querySelector('#chat-log')
let acceptDiv = document.querySelector('#acceptDiv')

let conn;
let username = ''
let peerConnection;
let dataChannel;
let input = document.getElementById("messageInput");

let btnCamera = document.querySelector('#getMedia')
const camera = document.querySelector('#myVideo');
// let callVideo = document.querySelector('#callVideo');

let localStream = new MediaStream()

let config = {
    iceServers: [
        {urls: 'stun:178.250.157.153:3478'},
        {
            urls: "turn:178.250.157.153:3478",
            username: "test",
            credential: "test123"
        }
    ],
    // iceTransportPolicy: "all"
};


const constraints = {
    video: true,
    audio: true
};

let roomName = 'test';

let connectedPeers = {};

function connect() {
    username = userInput.value
    username = userInput.value
    if (username === '') {
        alert('Your name is empty!')
        return;
    }
    conn = new WebSocket(`wss://e75d-178-218-200-199.ngrok-free.app/chat/${roomName}/${username}`);
    conn.addEventListener('open', (e) => {
        console.log("Connected to the signaling server");
        initialize(username);
        console.log(conn.data)
    })
    conn.addEventListener('message', onmessage)

    btnCreateChat.style.display = 'block'
    connectButton.style.display = 'none'
    userInput.disabled = true

    
}


function onmessage(msg) {
    let content = JSON.parse(msg.data);
    let data = content.data;

    if (content.peer === username) {
        return;
    }

    switch (content.event) {
        case "offer":
            handleOffer(data, content.peer);
            console.log('offer from', content.peer);
            break;
        case "answer":
            handleAnswer(data, content.peer);
            console.log('answer from', content.peer);
            break;
        case "candidate":
            handleCandidate(data, content.peer);
            console.log('candidate from', content.peer);
            break;
        default:
            break;
    }
}



function send(message) {
    conn.send(JSON.stringify(message))
}


function initialize(username) {
    connectedPeers[username] = new RTCPeerConnection(config);

    connectedPeers[username].onicecandidate = function (event) {
        if (event.candidate) {
            send({
                peer: username,
                event: "candidate",
                data: event.candidate
            });
        }
    };  

    dataChannel = connectedPeers[username].createDataChannel("dataChannel", {
        reliable: true
    });


    dataChannel.onerror = function (error) {
        console.log("Error occurred on datachannel:", error);
    };

    dataChannel.onmessage = function (event) {
        console.log("message:", event.data);
        chatLog.value += (event.data + '\n');
    };

    dataChannel.onclose = function () {
        console.log("data channel is closed");
        alert("Your interlocutor has disconnected");
    };

    dataChannel.onopen = function () {
        console.log("Data channel is open");
        // Now you can send messages or perform other actions
    };

    // Create data channel (you may want to customize this logic)
    

    connectedPeers[username].ondatachannel = function (event) {
        // Можете оставить эту часть пустой или добавить логику при необходимости
    };

    // Set up event listeners for the data channel (similar to above)

    // Create offer logic, similar to what you've done in createOffer
}

function createOffer() {
    for (let peer in connectedPeers) {
        let peerConnection = connectedPeers[peer];

        if (localStream) {
            localStream.getTracks().forEach(track => {
                // Check if the track is not already associated with a sender
                if (!peerConnection.getSenders().some(sender => sender.track === track)) {
                    peerConnection.addTrack(track, localStream);
                }
            });
        }

        peerConnection.createOffer(function (offer) {
            send({
                peer: username,
                target: peer,
                event: "offer",
                data: offer
            });
            peerConnection.setLocalDescription(offer);
        }, function (error) {
            alert("Error creating an offer");
        });

        divMsg.style.display = 'block';
        btnCreateChat.style.display = 'none';
        acceptDiv.style.display = 'block';
    }
}



let remoteStream = new MediaStream();
let videoContainer = document.getElementById('videoContainer');

function handleOffer(offer, peer) {
    if (!connectedPeers[peer]) {
        let peerConnection = new RTCPeerConnection(config);
        connectedPeers[peer] = peerConnection;

        peerConnection.addEventListener('icecandidate', (event) => {
            if (event.candidate) {
                send({
                    peer: username,
                    target: peer,
                    event: 'candidate',
                    data: event.candidate,
                });
            }
        });

        peerConnection.addEventListener('datachannel', (event) => {
            // Handle data channel events if needed
        });

        let remoteVideo = document.createElement('video');
        remoteVideo.autoplay = true;
        remoteVideo.width = 200;
        remoteVideo.id = `remoteVideo-${peer}`;

        // Append the video element to the container
        if (videoContainer) {
            videoContainer.appendChild(remoteVideo);
        } else {
            console.error("Video container not found.");
            return;
        }

        // Set up the remote stream and track event listeners
        peerConnection.addEventListener('track', (event) => {
            if (!remoteVideo.srcObject) {
                remoteVideo.srcObject = new MediaStream();
            }
            remoteVideo.srcObject.addTrack(event.track);

            // Ensure video playback after 'loadedmetadata'
            remoteVideo.addEventListener('loadedmetadata', () => {
                remoteVideo.play().catch(error => console.error('Error playing video:', error));
            });
        });
    }

    let peerConnection = connectedPeers[peer];
    peerConnection.setRemoteDescription(offer)
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => {
            send({
                peer: username,
                target: peer,
                event: 'answer',
                data: peerConnection.localDescription,
            });
        })
        .catch(error => console.error('Error setting remote description or creating answer:', error));
}



function handleCandidate(candidate, peer) {
    if (connectedPeers[peer]) {
        connectedPeers[peer].addIceCandidate(new RTCIceCandidate(candidate))
            .catch(error => console.error("Error adding ice candidate:", error));
    } else {
        console.warn("Peer connection not found for candidate:", candidate);
    }
}


function handleAnswer(answer, peer) {
    if (connectedPeers[peer]) {
        connectedPeers[peer]
            .setRemoteDescription(new RTCSessionDescription(answer))
            .then(() => {
                console.log('Remote description set successfully.');
                // At this point, the remote stream should be playing in the video element.
            })
            .catch((error) => {
                console.error('Error setting remote description:', error);
            });
    } else {
        console.warn("No RTCPeerConnection found for peer:", peer);
    }
}


function closeConnection(peer) {
    connectedPeers[peer].close();
    delete connectedPeers[peer];
}


function sendMessage() {
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(input.value);
        console.log("Сообщение:", input.value);
        chatLog.value += (input.value + '\n');
        input.value = "";
    } else {
        console.warn("Канал передачи данных не открыт. Невозможно отправить сообщение.");
    }
}



function my_stream(e) {
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            localStream = stream;

            // Mute local audio to avoid feedback
            let audioTrack = localStream.getAudioTracks();
            if (audioTrack.length > 0) {
                audioTrack[0].enabled = false;
            }

            // Enable local video
            let videoTrack = localStream.getVideoTracks();
            if (videoTrack.length > 0) {
                videoTrack[0].enabled = true;
            }

            // Set the local stream as the source for the camera element
            camera.srcObject = localStream;
            camera.muted = true;

            console.log('Local stream obtained:', stream);
        })
        .catch(error => {
            console.error('Error accessing media devices:', error);
        });
}



btnCamera.addEventListener('click', my_stream)

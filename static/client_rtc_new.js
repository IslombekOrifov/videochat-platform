let userInput = document.querySelector('#username')
let connectButton = document.querySelector('#connectButton')
let divMsg = document.querySelector('#div_message')
let btnCreateChat = document.querySelector('#btnCreateChat')
let chatLog = document.querySelector('#chat-log')
let acceptDiv = document.querySelector('#acceptDiv')
let btnCamera = document.querySelector('#getMedia')
const camera = document.querySelector('#myVideo');


let conn;
let username = ''
let peerConnection;
let dataChannel;
let input = document.getElementById("messageInput");
let remoteStreams = {};

// let callVideo = document.querySelector('#callVideo');

let localStream = new MediaStream()

// let config = {
//     iceServers: [
//         {urls: 'stun:178.250.157.153:3478'},
//         {
//             urls: "turn:178.250.157.153:3478",
//             username: "test",
//             credential: "test123"
//         }
//     ],
//     // iceTransportPolicy: "all"
// };
let config = {
    iceServers: [
        {urls: 'stun:178.250.157.153:3478'},
        {
            urls: "turn:178.250.157.153:3478",
            username: "test",
            credential: "test123"
        }
    ]
};


const constraints = {
    video: true,
    audio: true
};

let roomName = 'test';

function connect() {
    // username = userInput.value
    // username = userInput.value
    // if (username === '') {
    //     alert('Your name is empty!')
    //     return;
    // }
    // // conn = new WebSocket(`wss://55fb-178-218-200-199.ngrok-free.app/chat/${roomName}/${username}`);
    // conn = new WebSocket(`wss://93e7-178-218-200-199.ngrok-free.app/chat/${roomName}/${username}`);

    // conn.addEventListener('open', (e) => {
    //     console.log("Connected to the signaling server");
    //     initialize(username);
    // })
    // conn.addEventListener('message', onmessage)

    // btnCreateChat.style.display = 'block'
    // connectButton.style.display = 'none'
    // userInput.disabled = true
    let username = userInput.value;
    if (username === '') {
        alert('Your name is empty!');
        return;
    }
    let roomName = 'test'; // Update this dynamically based on the room you want to join.
    let conn = new WebSocket(`wss://5e29-178-218-200-199.ngrok-free.app/chat/${roomName}/${username}`);
    conn.addEventListener('open', (e) => {
        console.log("Connected to the signaling server");
        initialize(username);
    });
    conn.addEventListener('message', onmessage);

    btnCreateChat.style.display = 'block';
    connectButton.style.display = 'none';
    userInput.disabled = true;
}


function onmessage(msg) {
    let content = JSON.parse(msg.data);
    let data = content.data
    // console.log(content)
    if (content.peer === username) {
        return;
    }

    switch (content.event) {
        case "offer":
            handleOffer(data)
            console.log('offer')
            break;
        case "answer":
            handleAnswer(data)
            console.log('answer')
            break;
        case "candidate":
            handleCandidate(data)
            console.log('candidate')
            break;
        default:
            break;
    }
    // let content = JSON.parse(msg.data);
    // let data = content.data;
    // if (content.peer === username) {
    //     return;
    // }

    // switch (content.event) {
    //     case "offer":
    //         handleOffer(data);
    //         break;
    //     case "answer":
    //         handleAnswer(data);
    //         break;
    //     case "candidate":
    //         handleCandidate(data);
    //         break;
    //     default:
    //         break;
    // }
}


function send(message) {
    conn.send(JSON.stringify(message))
}


function initialize(username) {
    peerConnection = new RTCPeerConnection(config)

    peerConnection.onicecandidate = function (event) {
        if (event.candidate) {
            send({
                peer: username,
                event: "candidate",
                data: event.candidate
            });
            // console.log('event.candidate', event.candidate)
        }
    };

    dataChannel = peerConnection.createDataChannel("dataChannel", {
        reliable: true
    })

    dataChannel.onerror = function (error) {
        console.log("Error occured on datachannel:", error)
    }

    dataChannel.onmessage = function (event) {
        console.log("message:", event.data)
        chatLog.value += (event.data + '\n')
    }

    dataChannel.onclose = function () {
        console.log("data channel is closed")
        alert("Your interlocutor has disconnected")
    }

    peerConnection.ondatachannel = function (event) {
        dataChannel = event.channel
    }
}

function createOffer() {
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream)
        })
    }

    peerConnection.createOffer(function (offer) {
        send({
            peer: username,
            event: "offer",
            data: offer
        });
        peerConnection.setLocalDescription(offer);
    }, function (error) {
        alert("Error creating an offer");
    })

    divMsg.style.display = 'block'
    btnCreateChat.style.display = 'none'
    acceptDiv.style.display = 'block'
}


let remoteStream = new MediaStream();

function handleOffer(offer) {
    remoteStreams[offer.peer] = remoteStream;

    peerConnection.addEventListener('track', async (event) => {
        console.log('Adding track: ', event.track);
        remoteStreams[offer.peer].addTrack(event.track, remoteStreams[offer.peer]);
    });

    
    localStream.getTracks().forEach(track => {
        // Check if the track is not already added
        if (!peerConnection.getSenders().some(sender => sender.track === track)) {
            peerConnection.addTrack(track, localStream);
        }
    });
    
    let remoteVideo = document.querySelector('#callVideo')
    remoteVideo.srcObject = remoteStream

    window.stream = remoteStream

    peerConnection.addEventListener('track', async (event) => {
        console.log('Adding track: ', event.track)
        remoteStream.addTrack(event.track, remoteStream)
    })

    remoteVideo.play()

    peerConnection.setRemoteDescription(offer)
        .then(() => {
            console.log('Set Remote Description', username);
            return peerConnection.createAnswer()
        })
        .then(answer => {
            console.log('Answer create');
            peerConnection.setLocalDescription(answer)

            send({
                peer: username,
                event: "answer",
                data: answer
            })

            divMsg.style.display = 'block'
            btnCreateChat.style.display = 'none'
            acceptDiv.style.display = 'block'
        })
        .catch(error => {
            console.error('Error setting remote description:', error);
        });
}

function handleCandidate(candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    // console.log("handleCandidate!!")
}

function handleAnswer(answer) {
    remoteStream = new MediaStream()
    let remoteVideo = document.querySelector('#callVideo')
    remoteVideo.srcObject = remoteStream

    window.stream = remoteStream;

    peerConnection.addEventListener('track', async (event) => {
        console.log('Adding track: ', event.track)
        remoteStream.addTrack(event.track, remoteStream)
    })

    remoteVideo.play()

    peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        .then(() => {
            console.log('Set Remote Description', username)
            return peerConnection.createAnswer()
        })
        .then(answer => {
            console.log('Answer create')
            peerConnection.setLocalDescription(answer)
        })
    console.log("connection established successfully!!")
}


function sendMessage() {
    dataChannel.send(input.value)
    console.log("message:", input.value)
    chatLog.value += (input.value + '\n')
    input.value = ""
}


function my_stream(e) {
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            localStream = stream
            camera.srcObject = localStream
            camera.muted = true

            let audioTrack = stream.getAudioTracks()
            let videoTrack = stream.getVideoTracks()
            // audioTrack[0].enabled = false
            videoTrack[0].enabled = true

            console.log('stream', stream)
        }).catch(error => {
        console.log('Error media', error)
    })
}


btnCamera.addEventListener('click', my_stream)



// your-main-script.js
// let userInput = document.querySelector('#username');
// let connectButton = document.querySelector('#connectButton');
// let divMsg = document.querySelector('#div_message');
// let btnCreateChat = document.querySelector('#btnCreateChat');
// let chatLog = document.querySelector('#chat-log');
// let acceptDiv = document.querySelector('#acceptDiv');
// let btnCamera = document.querySelector('#btnCamera');
// const camera = document.querySelector('#myVideo');
// let localStream = new MediaStream();
// let config = {
//     iceServers: [
//         {urls: 'stun:178.250.157.153:3478'},
//         {
//             urls: "turn:178.250.157.153:3478",
//             username: "test",
//             credential: "test123"
//         }
//     ]
// };
// let peerConnection;
// let dataChannel;
// let input = document.getElementById("messageInput");
// let remoteStreams = {}; // Keep track of remote streams for each user

// function connect() {
//     let username = userInput.value;
//     if (username === '') {
//         alert('Your name is empty!');
//         return;
//     }
//     let roomName = 'test'; // Update this dynamically based on the room you want to join.
//     let conn = new WebSocket(`wss://55fb-178-218-200-199.ngrok-free.app/chat/${roomName}/${username}`);
//     conn.addEventListener('open', () => {
//         console.log("Connected to the signaling server");
//         initialize(username);
//     });
//     conn.addEventListener('message', onmessage);

//     btnCreateChat.style.display = 'block';
//     connectButton.style.display = 'none';
//     userInput.disabled = true;
// }

// function onmessage(msg) {
//     let content = JSON.parse(msg.data);
//     let data = content.data;
//     if (content.peer === username) {
//         return;
//     }

//     switch (content.event) {
//         case "offer":
//             handleOffer(data);
//             break;
//         case "answer":
//             handleAnswer(data);
//             break;
//         case "candidate":
//             handleCandidate(data);
//             break;
//         default:
//             break;
//     }
// }

// function send(message) {
//     conn.send(JSON.stringify(message));
// }

// function initialize(username) {
//     peerConnection = new RTCPeerConnection(config);

//     peerConnection.onicecandidate = function (event) {
//         if (event.candidate) {
//             send({
//                 peer: username,
//                 event: "candidate",
//                 data: event.candidate
//             });
//         }
//     };

//     dataChannel = peerConnection.createDataChannel("dataChannel", {
//         reliable: true
//     });

//     dataChannel.onerror = function (error) {
//         console.log("Error occurred on datachannel:", error);
//     };

//     dataChannel.onmessage = function (event) {
//         console.log("message:", event.data);
//         chatLog.value += (event.data + '\n');
//     };

//     dataChannel.onclose = function () {
//         console.log("data channel is closed");
//         alert("Your interlocutor has disconnected");
//     };

//     peerConnection.ondatachannel = function (event) {
//         dataChannel = event.channel;
//     };
// }

// function createOffer() {
//     if (localStream) {
//         localStream.getTracks().forEach(track => {
//             peerConnection.addTrack(track, localStream);
//         });
//     }

//     peerConnection.createOffer(function (offer) {
//         send({
//             peer: username,
//             event: "offer",
//             data: offer
//         });
//         peerConnection.setLocalDescription(offer);
//     }, function (error) {
//         alert("Error creating an offer");
//     });

//     divMsg.style.display = 'block';
//     btnCreateChat.style.display = 'none';
//     acceptDiv.style.display = 'block';
// }

// function handleOffer(offer) {
//     // Update this part to create a new remote stream for each user
//     let remoteStream = new MediaStream();
//     remoteStreams[offer.peer] = remoteStream;

//     peerConnection.addEventListener('track', async (event) => {
//         console.log('Adding track: ', event.track);
//         remoteStreams[offer.peer].addTrack(event.track, remoteStreams[offer.peer]);
//     });

//     let remoteVideo = document.querySelector('#callVideo');
//     remoteVideo.srcObject = remoteStreams[offer.peer];

//     peerConnection.setRemoteDescription(offer)
//         .then(() => {
//             console.log('Set Remote Description', username);
//             return peerConnection.createAnswer();
//         })
//         .then(answer => {
//             console.log('Answer created');
//             peerConnection.setLocalDescription(answer);

//             send({
//                 peer: username,
//                 event: "answer",
//                 data: answer
//             });

//             divMsg.style.display = 'block';
//             btnCreateChat.style.display = 'none';
//             acceptDiv.style.display = 'block';
//         })
//         .catch(error => {
//             console.error('Error setting remote description:', error);
//         });
// }

// function handleCandidate(candidate) {
//     peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
// }

// function handleAnswer(answer) {
//     // Update this part to use different remote streams for each user
//     let remoteStream = new MediaStream();
//     remoteStreams[answer.peer] = remoteStream;

//     let remoteVideo = document.querySelector('#callVideo');
//     remoteVideo.srcObject = remoteStreams[answer.peer];

//     peerConnection.addEventListener('track', async (event) => {
//         console.log('Adding track: ', event.track);
//         remoteStreams[answer.peer].addTrack(event.track, remoteStreams[answer.peer]);
//     });

//     peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
//         .then(() => {
//             console.log('Set Remote Description', username);
//             return peerConnection.createAnswer();
//         })
//         .then(answer => {
//             console.log('Answer created');
//             peerConnection.setLocalDescription(answer);
//         });

//     console.log("Connection established successfully!!");
// }

// function sendMessage() {
//     dataChannel.send(input.value);
//     console.log("message:", input.value);
//     chatLog.value += (input.value + '\n');
//     input.value = "";
// }

// function my_stream() {
//     navigator.mediaDevices.getUserMedia({ video: true, audio: true })
//         .then(stream => {
//             localStream = stream;
//             camera.srcObject = localStream;
//             camera.muted = true;

//             let audioTrack = stream.getAudioTracks();
//             let videoTrack = stream.getVideoTracks();
//             videoTrack[0].enabled = true;

//             console.log('stream', stream);
//         }).catch(error => {
//             console.log('Error media', error);
//         });
// }

// btnCamera.addEventListener('click', my_stream);
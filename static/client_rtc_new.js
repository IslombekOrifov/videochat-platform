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
        // {"urls": 'stun:stun.l.google.com:19302',}
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

function connect() {
    username = userInput.value
    username = userInput.value
    if (username === '') {
        alert('Your name is empty!')
        return;
    }
    conn = new WebSocket(`wss://55fb-178-218-200-199.ngrok-free.app/chat/${roomName}/${username}`);
    
    conn.addEventListener('open', (e) => {
        console.log("Connected to the signaling server");
        initialize(username);
    })
    conn.addEventListener('message', onmessage)

    btnCreateChat.style.display = 'block'
    connectButton.style.display = 'none'
    userInput.disabled = true
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
    if (!peerConnection) {
        initialize(username);
    }

    localStream.getTracks().forEach(track => {
        if (!peerConnection.getSenders().find(sender => sender.track === track)) {
            peerConnection.addTrack(track, localStream);
        }
    });

    let remoteVideo = document.querySelector('#callVideo');
    remoteVideo.srcObject = remoteStream;
    // let remoteVideo1 = document.querySelector('#callVideo1');
    // let remoteVideo2 = document.querySelector('#callVideo2');
    // remoteVideo1.srcObject = remoteStream;
    // remoteVideo2.srcObject = remoteStream;

    window.stream = remoteStream;

    peerConnection.addEventListener('track', (event) => {
        console.log('Добавление трека: ', event.track);
        remoteStream.addTrack(event.track, remoteStream);
    });

    remoteVideo.play();
    // remoteVideo1.play();
    // remoteVideo2.play();

    peerConnection.setRemoteDescription(offer)
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => {
            send({
                peer: username,
                event: "answer",
                data: peerConnection.localDescription,
            });

            divMsg.style.display = 'block';
            btnCreateChat.style.display = 'none';
            acceptDiv.style.display = 'block';
        })
        .catch(error => {
            console.error('Ошибка при обработке предложения:', error);
        });
}
let pendingCandidates = {};

function handleCandidate(peerConnection, candidate) {
    if (peerConnection && peerConnection.remoteDescription) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .catch(error => {
                console.error('Ошибка при добавлении кандидата:', error);
            });
    } else {
        console.warn('Получен кандидат, но удаленное описание еще не установлено.');
    }
}

function addIceCandidate(username, candidate) {
    const peerConnection = peerConnections[username];

    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => {
                console.log(`Кандидат для ${username} успешно добавлен.`);
            })
            .catch(error => {
                console.error(`Ошибка при добавлении кандидата для ${username}:`, error);
            });
    }
}



// function handleAnswer(answer) {
//     remoteStream = new MediaStream()
//     let remoteVideo = document.querySelector('#callVideo')
//     remoteVideo.srcObject = remoteStream

//     window.stream = remoteStream;

//     peerConnection.addEventListener('track', async (event) => {
//         console.log('Adding track: ', event.track)
//         remoteStream.addTrack(event.track, remoteStream)
//     })

//     remoteVideo.play()

//     peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
//         .then(() => {
//             console.log('Set Remote Description', username)
//             return peerConnection.createAnswer()
//         })
//         .then(answer => {
//             console.log('Answer create')
//             peerConnection.setLocalDescription(answer)
//         })
//     console.log("connection established successfully!!")
// }


let peerConnections = {};
let remoteStreams = {};

function handleAnswer(username, answer) {
    if (!peerConnections[username]) {
        initializePeerConnection(username);
    }

    const peerConnection = peerConnections[username];
    const remoteStream = new MediaStream();

    let remoteVideo = document.querySelector(`#${username}-callVideo`);
    if (!remoteVideo) {
        // Создайте новый элемент video для каждого пользователя
        remoteVideo = createRemoteVideoElement(username);
    }

    remoteVideo.srcObject = remoteStream;
    window.stream = remoteStream;

    peerConnection.addEventListener('track', (event) => {
        console.log(`Adding track for ${username}: `, event.track);
        remoteStream.addTrack(event.track, remoteStream);
    });

    remoteVideo.play();

    peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => {
            console.log(`Set Remote Description for ${username}`);
            send({
                peer: username,
                event: "answer",
                data: peerConnection.localDescription,
            });
        })
        .catch(error => {
            console.error(`Error establishing connection with ${username}:`, error);
        });
}

function onRemoteDescriptionSet(username) {
    // Добавить все ожидающие кандидаты для данного пользователя
    const candidates = pendingCandidates[username] || [];
    while (candidates.length > 0) {
        addIceCandidate(username, candidates.shift());
    }
}


function createRemoteVideoElement(username) {
    let acceptDiv = document.createElement('div');
    acceptDiv.id = `acceptDiv-${username}`;
    acceptDiv.classList.add('col-lg-6');

    let paragraph = document.createElement('p');
    paragraph.textContent = 'Caller: ';

    let video = document.createElement('video');
    video.autoplay = true;
    video.width = 200;
    video.id = `${username}-callVideo`;

    acceptDiv.appendChild(paragraph);
    acceptDiv.appendChild(video);

    document.body.appendChild(acceptDiv);

    return video;
}


function initializePeerConnection(username) {
    peerConnections[username] = new RTCPeerConnection(config);

    peerConnections[username].onicecandidate = function (event) {
        if (event.candidate) {
            send({
                peer: username,
                event: "candidate",
                data: event.candidate
            });
        }
    };

    remoteStreams[username] = new MediaStream();

    peerConnections[username].addEventListener('track', async (event) => {
        console.log(`Adding track for ${username}: `, event.track);
        remoteStreams[username].addTrack(event.track, remoteStreams[username]);
    });

    const dataChannel = peerConnections[username].createDataChannel("dataChannel", {
        reliable: true
    });

    dataChannel.onerror = function (error) {
        console.log(`Error occurred on datachannel for ${username}:`, error);
    };

    dataChannel.onmessage = function (event) {
        console.log(`Message from ${username}:`, event.data);
        // Handle the received message as needed
    };

    dataChannel.onclose = function () {
        console.log(`Data channel for ${username} is closed`);
        alert(`Your interlocutor ${username} has disconnected`);
    };

    peerConnections[username].ondatachannel = function (event) {
        dataChannels[username] = event.channel;
    };
}

// Modify the send function to handle sending messages to a specific user
function sendToUser(username, message) {
    const targetConnection = peerConnections[username];
    if (targetConnection && targetConnection.signalingState === 'stable') {
        targetConnection.createDataChannel.send(message);
    }
}

// Usage example for sending a message to a specific user
sendToUser('user1', 'Hello, user1!');



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
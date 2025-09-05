let socket;
let clientId = 'user_' + Math.random().toString(36).substr(2, 9);
let myServerId;
let activeChats = new Map();
let currentChat = null;

async function initializeChat() {
  
    // Get assigned server
    const response = await fetch('http://localhost:3000/assign-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId })
    });
    
    const { serverId, port } = await response.json();
    myServerId = serverId;
    
    // Display current user
    document.getElementById('currentUser').textContent = `${clientId} (${myServerId})`;

    // Connect to assigned chat server
    socket = io(`http://localhost:${port}`);
    
    socket.emit('register', clientId);
    
    socket.on('message', (data) => {
        displayMessage(data.from, data.message, data.from);
    });
    
    // Load online users
    loadOnlineUsers();
    setInterval(loadOnlineUsers, 10000);
}

async function loadOnlineUsers() {
    try {
        const response = await fetch('http://localhost:3000/online-clients');
        const { clients } = await response.json();
        
        const onlineUsersDiv = document.getElementById('onlineUsers');
        const targetSelect = document.getElementById('targetUser');
        const currentSelection = targetSelect.value;
        
        // Display users with server info
        const otherUsers = clients.filter(c => c.clientId !== clientId);
        if (otherUsers.length === 0) {
            onlineUsersDiv.innerHTML = 'No other users online';
        } else {
            onlineUsersDiv.innerHTML = otherUsers.map(c => 
                `${c.clientId} (${c.serverId})`
            ).join(', ');
        }
        
        // Update select options while preserving selection
        targetSelect.innerHTML = '<option value="">Select user...</option>';
        otherUsers.forEach(client => {
            const option = document.createElement('option');
            option.value = client.clientId;
            option.textContent = `${client.clientId} (${client.serverId})`;
            if (client.clientId === currentSelection) {
                option.selected = true;
            }
            targetSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading online users:', error);
    }
}

function openChatBox() {
    const targetUser = document.getElementById('targetUser').value;
    if (!targetUser) return;
    
    if (!activeChats.has(targetUser)) {
        createChatBox(targetUser);
    }
    switchToChat(targetUser);
}

function createChatBox(userId) {
    // Create tab
    const tabsContainer = document.getElementById('chatTabs');
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.textContent = userId;
    tab.onclick = () => switchToChat(userId);
    tabsContainer.appendChild(tab);
    
    // Create chat box
    const boxesContainer = document.getElementById('chatBoxes');
    const chatBox = document.createElement('div');
    chatBox.className = 'chat-box';
    chatBox.id = `chat-${userId}`;
    chatBox.innerHTML = `<div class="chat-area" id="area-${userId}"></div>`;
    boxesContainer.appendChild(chatBox);
    
    activeChats.set(userId, { tab, chatBox });
}

function switchToChat(userId) {
    // Deactivate all
    activeChats.forEach(chat => {
        chat.tab.classList.remove('active');
        chat.chatBox.classList.remove('active');
    });
    
    // Activate selected
    const chat = activeChats.get(userId);
    chat.tab.classList.add('active');
    chat.chatBox.classList.add('active');
    
    currentChat = userId;
    
    // Enable input
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.querySelector('.send-btn');
    messageInput.disabled = false;
    messageInput.placeholder = `Message ${userId}...`;
    sendBtn.disabled = false;
}

function sendMessage() {
    if (!currentChat) return;
    
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    socket.emit('send-message', {
        from: clientId,
        to: currentChat,
        message: message
    });
    
    displayMessage('You', message, currentChat);
    messageInput.value = '';
}

function displayMessage(from, message, chatUserId) {
    if (!activeChats.has(chatUserId)) {
        createChatBox(chatUserId);
    }
    
    const chatArea = document.getElementById(`area-${chatUserId}`);
    const messageDiv = document.createElement('div');
    messageDiv.innerHTML = `<strong>${from}:</strong> ${message}`;
    chatArea.appendChild(messageDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (socket) {
    socket.disconnect();
  }
});

// Initialize when page loads
initializeChat();
document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');
    const mainContainer = document.getElementById('main-container');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const userGreeting = document.getElementById('user-greeting');
    const songList = document.getElementById('song-list');
    const proposeBtn = document.getElementById('propose-btn');
    const adminPasswordField = document.getElementById('admin-password');

    const addSongModal = document.getElementById('add-song-modal');
    const addSongModalBtn = document.getElementById('add-song-modal-btn');
    const closeBtn = document.querySelector('.close-btn');

    const youtubeModal = document.getElementById('youtube-modal');
    const youtubeCloseBtn = document.getElementById('youtube-close-btn');
    const youtubePlayerContainer = document.getElementById('youtube-player-container');

    const editProfileModal = document.getElementById('edit-profile-modal');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const editProfileCloseBtn = document.getElementById('edit-profile-close-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');

    const userListDiv = document.getElementById('user-list');

    // New elements for structured parts/instruments
    const signupInstrumentsContainer = document.getElementById('signup-instruments-container');
    const signupPositionSelect = document.getElementById('signup-position'); // Changed to select
    const editInstrumentsContainer = document.getElementById('edit-instruments-container');
    const editPositionSelect = document.getElementById('edit-position'); // Changed to select

    const addPartSelect = document.getElementById('add-part-select');
    const addPartBtn = document.getElementById('add-part-btn');
    const selectedPartsDisplay = document.getElementById('selected-parts-display');

    let selectedNeededParts = []; // To store parts for the new song

    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000' 
        : ''; // For production, the base URL is the same as the frontend

    let currentUser = {};

    // --- Predefined Lists with Emojis ---
    const INSTRUMENTS = [
        { name: '보컬(남)', emoji: '🎤' },
        { name: '보컬(여)', emoji: '🎤' },
        { name: '일렉기타(메인)', emoji: '🎸' },
        { name: '일렉기타(백킹)', emoji: '🎸' },
        { name: '어쿠스틱기타', emoji: '🎸' },
        { name: '베이스', emoji: '🎸' },
        { name: '건반', emoji: '🎹' },
        { name: '신시사이저', emoji: '🎹' },
        { name: '드럼', emoji: '🥁' },
        { name: '바이올린', emoji: '🎻' }
    ];

    const POSITIONS = [
        { name: '없음', emoji: '' }, // Default option
        { name: '보컬(남)', emoji: '🎤' },
        { name: '보컬(여)', emoji: '🎤' },
        { name: '일렉기타(메인)', emoji: '🎸' },
        { name: '일렉기타(백킹)', emoji: '🎸' },
        { name: '어쿠스틱기타', emoji: '🎸' },
        { name: '베이스', emoji: '🎸' },
        { name: '건반', emoji: '🎹' },
        { name: '신시사이저', emoji: '🎹' },
        { name: '드럼', emoji: '🥁' },
        { name: '바이올린', emoji: '🎻' },
        { name: '밴드 매니저', emoji: '📋' },
        { name: '사운드 엔지니어', emoji: '🎛️' }
    ];

    // --- Event Listeners ---
    showSignup.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });
    showLogin.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });
    loginBtn.addEventListener('click', handleLogin);
    signupBtn.addEventListener('click', handleSignup);
    logoutBtn.addEventListener('click', handleLogout);
    proposeBtn.addEventListener('click', handleProposeSong);
    songList.addEventListener('click', handleSongInteraction);

    addSongModalBtn.addEventListener('click', () => {
        addSongModal.style.display = 'flex';
        selectedNeededParts = []; // Reset for new song
        renderSelectedParts();
    });
    closeBtn.addEventListener('click', () => { addSongModal.style.display = 'none'; });
    window.addEventListener('click', (e) => {
        if (e.target == addSongModal) {
            addSongModal.style.display = 'none';
        }
    });

    youtubeCloseBtn.addEventListener('click', () => {
        youtubeModal.style.display = 'none';
        youtubePlayerContainer.innerHTML = ''; // Stop the video
    });

    editProfileBtn.addEventListener('click', () => {
        document.getElementById('edit-realName').value = currentUser.realName || '';
        renderCheckboxes(editInstrumentsContainer, INSTRUMENTS, currentUser.instruments);
        renderSelect(editPositionSelect, POSITIONS, currentUser.position[0]); // Pass current position
        editProfileModal.style.display = 'flex';
    });
    editProfileCloseBtn.addEventListener('click', () => { editProfileModal.style.display = 'none'; });
    saveProfileBtn.addEventListener('click', handleSaveProfile);
    window.addEventListener('click', (e) => {
        if (e.target == editProfileModal) {
            editProfileModal.style.display = 'none';
        }
    });

    addPartBtn.addEventListener('click', () => {
        const selectedPartName = addPartSelect.value;
        if (selectedPartName) {
            selectedNeededParts.push(selectedPartName);
            renderSelectedParts();
        }
    });

    selectedPartsDisplay.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-part-btn')) {
            const indexToRemove = e.target.dataset.index;
            selectedNeededParts.splice(indexToRemove, 1);
            renderSelectedParts();
        }
    });

    // Initial rendering of form elements
    renderCheckboxes(signupInstrumentsContainer, INSTRUMENTS);
    renderSelect(signupPositionSelect, POSITIONS);
    renderSelect(addPartSelect, INSTRUMENTS); // Populate add part select

    // Check for saved user info on page load
    const savedUser = localStorage.getItem('band-user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainContent();
    } else {
        showAuthContent();
    }

    // --- Functions ---
    function toggleForms(showLogin) {
        loginForm.style.display = showLogin ? 'block' : 'none';
        signupForm.style.display = showLogin ? 'none' : 'block';
    }

    function showAuthContent() {
        authContainer.style.display = 'block';
        mainContainer.style.display = 'none';
        toggleForms(true); // Default to login form
    }

    function showMainContent() {
        authContainer.style.display = 'none';
        mainContainer.style.display = 'flex'; // Changed to flex for sidebar
        userGreeting.textContent = currentUser.nickname;
        loadSongs();
        loadUsers();
    }

    // Helper to render checkboxes (for signup/edit profile)
    function renderCheckboxes(container, list, selectedItems = []) {
        container.innerHTML = '';
        list.forEach(item => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'checkbox-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `${container.id}-${item.name}`;
            checkbox.value = item.name;
            if (selectedItems.includes(item.name)) {
                checkbox.checked = true;
            }
            const label = document.createElement('label');
            label.htmlFor = `${container.id}-${item.name}`;
            label.innerHTML = `${item.emoji} ${item.name}`;
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            container.appendChild(checkboxDiv);
        });
    }

    // Helper to render select options
    function renderSelect(selectElement, list, selectedValue = '') {
        selectElement.innerHTML = '';
        list.forEach(item => {
            const option = document.createElement('option');
            option.value = item.name;
            option.textContent = `${item.emoji} ${item.name}`.trim();
            if (item.name === selectedValue) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
    }

    function renderSelectedParts() {
        selectedPartsDisplay.innerHTML = selectedNeededParts.map((partName, index) => {
            const part = INSTRUMENTS.find(inst => inst.name === partName) || { name: partName, emoji: '❓' };
            return `
                <span class="selected-part-tag">
                    ${part.emoji} ${part.name}
                    <button class="remove-part-btn" data-index="${index}">&times;</button>
                </span>
            `;
        }).join('');
    }

    function getSelectedCheckboxes(containerId) {
        const container = document.getElementById(containerId);
        const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    function parseStartTime(timeString) {
        if (!timeString) return 0;
        if (timeString.includes(':')) {
            const parts = timeString.split(':').map(Number);
            return (parts[0] * 60) + (parts[1] || 0);
        } 
        return Number(timeString) || 0;
    }

    async function handleLogin() {
        const nickname = document.getElementById('login-nickname').value;
        const password = adminPasswordField.value;
        if (!nickname) return;

        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, password })
        });

        if (response.ok) {
            currentUser = await response.json();
            localStorage.setItem('band-user', JSON.stringify(currentUser));
            showMainContent();
        } else {
            alert(await response.text());
        }
    }

    async function handleSignup() {
        const realName = document.getElementById('signup-realName').value;
        const nickname = document.getElementById('signup-nickname').value;
        const instruments = getSelectedCheckboxes('signup-instruments-container');
        const position = signupPositionSelect.value; // Get single selected value

        if (!realName || !nickname) return;

        const response = await fetch(`${API_BASE_URL}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ realName, nickname, instruments, position: [position] }) // Send as array for consistency
        });

        if (response.ok) {
            currentUser = await response.json();
            localStorage.setItem('band-user', JSON.stringify(currentUser));
            showMainContent();
        } else {
            alert(await response.text());
        }
    }

    async function handleSaveProfile() {
        const realName = document.getElementById('edit-realName').value;
        const instruments = getSelectedCheckboxes('edit-instruments-container');
        const position = editPositionSelect.value; // Get single selected value

        if (!realName) return;

        const response = await fetch(`${API_BASE_URL}/api/profile/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: currentUser.nickname, realName, instruments, position: [position] }) // Send as array for consistency
        });

        if (response.ok) {
            currentUser.realName = realName;
            currentUser.instruments = instruments;
            currentUser.position = [position]; // Update currentUser with array
            localStorage.setItem('band-user', JSON.stringify(currentUser));
            editProfileModal.style.display = 'none';
            loadUsers(); // Refresh user list
        } else {
            alert(await response.text());
        }
    }

    function handleLogout() {
        currentUser = {};
        localStorage.removeItem('band-user');
        showAuthContent();
    }

    async function loadSongs() {
        const response = await fetch(`${API_BASE_URL}/api/songs`);
        const songs = await response.json();
        songList.innerHTML = '';
        songs.forEach(song => {
            const neededPartsHTML = song.neededParts.map(part => {
                const instrument = INSTRUMENTS.find(inst => inst.name === part.name) || { name: part.name, emoji: '❓' };
                const participant = song.participants.find(p => p.partId === part.id);
                const isFilled = !!participant;
                const isCurrentUser = isFilled && participant.name === currentUser.realName;
                const isPlayable = currentUser.instruments && currentUser.instruments.includes(part.name); // Check if current user can play this part

                let className = 'part-needed';
                if (isFilled) className = 'part-filled';
                if (isCurrentUser) className += ' current-user-part';
                if (isPlayable && !isFilled) className += ' part-highlight'; // Highlight if playable and not filled

                const text = isFilled ? `${instrument.emoji} ${instrument.name} (${participant.name})` : `${instrument.emoji} ${instrument.name}`;
                return `<span class="needed-part ${className}" data-part-id="${part.id}" data-song-id="${song.id}">${text}</span>`;
            }).join('');

            const deleteButtonHTML = (currentUser.isAdmin || currentUser.nickname === song.creatorNickname) ? `<button class="delete-song-btn" data-song-id="${song.id}">&#128465;</button>` : '';
            const playButtonHTML = song.youtubeUrl ? `<span class="play-btn" data-url="${song.youtubeUrl}" data-start-time="${song.startTime || 0}">&#9654;&#65039;</span>` : '';

            // Check if all needed parts are filled
            const allPartsFilled = song.neededParts.every(part => 
                song.participants.some(p => p.partId === part.id)
            );

            let completedIconHTML = '';
            let songClass = 'song';
            if (allPartsFilled) {
                songClass += ' song-completed';
                completedIconHTML = ' &#9989;'; // Check mark emoji
            }

            const songElement = document.createElement('div');
            songElement.className = songClass;
            songElement.innerHTML = `
                <h3>${song.title} - ${song.artist} ${completedIconHTML} ${playButtonHTML} ${deleteButtonHTML}</h3>
                <div>Needed: ${neededPartsHTML}</div>
            `;
            songList.appendChild(songElement);
        });
    }

    async function loadUsers() {
        const response = await fetch(`${API_BASE_URL}/api/users`);
        const users = await response.json();
        const userListHtml = users.map(user => {
            const instrumentsHtml = (user.instruments || []).map(instName => {
                const instrument = INSTRUMENTS.find(i => i.name === instName) || { name: instName, emoji: '❓' };
                return `${instrument.emoji} ${instrument.name}`;
            }).join(', ');
            const positionHtml = (user.position && user.position.length > 0) ? 
            (POSITIONS.find(p => p.name === user.position[0]) || { name: user.position[0], emoji: '❓' }).emoji + ' ' + user.position[0] : 'N/A';

            return `
                <div class="user-card">
                    <h4>${user.nickname} (${user.realName})</h4>
                    <p>포지션: ${positionHtml}</p>
                    <br>
                    <p>가능 악기: ${instrumentsHtml || 'N/A'}</p>
                </div>
            `;
        }).join('');
        userListDiv.innerHTML = userListHtml;
    }

    async function handleProposeSong() {
        const title = document.getElementById('song-title').value;
        const artist = document.getElementById('artist').value;
        const youtubeUrl = document.getElementById('youtube-url').value;
        const startTime = parseStartTime(document.getElementById('start-time').value);
        
        if (title && artist && selectedNeededParts.length > 0) {
            await fetch(`${API_BASE_URL}/api/songs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, artist, neededParts: selectedNeededParts, youtubeUrl, startTime, creatorNickname: currentUser.nickname })
            });
            document.getElementById('song-title').value = '';
            document.getElementById('artist').value = '';
            document.getElementById('youtube-url').value = '';
            document.getElementById('start-time').value = '';
            selectedNeededParts = []; // Clear selected parts
            renderSelectedParts();
            addSongModal.style.display = 'none'; // Close modal after proposing
            loadSongs();
        } else {
            alert('모든 칸을 채워주세요. 또한, 최소 한개 이상의 악기를 선택해 주세요.');
        }
    }

    async function handleSongInteraction(e) {
        const target = e.target;
        if (target.classList.contains('needed-part')) {
            const partId = target.dataset.partId;
            const songId = target.dataset.songId;

            await fetch(`${API_BASE_URL}/api/songs/${songId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ realName: currentUser.realName, partId })
            });
            loadSongs();
        } else if (target.classList.contains('delete-song-btn')) {
            const songId = target.dataset.songId;
            if (confirm('곡을 삭제하시겠습니까?')) {
                await fetch(`${API_BASE_URL}/api/songs/${songId}`, { method: 'DELETE' });
                loadSongs();
            }
        } else if (target.classList.contains('play-btn')) {
            const url = target.dataset.url;
            const startTime = target.dataset.startTime;
            const response = await fetch(`${API_BASE_URL}/api/youtube/details?url=${encodeURIComponent(url)}&startTime=${startTime}`);
            if (response.ok) {
                const { embedHtml } = await response.json();
                youtubePlayerContainer.innerHTML = embedHtml;
                youtubeModal.style.display = 'flex';
            } else {
                alert('유튜브 영상을 불러올 수 없습니다.');
            }
        }
    }

    // Show/hide admin password field based on nickname
    document.getElementById('login-nickname').addEventListener('input', (e) => {
        adminPasswordField.style.display = e.target.value.toLowerCase() === 'admin' ? 'block' : 'none';
    });
});
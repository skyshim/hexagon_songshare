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

    const editProfileModal = document.getElementById('edit-profile-modal');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const editProfileCloseBtn = document.getElementById('edit-profile-close-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');

    const userListDiv = document.getElementById('user-list');

    // New elements for structured parts/instruments
    const neededPartsContainer = document.getElementById('needed-parts-container');
    const signupInstrumentsContainer = document.getElementById('signup-instruments-container');
    const signupPositionSelect = document.getElementById('signup-position'); // Changed to select
    const editInstrumentsContainer = document.getElementById('edit-instruments-container');
    const editPositionSelect = document.getElementById('edit-position'); // Changed to select

    let currentUser = {};

    // --- Predefined Lists with Emojis ---
    const INSTRUMENTS = [
        { name: 'Vocal', emoji: '🎤' },
        { name: 'Electric Guitar', emoji: '🎸' },
        { name: 'Acoustic Guitar', emoji: '🎸' },
        { name: 'Bass', emoji: '🎸' },
        { name: 'Piano', emoji: '🎹' },
        { name: 'Synthesizer', emoji: '🎹' },
        { name: 'Drums', emoji: '🥁' },
        { name: 'Violin', emoji: '🎻' }
    ];

    const POSITIONS = [
        { name: 'None', emoji: '' }, // Default option
        { name: 'Vocalist', emoji: '🎤' },
        { name: 'Electric Guitarist', emoji: '🎸' },
        { name: 'Acoustic Guitarist', emoji: '🎸' },
        { name: 'Bassist', emoji: '🎸' },
        { name: 'Pianist', emoji: '🎹' },
        { name: 'Synthesizer Player', emoji: '🎹' },
        { name: 'Drummer', emoji: '🥁' },
        { name: 'Violinist', emoji: '🎻' },
        { name: 'Band Manager', emoji: '📋' },
        { name: 'Sound Engineer', emoji: '🎛️' }
    ];

    // --- Event Listeners ---
    showSignup.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });
    showLogin.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });
    loginBtn.addEventListener('click', handleLogin);
    signupBtn.addEventListener('click', handleSignup);
    logoutBtn.addEventListener('click', handleLogout);
    proposeBtn.addEventListener('click', handleProposeSong);
    songList.addEventListener('click', handleSongInteraction);

    addSongModalBtn.addEventListener('click', () => { addSongModal.style.display = 'flex'; });
    closeBtn.addEventListener('click', () => { addSongModal.style.display = 'none'; });
    window.addEventListener('click', (e) => {
        if (e.target == addSongModal) {
            addSongModal.style.display = 'none';
        }
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

    // Initial rendering of form elements
    renderCheckboxes(neededPartsContainer, INSTRUMENTS);
    renderCheckboxes(signupInstrumentsContainer, INSTRUMENTS);
    renderSelect(signupPositionSelect, POSITIONS); // Render select for signup

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

    // Helper to render checkboxes
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

    function getSelectedCheckboxes(containerId) {
        const container = document.getElementById(containerId);
        const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    async function handleLogin() {
        const nickname = document.getElementById('login-nickname').value;
        const password = adminPasswordField.value;
        if (!nickname) return;

        const response = await fetch('/api/login', {
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

        const response = await fetch('/api/signup', {
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

        const response = await fetch('/api/profile/update', {
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
        const response = await fetch('/api/songs');
        const songs = await response.json();
        songList.innerHTML = '';
        songs.forEach(song => {
            const songElement = document.createElement('div');
            songElement.className = 'song';

            const neededPartsHTML = song.neededParts.map(partName => {
                const part = INSTRUMENTS.find(inst => inst.name === partName) || { name: partName, emoji: '❓' };
                const participant = song.participants.find(p => p.part === part.name);
                const isFilled = !!participant;
                const isCurrentUser = isFilled && participant.name === currentUser.realName;
                const isPlayable = currentUser.instruments && currentUser.instruments.includes(part.name); // Check if current user can play this part

                let className = 'part-needed';
                if (isFilled) className = 'part-filled';
                if (isCurrentUser) className += ' current-user-part';
                if (isPlayable && !isFilled) className += ' part-highlight'; // Highlight if playable and not filled

                const text = isFilled ? `${part.emoji} ${part.name} (${participant.name})` : `${part.emoji} ${part.name}`;
                return `<span class="needed-part ${className}" data-part="${part.name}" data-song-id="${song.id}">${text}</span>`;
            }).join('');

            const deleteButtonHTML = (currentUser.isAdmin || currentUser.nickname === song.creatorNickname) ? `<button class="delete-song-btn" data-song-id="${song.id}">&#128465;</button>` : '';

            // Check if all needed parts are filled
            const allPartsFilled = song.neededParts.every(partName => 
                song.participants.some(p => p.part === partName)
            );

            let completedIconHTML = '';
            if (allPartsFilled) {
                songElement.classList.add('song-completed');
                completedIconHTML = ' &#9989;'; // Check mark emoji
            }

            songElement.innerHTML = `
                <h3>${song.title} - ${song.artist} ${completedIconHTML} ${deleteButtonHTML}</h3>
                <div>Needed: ${neededPartsHTML}</div>
            `;
            songList.appendChild(songElement);
        });
    }

    async function loadUsers() {
        const response = await fetch('/api/users');
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
                    <p>Instruments: ${instrumentsHtml || 'N/A'}</p>
                    <p>Position: ${positionHtml}</p>
                </div>
            `;
        }).join('');
        userListDiv.innerHTML = userListHtml;
    }

    async function handleProposeSong() {
        const title = document.getElementById('song-title').value;
        const artist = document.getElementById('artist').value;
        const neededParts = getSelectedCheckboxes('needed-parts-container');

        if (title && artist && neededParts.length > 0) {
            await fetch('/api/songs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, artist, neededParts, creatorNickname: currentUser.nickname }) // Pass creatorNickname
            });
            document.getElementById('song-title').value = '';
            document.getElementById('artist').value = '';
            // Clear checkboxes
            neededPartsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            addSongModal.style.display = 'none'; // Close modal after proposing
            loadSongs();
        } else {
            alert('Please fill in all fields and select at least one needed part.');
        }
    }

    async function handleSongInteraction(e) {
        const target = e.target;
        if (target.classList.contains('needed-part')) {
            const part = target.dataset.part;
            const songId = target.dataset.songId;

            await fetch(`/api/songs/${songId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ realName: currentUser.realName, part })
            });
            loadSongs();
        } else if (target.classList.contains('delete-song-btn')) {
            const songId = target.dataset.songId;
            if (confirm('Are you sure you want to delete this song?')) {
                await fetch(`/api/songs/${songId}`, { method: 'DELETE' });
                loadSongs();
            }
        }
    }

    // Show/hide admin password field based on nickname
    document.getElementById('login-nickname').addEventListener('input', (e) => {
        adminPasswordField.style.display = e.target.value.toLowerCase() === 'admin' ? 'block' : 'none';
    });
});
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const { google } = require('googleapis');
const app = express();
const port = process.env.PORT || 3000;

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Firebase Admin SDK setup
// OnRender will use environment variables for this
const serviceAccount = process.env.FIREBASE_CREDENTIALS
  ? JSON.parse(process.env.FIREBASE_CREDENTIALS)
  : require('./firebase-credentials.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// YouTube API setup
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

// --- IMPORTANT: Set your admin password here ---
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Use environment variable for admin password

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// User management endpoints
app.post('/api/signup', async (req, res) => {
    const { realName, nickname, instruments, position } = req.body;
    if (!realName || !nickname) {
        return res.status(400).send('Real name and nickname are required.');
    }
    const userRef = db.collection('users').doc(nickname);
    const doc = await userRef.get();
    if (doc.exists) {
        return res.status(400).send('Nickname already taken.');
    }
    await userRef.set({ realName, instruments: instruments || [], position: position || [] });
    res.status(201).json({ nickname, realName, instruments: instruments || [], position: position || [], isAdmin: false });
});

app.post('/api/login', async (req, res) => {
    const { nickname, password } = req.body;
    if (!nickname) {
        return res.status(400).send('Nickname is required.');
    }

    if (nickname.toLowerCase() === 'admin') {
        if (password === ADMIN_PASSWORD) {
            return res.status(200).json({ nickname: 'admin', realName: 'Administrator', instruments: [], position: ['Admin'], isAdmin: true });
        } else {
            return res.status(401).send('Incorrect admin password.');
        }
    }

    const userRef = db.collection('users').doc(nickname);
    const doc = await userRef.get();
    if (!doc.exists) {
        return res.status(404).send('User not found.');
    }
    res.status(200).json({ nickname, realName: doc.data().realName, instruments: doc.data().instruments || [], position: doc.data().position || [], isAdmin: false });
});

// API to get all users
app.get('/api/users', async (req, res) => {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    usersSnapshot.forEach(doc => {
        users.push({ nickname: doc.id, ...doc.data() });
    });
    res.json(users);
});

// API to update user profile
app.post('/api/profile/update', async (req, res) => {
    const { nickname, realName, instruments, position } = req.body;
    if (!nickname || !realName) {
        return res.status(400).send('Nickname and real name are required.');
    }
    const userRef = db.collection('users').doc(nickname);
    await userRef.update({ realName, instruments, position });
    res.status(200).send('Profile updated successfully.');
});


// API to get all songs
app.get('/api/songs', async (req, res) => {
    const songsSnapshot = await db.collection('songs').get();
    const songs = [];
    songsSnapshot.forEach(doc => {
        songs.push({ id: doc.id, ...doc.data() });
    });

    // Calculate seats left and sort
    const completedSongs = [];
    const almostCompletedSongs = [];
    const otherSongs = [];

    songs.forEach(song => {
        const neededParts = song.neededParts || [];
        const participants = song.participants || [];
        if (neededParts.length > 0) {
            song.seatsLeft = neededParts.length - participants.length;
        } else {
            song.seatsLeft = 0;
        }

        if (song.seatsLeft === 0) {
            completedSongs.push(song);
        } else if (song.seatsLeft > 0 && song.seatsLeft <= 2) {
            almostCompletedSongs.push(song);
        } else {
            otherSongs.push(song);
        }
    });

    // Sort completed and almost completed songs by title for consistent ordering within their groups
    completedSongs.sort((a, b) => a.title.localeCompare(b.title));
    almostCompletedSongs.sort((a, b) => a.title.localeCompare(b.title));

    // Concatenate in the desired order: completed, almost completed, then others (maintaining original order for others)
    const sortedSongs = [...completedSongs, ...almostCompletedSongs, ...otherSongs];

    res.json(sortedSongs);
});

// API to add a new song
const crypto = require('crypto');

// API to add a new song
app.post('/api/songs', async (req, res) => {
    const { title, artist, neededParts, youtubeUrl, startTime, creatorNickname } = req.body;
    
    // Assign a unique ID to each needed part
    const partsWithIds = (neededParts || []).map(part => ({
        id: crypto.randomUUID(),
        name: part.name
    }));

    const newSong = {
        title,
        artist,
        neededParts: partsWithIds,
        participants: [],
        youtubeUrl: youtubeUrl || null,
        startTime: startTime || 0,
        creatorNickname: creatorNickname // Save the nickname of the user who proposed the song
    };
    const docRef = await db.collection('songs').add(newSong);
    res.status(201).json({ id: docRef.id, ...newSong });
});



// API to join or leave a song part
app.post('/api/songs/:id/join', async (req, res) => {
    const { realName, partId } = req.body;
    const songRef = db.collection('songs').doc(req.params.id);
    const doc = await songRef.get();

    if (!doc.exists) {
        return res.status(404).send('Song not found.');
    }

    const song = doc.data();
    const targetPart = song.neededParts.find(p => p.id === partId);

    if (!targetPart) {
        return res.status(404).send('Part not found in song.');
    }

    const existingParticipant = song.participants.find(p => p.partId === partId);

    if (existingParticipant && existingParticipant.name === realName) {
        // User is already on this part, so remove them (cancel)
        await songRef.update({
            participants: admin.firestore.FieldValue.arrayRemove(existingParticipant)
        });
        return res.status(200).send('Successfully left the part.');
    } else if (existingParticipant) {
        // Part is taken by someone else
        return res.status(400).send('This part is already taken.');
    }

    // Part is free, so join
    const partName = (typeof targetPart.name === 'object' && targetPart.name !== null) ? targetPart.name.name : targetPart.name;
    await songRef.update({
        participants: admin.firestore.FieldValue.arrayUnion({ name: realName, partId, partName: partName }) // Store partName for display
    });
    res.status(200).send('Successfully joined the part.');
});

// API to update a song
app.put('/api/songs/:id', async (req, res) => {
    const songId = req.params.id;
    const { title, artist, neededParts, youtubeUrl, startTime, currentUserNickname, isAdmin } = req.body;

    const songRef = db.collection('songs').doc(songId);
    const doc = await songRef.get();

    if (!doc.exists) {
        return res.status(404).send('Song not found.');
    }

    const song = doc.data();

    // Authorization check
    if (!isAdmin && song.creatorNickname !== currentUserNickname) {
        return res.status(403).send('You are not authorized to edit this song.');
    }

    // Clean up and assign unique IDs to new needed parts
    const updatedNeededParts = (neededParts || []).map(part => {
        const name = (typeof part.name === 'object' && part.name !== null) ? part.name.name : part.name;
        const id = part.id || crypto.randomUUID();
        return { id, name };
    });

    const updatedSong = {
        title,
        artist,
        neededParts: updatedNeededParts,
        youtubeUrl: youtubeUrl || null,
        startTime: startTime || 0,
        // Preserve creatorNickname
        creatorNickname: song.creatorNickname
    };

    await songRef.update(updatedSong);
    res.status(200).send('Song updated successfully.');
});

// API to delete a song (admin only)
app.delete('/api/songs/:id', async (req, res) => {
    // In a real app, you would verify the user is an admin here
    // For now, we trust the client, but this is not secure.
    await db.collection('songs').doc(req.params.id).delete();
    res.status(200).send('Song deleted successfully.');
});

// YouTube API endpoint
app.get('/api/youtube/details', async (req, res) => {
    if (!process.env.YOUTUBE_API_KEY) {
        return res.status(500).send('YouTube API key is not configured on the server.');
    }

    const { url, startTime = 0 } = req.query;
    let videoId;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.slice(1);
        } else {
            videoId = urlObj.searchParams.get('v');
        }
    } catch (e) {
        return res.status(400).send('Invalid YouTube URL.');
    }

    if (!videoId) {
        return res.status(400).send('Invalid YouTube URL.');
    }

    try {
        const response = await youtube.videos.list({
            part: 'snippet,player',
            id: videoId
        });

        if (response.data.items.length === 0) {
            return res.status(404).send('Video not found.');
        }

        const video = response.data.items[0];
        let embedHtml = video.player.embedHtml;

        // Modify height for audio-only feel
        embedHtml = embedHtml.replace(/height="\d+"/, 'height="110"');

        // Add start time parameter correctly
        const srcMatch = embedHtml.match(/src="([^"]+)"/);
        if (srcMatch && srcMatch[1]) {
            let videoSrc = srcMatch[1];
            const separator = videoSrc.includes('?') ? '&' : '?';
            videoSrc = `${videoSrc}${separator}start=${startTime}`;
            embedHtml = embedHtml.replace(/src="([^"]+)"/, `src="${videoSrc}"`);
        }

        res.json({
            title: video.snippet.title,
            thumbnail: video.snippet.thumbnails.default.url,
            embedHtml: embedHtml
        });
    } catch (error) {
        console.error('Error fetching YouTube video:', error);
        res.status(500).send('Error fetching YouTube video.');
    }
});


// Calendar endpoints
app.get('/api/calendar', async (req, res) => {
    const calendarSnapshot = await db.collection('calendar').get();
    const events = [];
    calendarSnapshot.forEach(doc => {
        events.push({ id: doc.id, ...doc.data() });
    });
    res.json(events);
});

app.post('/api/calendar', async (req, res) => {
    const { title, date, type, songId } = req.body;
    const newEvent = { title, date, type, songId: songId || null };
    const docRef = await db.collection('calendar').add(newEvent);
    res.status(201).json({ id: docRef.id, ...newEvent });
});

app.delete('/api/calendar/:id', async (req, res) => {
    await db.collection('calendar').doc(req.params.id).delete();
    res.status(200).send('Event deleted successfully.');
});


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

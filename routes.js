const express = require('express');
const router = express.Router();
const spotify = require('./utils/spotify');
const llm = require('./utils/llm');
const YTMusic = require("ytmusic-api")
require('dotenv').config();

router.get('/login', (req, res) => {
    const authUrl = spotify.getAuthUrl();
    res.redirect(authUrl);
})

router.get('/callback', async (req, res) => {
    const code = req.query.code;
    const { access_token, refresh_token, expires_in } = await spotify.getAccessToken(code);
    //return res.json({ access_token, refresh_token, expires_in });
    res.redirect(process.env.CLIENT_DOMAIN + '/callback?access_token=' + access_token + '&refresh_token=' + refresh_token + '&expires_in=' + expires_in);
});


router.get('/music/:query', async (req, res) => {

    const query = req.params.query;

const ytmusic = new YTMusic()
await ytmusic.initialize(/* Optional: Custom cookies */)

    const results = await ytmusic.searchSongs(query)
    res.send({
        results
    });
});

router.post('/generate-playlist', async (req, res) => {
    try {
        const mood = req.body.mood;
        const artist = req.body.artist;
        const accessToken = req.body.accessToken;
        if (mood) {
            const response = await llm.generatePrompt(mood);
            const songTypes = llm.extractSongTypes(response);
            const playlist = await spotify.createPlaylist(songTypes, accessToken);
            res.json({ playlist: playlist.trackUris, songTypes: playlist.songTypes });
        }
        else if (artist) {
            const response = await llm.generateArtistPlaylistPrompt(artist);
            const songNames = llm.extractSongNames(response);
            const playlist = await spotify.createPlaylistBySongNames(songNames, accessToken);
            res.json({ playlist: playlist.trackUris, songNames: playlist.songNames });
        }

    } catch (error) {
        console.error(error);
        if(error.statusCode === 401) {
            res.status(401).json({ error: 'Invalid access token 401', status: 401 });
        } else {
            res.status(500).json({ error: 'An error occurred', details: error.message });
        }
    }
});

router.get('/health', (req, res) => {
    res.status(200).json({ message: 'Server is running' });
});

router.get('/prompt-test', async (req, res) => {
    try {
        const mood = req.query.mood;
        const response = await llm.generatePrompt(mood);
        const playlistLines = response.split('\n');
        const songs = playlistLines.map(line => line.trim());
        const regex = /^\d+\./;
        const filteredSongs = songs.filter(song => regex.test(song))


        res.json({ prompt: response, songs, filteredSongs });;
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred', details: error.message });
    }
});

router.get('/prompt-artist-test', async (req, res) => {
    try {
        const artist = req.query.artist;
        const response = await llm.generateArtistPlaylistPrompt(artist);
        const playlistLines = response.content.split('\n');
        const songs = playlistLines.map(line => line.trim());
        const regex = /^\d+\./;
        const filteredSongs = songs.filter(song => regex.test(song)).map(song => song.replace(/\d+\./, response.artistName));


        res.json({ prompt: response.content, songs, filteredSongs });;
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred', details: error.message });
    }
});

router.post('/playlist/save', async (req, res) => {
    try {
        const songTypes = req.body.songTypes;
        const accessToken = req.body.accessToken;
        const trackUris = req.body.trackUris;
        await spotify.savePlaylist(songTypes, trackUris, accessToken)
        res.json({ success: true, message: 'Playlist saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred', details: error.message });
    }
});

router.get('/:refreshToken/refresh', async (req, res) => {
    try {
        const refreshToken = req.params.refreshToken;
        const accessToken = await spotify.refreshAccessToken(refreshToken);
        res.json({ accessToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

router.get('/:accessToken/top5', async (req, res) => {
    try {
        const topTracks = await spotify.top5(req.params.accessToken);
        res.json(topTracks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

module.exports = router;
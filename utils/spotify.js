const dotenv = require('dotenv').config();
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
});

module.exports = {
    refreshAccessToken: async (refreshToken) => {
        try {
            spotifyApi.setRefreshToken(refreshToken);
            const response = await spotifyApi.refreshAccessToken();
            const { access_token, expires_in } = response.body;
            return { access_token, expires_in };
        } catch (error) {
            console.error('Error refreshing access token:', error);
            throw error;
        }
    },
    top5: async (accessToken) => {
        try {
            spotifyApi.setAccessToken(accessToken);

            // Get the user's top tracks
            const topTracks = await spotifyApi.getMyTopTracks({ limit: 5 });

            return topTracks.body.items.map((track) => ({
                name: track.name,
                artist: track.artists[0].name,
                album: track.album.name,
                image: track.album.images[0].url,
                previewUrl: track.preview_url,
            }));
        } catch (error) {
            // Handle errors, including token expiration
            if (error.message.includes('Invalid access token')) {
                // Refresh the access token
                const refreshedToken = await spotifyApi.refreshAccessToken();
                accessToken = refreshedToken.body.access_token;

                // Retry with the refreshed token
                return top5(accessToken);
            }

            console.error('Error getting top tracks:', error);
            throw error;
        }
    },
    createPlaylist: async (songTypes, accessToken) => {
        try {
            spotifyApi.setAccessToken(accessToken);
            const trackUris = [];
            for (const songType of songTypes) {
                const searchResult = await spotifyApi.search(songType, ['track'], { limit: 1 });
                if (searchResult.body.tracks.items.length > 0) {
                    trackUris.push(...searchResult.body.tracks.items);
                }
            }

            return {trackUris, songTypes};
        } catch (error) {
            // Handle errors, including token expiration
            throw error
        }
    },
    savePlaylist: async (songTypes, trackUris, accessToken) => {
        try {
            spotifyApi.setAccessToken(accessToken);
            const user = await spotifyApi.getUser();
            const userId = user.body.id;
            const createPlaylistResponse = await spotifyApi.createPlaylist(userId, {
                name: `Mood-Based Playlist: ${songTypes.join(', ')}`,
                public: false,
                description: 'Generated based on your mood preferences.'
            });
            const playlistId = createPlaylistResponse.body.id;
            
            // Add tracks in chunks
            const chunkSize = 100; // Spotify allows up to 100 tracks per request
            for (let i = 0; i < trackUris.length; i += chunkSize) {
                const chunk = trackUris.slice(i, i + chunkSize);
                await spotifyApi.addTracksToPlaylist(playlistId, chunk);
            }
            
            return { success: true, playlistId: playlistId };
        } catch (error) {
            throw error
        }
    },
    search: async (query, accessToken) => {
        try {
            spotifyApi.setAccessToken(accessToken);
            const searchResult = await spotifyApi.search(query, ['track'], { limit: 30 });

            return searchResult;
        } catch (error) {
            // Handle errors, including token expiration
            throw error
        }
    }

};
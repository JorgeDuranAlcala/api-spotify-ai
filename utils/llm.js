const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

module.exports = {
    extractSongTypes(prompt) {
          const playlistLines = prompt.split('\n');
          const songs = playlistLines.map(line => line.trim());
          const regex = /^\d+\./;
          const filteredSongs = songs.filter(song => regex.test(song));

        return filteredSongs;
      },
      generatePrompt: async (mood) => {
        const completion = await groq.chat.completions.create({
            messages: [
              {
                role: "user",
                content: `Create a playlist of 50 songs for the following theme: "${mood}". Aim for a mix of classic hits and current favorites and also include a mix of genres and artist.`,
              },
            ],
            model: "llama3-8b-8192",
        });
        return completion.choices[0].message.content;
      }
}
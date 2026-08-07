const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const OAuth2 = google.auth.OAuth2;

const client_id = process.env.YOUTUBE_CLIENT_ID;
const client_secret = process.env.YOUTUBE_CLIENT_SECRET;
const refresh_token = process.env.YOUTUBE_REFRESH_TOKEN;

const title = process.env.VIDEO_TITLE || 'Zoom Recording Upload';
const description = process.env.VIDEO_DESCRIPTION || 'Uploaded automatically via GitHub Actions';
const privacyStatus = process.env.VIDEO_VISIBILITY || 'unlisted';

const oauth2Client = new OAuth2(client_id, client_secret, 'https://developers.google.com/oauthplayground');
oauth2Client.setCredentials({ refresh_token: refresh_token });

const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

function findMp4File(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.mp4')) {
      return path.join(dir, file);
    }
  }
  return null;
}

async function uploadVideo() {
  const videoPath = findMp4File(process.cwd());
  
  if (!videoPath) {
    console.error('❌ No .mp4 file found in the working directory!');
    process.exit(1);
  }

  console.log(`📹 Found file to upload: ${videoPath}`);
  console.log(`📤 Uploading to YouTube with title: "${title}" (${privacyStatus})...`);

  try {
    const res = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: title,
          description: description,
        },
        status: {
          privacyStatus: privacyStatus, // 'public', 'private', or 'unlisted'
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });

    console.log(`✅ Upload complete! Video ID: ${res.data.id}`);
    console.log(`🔗 Watch URL: https://youtu.be/${res.data.id}`);
  } catch (error) {
    console.error('❌ Error uploading video:', error);
    process.exit(1);
  }
}

uploadVideo();

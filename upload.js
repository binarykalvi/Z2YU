const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const OAuth2 = google.auth.OAuth2;

const client_id = process.env.YOUTUBE_CLIENT_ID;
const client_secret = process.env.YOUTUBE_CLIENT_SECRET;
const refresh_token = process.env.YOUTUBE_REFRESH_TOKEN;

const baseTitle = process.env.VIDEO_TITLE || 'Z R';
const description = process.env.VIDEO_DESCRIPTION || 'Z2Y';
const privacyStatus = process.env.VIDEO_VISIBILITY || 'unlisted';

const oauth2Client = new OAuth2(client_id, client_secret, 'https://developers.google.com/oauthplayground');
oauth2Client.setCredentials({ refresh_token: refresh_token });

const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

function getAllMp4Files(dir, fileList = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory() && item.name !== 'node_modules' && !item.name.startsWith('.')) {
      getAllMp4Files(fullPath, fileList);
    } else if (item.isFile() && item.name.toLowerCase().endsWith('.mp4')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function filterHighestQualityVideos(allFiles) {
  // Always upload directly if there is only 1 file
  if (allFiles.length === 1) {
    return allFiles;
  }

  const grouped = {};

  for (const filePath of allFiles) {
    const fileName = path.basename(filePath);
    if (fileName.includes('_avo_')) continue;

    const match = fileName.match(/GMT\d+-\d+/);
    const key = match ? match[0] : filePath;

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(filePath);
  }

  const selectedFiles = [];

  for (const key in grouped) {
    const group = grouped[key];
    let best = group.find(f => f.endsWith('1280x720.mp4') && !f.includes('_as_'));

    if (!best) {
      best = group.find(f => f.includes('1280x720.mp4'));
    }

    if (!best) {
      best = group.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
    }

    if (best) {
      selectedFiles.push(best);
    }
  }

  if (selectedFiles.length === 0 && allFiles.length > 0) {
    return allFiles;
  }

  return selectedFiles.sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

async function uploadSingleVideo(videoPath, videoTitle) {
  console.log(`[R] File: ${path.basename(videoPath)}`);
  console.log(`[U] Starting: "${videoTitle}" (${privacyStatus})`);

  try {
    const res = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: videoTitle,
          description: description,
        },
        status: {
          privacyStatus: privacyStatus,
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });

    console.log(`[Y] Success ID: ${res.data.id}`);
    console.log(`[Y] URL: https://youtu.be/${res.data.id}`);

    fs.unlinkSync(videoPath);
    console.log(`[DEL] Cleaned: ${path.basename(videoPath)}`);

  } catch (error) {
    console.error(`[ERR] Failed: ${path.basename(videoPath)}`, error);
    process.exit(1);
  }
}

async function main() {
  const allFiles = getAllMp4Files(process.cwd());

  if (allFiles.length === 0) {
    console.error('[ERR] No MP4 files found.');
    process.exit(1);
  }

  const filesToUpload = filterHighestQualityVideos(allFiles);

  console.log(`[Z2Y] ${filesToUpload.length} clip(s) ready`);

  for (let i = 0; i < filesToUpload.length; i++) {
    const file = filesToUpload[i];
    const finalTitle = filesToUpload.length > 1 
      ? `${baseTitle} (Part ${i + 1}/${filesToUpload.length})` 
      : baseTitle;

    await uploadSingleVideo(file, finalTitle);
  }

  const remainingFiles = getAllMp4Files(process.cwd());
  for (const remaining of remainingFiles) {
    if (fs.existsSync(remaining)) {
      fs.unlinkSync(remaining);
      console.log(`[DEL] Cleaned aux: ${path.basename(remaining)}`);
    }
  }

  console.log('[Z2Y] Done.');
}

main();

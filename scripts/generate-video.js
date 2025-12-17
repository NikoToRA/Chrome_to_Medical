/**
 * usage:
 *   export GOOGLE_CLOUD_PROJECT="your-project-id"
 *   export GOOGLE_ACCESS_TOKEN="$(gcloud auth print-access-token)"  <-- Required for Vertex AI currently
 *   # OR if using AI Studio (when available publicy via key):
 *   # export GEMINI_API_KEY="your-key" 
 *
 *   node scripts/generate-video.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const LOCATION = 'us-central1'; // Veo is often in us-central1
const ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN;
const API_KEY = process.env.GEMINI_API_KEY;

// URLs
// Vertex AI Endpoint for Veo
const VERTEX_API_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/veo-001-preview:predict`;

// IO Paths
const IMAGE_DIR = path.join(__dirname, '../landing-page-new/public/images/usage');
const OUTPUT_DIR = IMAGE_DIR;

const TARGETS = [
    {
        input: 'usage-template.png',
        output: 'usage-template.mp4',
        prompt: 'A smooth screen recording video of a medical software interface. The cursor clicks on a template button, and text instantly appears in the text area. Professional, high resolution, clear text.'
    },
    {
        input: 'usage-agent.png',
        output: 'usage-agent.mp4',
        prompt: 'A smooth screen recording video of a medical software interface. A chat window is open, the user types "Referral letter please", and the AI agent automatically types out a detailed letter. Professional, high resolution.'
    }
];

if (!PROJECT_ID && !ACCESS_TOKEN && !API_KEY) {
    console.error('Error: Please set GOOGLE_CLOUD_PROJECT and GOOGLE_ACCESS_TOKEN (for Vertex AI) or GEMINI_API_KEY.');
    console.error('Example: export GOOGLE_ACCESS_TOKEN=$(gcloud auth print-access-token)');
    process.exit(1);
}

async function main() {
    console.log('Starting video generation...');

    for (const target of TARGETS) {
        const inputPath = path.join(IMAGE_DIR, target.input);
        const outputPath = path.join(OUTPUT_DIR, target.output);

        if (!fs.existsSync(inputPath)) {
            console.warn(`[SKIP] Input image not found: ${inputPath}`);
            continue;
        }

        console.log(`Processing: ${target.input} -> ${target.output}`);

        try {
            await generateVideo(inputPath, outputPath, target.prompt);
        } catch (e) {
            console.error(`[ERROR] Failed to generate ${target.output}:`, e.message);
            if (e.response) console.error(e.response);
        }
    }
}

async function generateVideo(inputPath, outputPath, prompt) {
    const imageBase64 = fs.readFileSync(inputPath).toString('base64');

    // Construct Payload for Veo (Vertex AI Request Format)
    // Note: The actual schema for Veo might vary as it is in preview.
    // This uses a common structure for image-to-video.
    const requestBody = {
        instances: [
            {
                image: {
                    bytesBase64Encoded: imageBase64
                },
                prompt: prompt
            }
        ],
        parameters: {
            sampleCount: 1,
            videoLength: '5s', // or 8s depending on model support
            aspectRatio: '16:9'
        }
    };

    const headers = {
        'Content-Type': 'application/json'
    };

    if (ACCESS_TOKEN) {
        headers['Authorization'] = `Bearer ${ACCESS_TOKEN}`;
    } else if (API_KEY) {
        // AI Studio fallback (if endpoint supports it)
        // headers['x-goog-api-key'] = API_KEY; 
        console.warn('Warning: Using API Key with Vertex endpoint might not work without specific setup. Prefer Access Token for Vertex.');
    }

    console.log('Sending request to API...');

    // Note: Fetch is available in Node 18+. If older, use https module or install node-fetch.
    // Assuming Node 18+ for this environment.
    const response = await fetch(VERTEX_API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`API Request Failed: ${response.status} ${response.statusText} - ${txt}`);
    }

    const data = await response.json();

    // Check if response contains predictions immediately or if it's LRO (Long Running Operation)
    // Veo often returns LRO.

    if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
        // Direct response
        const videoBuffer = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
        fs.writeFileSync(outputPath, videoBuffer);
        console.log(`Saved video to ${outputPath}`);
    } else {
        // LRO handling or different schema
        console.log('Response received (structure might vary):', JSON.stringify(data).substring(0, 200) + '...');

        // If it's just a raw prediction list
        if (data.predictions && data.predictions[0] && data.predictions[0].video) {
            const videoBuffer = Buffer.from(data.predictions[0].video.bytesBase64Encoded, 'base64');
            fs.writeFileSync(outputPath, videoBuffer);
            console.log(`Saved video to ${outputPath}`);
        } else {
            console.log('Video data not found in standard location. Please check API documentation for Veo preview.');
        }
    }
}

main();

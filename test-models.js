// diagnose.js
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

console.log('=== API Key Check ===');
console.log('API Key exists:', !!API_KEY);
console.log('API Key starts with AIza:', API_KEY?.startsWith('AIza'));
console.log('API Key length:', API_KEY?.length);
console.log('First 10 chars:', API_KEY?.substring(0, 10));

if (!API_KEY || !API_KEY.startsWith('AIza')) {
  console.log('\n❌ Your API key seems invalid!');
  console.log('It should start with "AIzaSy" and be 39 characters long');
  console.log('\n📝 Get a new key from: https://aistudio.google.com/app/apikey');
  process.exit(1);
}

console.log('\n=== Testing API directly ===');

// Use fetch (Node 18+) or manual HTTPS request
async function testAPI() {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  
  try {
    // Test 1: List models
    console.log('\n1. Fetching available models...');
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    
    if (!listResponse.ok) {
      const error = await listResponse.text();
      console.error('❌ API Key rejected:', error);
      console.log('\n🔑 Your API key might be:');
      console.log('  - Expired or invalid');
      console.log('  - Missing permissions');
      console.log('  - Needs to be regenerated');
      console.log('\n📝 Create a new one: https://aistudio.google.com/app/apikey');
      return;
    }

    const models = await listResponse.json();
    console.log('✅ API Key works!\n');
    
    console.log('Available models that support generateContent:');
    const workingModels = models.models.filter(m => 
      m.supportedGenerationMethods?.includes('generateContent')
    );
    
    workingModels.forEach(model => {
      console.log(`  ✓ ${model.name.replace('models/', '')}`);
    });

    if (workingModels.length === 0) {
      console.log('❌ No models found! Your API key may not have access.');
      return;
    }

    // Test 2: Try generating content
    const testModel = workingModels[0].name;
    console.log(`\n2. Testing generation with ${testModel}...`);
    
    const genResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${testModel}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say hi' }] }]
        })
      }
    );

    if (genResponse.ok) {
      const result = await genResponse.json();
      console.log('✅ Generation works!');
      console.log('Response:', result.candidates[0].content.parts[0].text);
      
      const modelToUse = testModel.replace('models/', '');
      console.log(`\n🎉 SUCCESS! Use this model name: "${modelToUse}"`);
      console.log(`\nUpdate line 13 in bot.js to:`);
      console.log(`const model = genAI.getGenerativeModel({ model: "${modelToUse}" });`);
    } else {
      console.log('❌ Generation failed:', await genResponse.text());
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
    
    if (error.message.includes('node-fetch')) {
      console.log('\nInstalling node-fetch...');
      require('child_process').execSync('npm install node-fetch@2', {stdio: 'inherit'});
      console.log('\nRun this script again: node diagnose.js');
    }
  }
}

testAPI();
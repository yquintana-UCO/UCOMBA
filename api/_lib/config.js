// The Claude API key is stored in an environment variable named after UCOMBA
// (Vercel → Project → Settings → Environment Variables). Never hard-code it.
const KEY_NAMES = ["UCOMBA", "UCOMBA_API_KEY", "UCO_MBA_API_KEY", "UCO_MBA"];

function getApiKey(env = process.env) {
  const name = KEY_NAMES.find(n => env[n]);
  return name ? { name, value: env[name] } : null;
}

module.exports = { KEY_NAMES, getApiKey };

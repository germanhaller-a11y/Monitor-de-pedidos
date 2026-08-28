// netlify/functions/jsonbin-proxy.js
//
// Proxy serverless hacia JSONBin.io: el navegador nunca ve la API key.
// Recibe { op: 'get'|'put'|'create', binId?, data? } (vía POST) y reenvía a
// https://api.jsonbin.io/v3/b agregando X-Access-Key desde la variable de
// entorno JSONBIN_ACCESS_KEY configurada en Netlify
// (Site configuration > Environment variables).

const JSONBIN_BASE = 'https://api.jsonbin.io/v3/b';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const accessKey = process.env.JSONBIN_ACCESS_KEY;
  if (!accessKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Falta configurar JSONBIN_ACCESS_KEY en Netlify (Site configuration > Environment variables).'
      })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido (no es JSON)' }) };
  }

  const { op, binId, data } = payload;

  try {
    let url, method, body;
    const headers = {
      'Content-Type': 'application/json',
      'X-Access-Key': accessKey
    };

    if (op === 'get') {
      if (!binId) return { statusCode: 400, body: JSON.stringify({ error: 'Falta binId' }) };
      url = `${JSONBIN_BASE}/${binId}/latest`;
      method = 'GET';
    } else if (op === 'put') {
      if (!binId) return { statusCode: 400, body: JSON.stringify({ error: 'Falta binId' }) };
      url = `${JSONBIN_BASE}/${binId}`;
      method = 'PUT';
      body = JSON.stringify(data ?? {});
    } else if (op === 'create') {
      url = JSONBIN_BASE;
      method = 'POST';
      body = JSON.stringify(data ?? {});
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: `op inválida: ${op}` }) };
    }

    const res = await fetch(url, { method, headers, body });
    const text = await res.text();

    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: text
    };
  } catch (err) {
    console.error('[jsonbin-proxy] Error:', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'No se pudo contactar a JSONBin', detail: err.message })
    };
  }
};

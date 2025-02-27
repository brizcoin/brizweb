const fetch = require('node-fetch');

exports.handler = async function (event, context) {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`CoinGecko API failed: ${text}`);
        }
        const data = await response.json();
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        console.error('CoinGecko Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message })
        };
    }
};
const fetch = require('node-fetch');

exports.handler = async function (event, context) {
    console.log('Fetching CoinGecko prices...');
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
        console.log('CoinGecko response status:', response.status);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`CoinGecko API failed: ${text} (Status: ${response.status})`);
        }
        const data = await response.json();
        console.log('CoinGecko data:', JSON.stringify(data, null, 2));
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
const fetch = require('node-fetch');

const BIRDEYE_API_KEY = '13a2dc6384e64bd6bc686a62de399735'; // Replace with your real key

exports.handler = async function (event, context) {
    try {
        const response = await fetch(
            'https://public-api.birdeye.so/v1/defi/volume?platform=pump_fun&interval=24h',
            {
                headers: {
                    'X-API-KEY': BIRDEYE_API_KEY,
                    'Accept': 'application/json'
                }
            }
        );
        if (!response.ok) {
            const errorText = await response.text();
            return {
                statusCode: response.status,
                body: JSON.stringify({ message: `Birdeye API failed: ${errorText}` })
            };
        }
        const data = await response.json();
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message })
        };
    }
};
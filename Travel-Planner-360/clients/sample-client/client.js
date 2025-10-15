const axios = require('axios');

// Core Configuration 
const API_VERSION = process.env.API_VERSION || 1; 
const BASE_URL = 'http://localhost:3000'; 
const ENDPOINT = `/v${API_VERSION}/trips/search`;

const FULL_URL = `${BASE_URL}${ENDPOINT}`; // Base URL without query params

async function searchTrips(from, to, date) {
    console.log(`\n--- Running Client Test ---`);
    console.log(`API Version: v${API_VERSION}`);
    console.log(`Targeting URL: ${FULL_URL}`);
   
    
    try {
        const response = await axios.get(FULL_URL, {
            
            params: {
                from: from, 
                to: to,
                date: date
            },
        });

        const data = response.data;
        
        console.log(`Status: ${response.status} OK`);
        console.log(`\nRESPONSE DATA KEYS (V${API_VERSION}):`, Object.keys(data));
        console.log(`Response Data Sample:`, JSON.stringify(data, null, 2));
        
        // Compatibility and Degradation Check
        if (API_VERSION == 2) {
            if (data.weather && data.weather.forecast) {
                console.log('V2 SUCCESS: Weather data received (Expanded contract verified).');
            } else if (data.degraded) {
                console.warn('V2 WARNING: Weather data degraded/fallback served. Core data (flights/hotels) is safe.');
            }
        } else {
             if (!data.weather) {
                console.log('V1 SUCCESS: Weather field correctly omitted (Legacy contract verified).');
            } else {
                console.error('V1 FAILURE: Legacy contract was broken (V1 returned weather data).');
            }
        }
        
    } catch (error) {
        // If the service is down entirely or the network fails
        console.error(`\n ERROR calling v${API_VERSION}:`, error.message);
        if (error.response) {
             console.error(`HTTP Status: ${error.response.status}`);
        }
    }
}

// Execution
searchTrips("CMB", "BKK", "2025-12-15")
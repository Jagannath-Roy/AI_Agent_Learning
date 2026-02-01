import { GoogleGenAI, Type } from "@google/genai";
import readlineSync from 'readline-sync';
import 'dotenv/config';
import { log } from "console";
import { deserialize } from "v8";

// Configure the client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const History = [];


//addition of two numbers function
function sum({ num1, num2 }) {
    return num1 + num2;
}

//prime number check function
function prime({ num }) {

    if (num < 2)
        return false;

    for (let i = 2; i <= Math.sqrt(num); i++)
        if (num % i == 0) return false

    return true;
}

//function for fetching weather details of the input location
async function checkWeather({ location }) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&units=metric&appid=${process.env.WEATHER_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    return data;

}

const sumDeclaration = {

    name: 'sum',
    description: "Get the sum of two numbers",
    parameters: {
        type: 'OBJECT',
        properties: {
            num1: {
                type: 'NUMBER',
                description: 'This the first number for addition. Ex - 10'
            },
            num2: {
                type: 'NUMBER',
                description: 'This the second number for addition. Ex - 20'
            }

        },
        required: ['num1', 'num2']
    }
}


const primeDeclaration = {

    name: 'prime',
    description: "Check if the number is prime or not",
    parameters: {
        type: 'OBJECT',
        properties: {
            num: {
                type: 'NUMBER',
                description: 'This the  number to be checked if it is a prime or not. Ex - 10'
            },
        },
        required: ['num']
    }
}


const checkWeatherDeclaration = {

    name: 'checkWeather',
    description: "Fetch the weather of the input location",
    parameters: {
        type: 'OBJECT',
        properties: {
            location: {
                type: 'STRING',
                description: 'Get the weather details of the location'
            },
        },
        required: ['location']
    }
}

const availableTools = {

    sum: sum,
    prime: prime,
    checkWeather: checkWeather,
};





async function aiAgent(userPrompt) {

    History.push(
        {
            role: 'user',
            parts: [{ text: userPrompt }]
        }

    )

    while (true) {
        const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: History,
            config: {
                tools: [{
                    functionDeclarations: [sumDeclaration, primeDeclaration, checkWeatherDeclaration]
                }],
                thinkingConfig: {
                    includeThoughts: true
                }
            },
        });

        if (result.functionCalls && result.functionCalls.length > 0) {

            const modelParts = [];
            const functionResponseParts = [];

            for (const call of result.functionCalls) {
                const { name, args } = call;

                const funCall = availableTools[name];
                const fnResult = await funCall(args);

                modelParts.push({
                    functionCall: {
                        name: call.name,
                        args: call.args,
                        thought_signature: call.thought_signature
                    }
                });



                functionResponseParts.push({
                    functionResponse: {
                        name: name,
                        response: { result: fnResult }
                    }

                })


            }

            History.push({

                role: 'model',
                parts: modelParts,
            });

            History.push({

                role: 'user',
                parts: functionResponseParts,
            });
        }

        else {
            History.push({
                role: 'model',
                parts: [{ text: result.text }]
            })
            console.log(result.text);
            break;
        }

    }
}







async function main() {

    const userPrompt = readlineSync.question("What's your query? --> ")
    await aiAgent(userPrompt);
    main()


}

main();
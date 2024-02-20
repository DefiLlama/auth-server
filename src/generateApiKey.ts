import { randomBytes } from "crypto";
import ddb, { authPK } from "./utils/ddb";
import { errorResponse, successResponse } from "./utils/lambda-response";
import { isSubscribed } from "./utils/subscriptions";


export async function generateApiKey(address:string){
    // This system is vulnerable to race conditions to generate multiple api keys but thats not a big issue since we'll detect it anyway
    // and theres no point in getting multiple api keys
    const addresKeyPK = `addressKey#${address.toLowerCase()}`
    const prevApiKey = await ddb.get({
        PK: addresKeyPK,
    })
    const now = (Date.now() / 1000).toFixed(0)
    if (prevApiKey.Item) {
        await ddb.delete({
            Key: {
                PK: authPK(prevApiKey.Item.apiKey),
            }
        })
    }
    const apiKey = randomBytes(40).toString("base64url")
    await ddb.put({
        PK: authPK(apiKey),
        address: address.toLowerCase(),
        date: now
    })
    await ddb.put({
        PK: addresKeyPK,
        apiKey,
        date: now
    })
    return apiKey
}

const handler = async (event: AWSLambda.APIGatewayEvent) => {
    const signedIn= await ddb.get({
        PK: `login#${event.headers.Authorization}`
    })
    if(!signedIn.Item){
        return errorResponse({ message: "bad signature" })
    }
    const address = signedIn.Item.address.toLowerCase()
    const subscribed = await isSubscribed(address)
    if (!subscribed) {
        return errorResponse({ message: "address is not subscribed" })
    }
    const apiKey = await generateApiKey(address)
    
    return successResponse({apiKey})
}

export default handler
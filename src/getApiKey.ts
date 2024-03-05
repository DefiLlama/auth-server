import ddb from "./utils/ddb"
import { errorResponse, successResponse } from "./utils/lambda-response"

const handler = async (event: AWSLambda.APIGatewayEvent) => {
    const signedIn= await ddb.get({
        PK: `login#${event.headers.Authorization}`
    })
    if(!signedIn.Item){
        return errorResponse({ message: "bad signature" })
    }
    const address = signedIn.Item.address.toLowerCase()
    const apikeyItem = await ddb.get({
        PK: `addressKey#${address}`
    })
    const emailItem = await ddb.get({
        PK: `email#${address}`
    })
    const apiKey = apikeyItem.Item?.apiKey ?? null
    const email = emailItem.Item?.email ?? null
    
    return successResponse({apiKey, email})
}

export default handler
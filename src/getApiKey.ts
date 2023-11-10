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
    const apiKey = apikeyItem.Item?.apiKey ?? null
    
    return successResponse({apiKey})
}

export default handler
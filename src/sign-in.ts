import { verifyMessage } from "ethers"
import { randomBytes } from "crypto";
import ddb from "./utils/ddb";
import { isSubscribed } from "./utils/subscriptions";
import { errorResponse, successResponse } from "./utils/lambda-response";
import { FRONTEND_DOMAIN } from "./utils/constants";

const CHAIN_ID = "10"

function getValue(raw: string) {
    return raw.substring(raw.indexOf(": ") + 2)
}

function verifySig(message: string, signature: string) {
    /*
    ${domain} wants you to sign in with your Ethereum account:
    ${address}
    
    ${statement}
    
    URI: ${uri}
    Version: ${version}
    Chain ID: ${chain-id}
    Nonce: ${nonce}
    Issued At: ${issued-at}
    */
    const [
        domainStatement,
        address,
        ,
        statement,
        ,
        uri,
        version,
        chainId,
        nonce,
        issuedAt
    ] = message.split("\n")
    if (domainStatement !== `${FRONTEND_DOMAIN} wants you to sign in with your Ethereum account:`
        || statement !== `Sign in to ${FRONTEND_DOMAIN} to get API Key`
        //|| !getValue(uri).startsWith(`https://${FRONTEND_DOMAIN}`)
        || getValue(version) !== "1"
        || getValue(chainId) !== CHAIN_ID
        || new Date(getValue(issuedAt)).getTime() < (Date.now() - 3 * 3600e3) // not older than 3 hours
        || address !== verifyMessage(message, signature)
    ) {
        return false
    }
    return true
}

const handler = async (event: AWSLambda.APIGatewayEvent) => {
    const {message, signature} = JSON.parse(event.body!)
    const address = message.split("\n")[1].toLowerCase()
    const subscribed = await isSubscribed(address)
    if (!subscribed) {
        return errorResponse({ message: "address is not subscribed" })
    }
    if(!verifySig(message, signature)){
        return errorResponse({ message: "bad signature" })
    }
    const key = randomBytes(40).toString("base64url")
    await ddb.put({
        PK: `login#${key}`,
        time: Date.now(),
        address
    })
    return successResponse({key})
}

export default handler
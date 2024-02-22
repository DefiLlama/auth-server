import { verifyMessage } from "ethers";
import { randomBytes } from "crypto";
import ddb from "./utils/ddb";
import { isSubscribed } from "./utils/subscriptions";
import { errorResponse, successResponse } from "./utils/lambda-response";

const CHAIN_ID = "10"

function getValue(raw: string) {
  return raw.substring(raw.indexOf(": ") + 2)
}

function verifySig(message: string, signature: string, requestHost: string): [boolean, string[]] {
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
    issuedAt,
  ] = message.split("\n");

  const errors: string[] = [];

  if (
    domainStatement !==
    `${requestHost} wants you to sign in with your Ethereum account:`
  )
    errors.push("domain " + requestHost);
  if (statement !== `Sign in to ${requestHost} to get API Key`)
    errors.push("statement " + requestHost);
  if (getValue(version) !== "1") errors.push("version");
  if (getValue(chainId) !== CHAIN_ID) errors.push("chainId");
  if (new Date(getValue(issuedAt)).getTime() < Date.now() - 3 * 3600e3)
    errors.push("issuedAt");
  if (address !== verifyMessage(message, signature)) errors.push("signature");

  return [errors.length === 0, errors];
}

const handler = async (event: AWSLambda.APIGatewayEvent) => {
  const requestHost = event.headers.Origin!
  const {message, signature} = JSON.parse(event.body!)
  const address = message.split("\n")[1].toLowerCase()
    const subscribed = await isSubscribed(address)
  if (!subscribed) {
    return errorResponse({ message: "address is not subscribed" })
  }
  const [isVerified, errors] = verifySig(message, signature, requestHost);
  if (!isVerified) {
    return errorResponse({
      message: `bad signature, fields: ${errors.join(", ")}`,
    });
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